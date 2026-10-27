// Native generators do not always honor equal cells. Recover the sixteen actual
// painted silhouettes before packing. Native RGB/alpha values are kept together;
// no chroma key, invented poses, or per-frame body enlargement is used.
import sharp from 'sharp';
export async function packGeneratedAtlas(source,cellSize=320,padding=16){
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const w=info.width,h=info.height,labels=new Int32Array(w*h),queue=new Int32Array(w*h),components=[];
 let label=0;
 for(let p=0;p<w*h;p++){
  if(labels[p]||data[p*4+3]<=32)continue;
  const c={id:++label,count:0,minX:w,minY:h,maxX:0,maxY:0,sumX:0,sumY:0};let head=0,tail=0;queue[tail++]=p;labels[p]=label;
  while(head<tail){
   const v=queue[head++],x=v%w,y=Math.floor(v/w);c.count++;c.sumX+=x;c.sumY+=y;c.minX=Math.min(c.minX,x);c.maxX=Math.max(c.maxX,x);c.minY=Math.min(c.minY,y);c.maxY=Math.max(c.maxY,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const i=ny*w+nx;
    if(!labels[i]&&data[i*4+3]>32){labels[i]=label;queue[tail++]=i;}
   }
  }components.push(c);
 }
 // A bow tip may touch the next row's boot. Split only such merged components
 // at the narrowest alpha bridge, rather than imposing the inaccurate grid.
 for(let attempt=0;attempt<16;attempt++){
  const large=components.filter(c=>c.count>=3000);if(large.length>=16)break;
  const heights=large.map(c=>c.maxY-c.minY+1).sort((a,b)=>a-b),widths=large.map(c=>c.maxX-c.minX+1).sort((a,b)=>a-b);
  const mh=heights[Math.floor(heights.length/2)],mw=widths[Math.floor(widths.length/2)];
  const merged=[...large].sort((a,b)=>Math.max((b.maxY-b.minY+1)/mh,(b.maxX-b.minX+1)/mw)-Math.max((a.maxY-a.minY+1)/mh,(a.maxX-a.minX+1)/mw))[0];
  const vertical=(merged.maxY-merged.minY+1)/mh>=(merged.maxX-merged.minX+1)/mw;
  const start=vertical?merged.minY:merged.minX,end=vertical?merged.maxY:merged.maxX,mid=(start+end)/2,radius=(vertical?mh:mw)*.12;
  let cut=Math.round(mid),fewest=Infinity;
  for(let at=Math.ceil(mid-radius);at<=Math.floor(mid+radius);at++){let count=0;
   for(let cross=vertical?merged.minX:merged.minY;cross<=(vertical?merged.maxX:merged.maxY);cross++){const p=vertical?at*w+cross:cross*w+at;if(labels[p]===merged.id)count++;}
   const score=count+Math.abs(at-mid)*.001;if(score<fewest){fewest=score;cut=at;}
  }
  const parts=[merged.id,++label].map(id=>({id,count:0,minX:w,minY:h,maxX:0,maxY:0,sumX:0,sumY:0}));
  for(let y=merged.minY;y<=merged.maxY;y++)for(let x=merged.minX;x<=merged.maxX;x++){const p=y*w+x;if(labels[p]!==merged.id)continue;const c=parts[(vertical?y:x)>=cut?1:0];labels[p]=c.id;c.count++;c.sumX+=x;c.sumY+=y;c.minX=Math.min(c.minX,x);c.maxX=Math.max(c.maxX,x);c.minY=Math.min(c.minY,y);c.maxY=Math.max(c.maxY,y);}
  if(parts.some(c=>c.count<3000))throw new Error(`${source}: ambiguous touching silhouettes need artist review`);
  components.splice(components.indexOf(merged),1,...parts);
 }
 const main=[...components].sort((a,b)=>b.count-a.count).slice(0,16).sort((a,b)=>a.minY-b.minY);
 if(main.length!==16||main.some(c=>c.count<3000))throw new Error(`${source}: sixteen complete silhouettes required`);
 const ordered=[];for(let row=0;row<4;row++)ordered.push(...main.slice(row*4,row*4+4).sort((a,b)=>a.sumX/a.count-b.sumX/b.count));
 const owner=new Int16Array(label+1).fill(-1),bounds=ordered.map(()=>({minX:w,minY:h,maxX:0,maxY:0}));
 ordered.forEach((c,i)=>{owner[c.id]=i;});
 const nearest=(x,y)=>{let best=0,distance=Infinity;ordered.forEach((c,i)=>{const dx=Math.max(c.minX-x,0,x-c.maxX),dy=Math.max(c.minY-y,0,y-c.maxY),center=Math.hypot(x-c.sumX/c.count,y-c.sumY/c.count);const score=dx*dx+dy*dy+center*.02;if(score<distance){distance=score;best=i;}});return best;};
 for(const c of components)if(owner[c.id]<0)owner[c.id]=nearest(c.sumX/c.count,c.sumY/c.count);
 const pixelOwner=new Int16Array(w*h).fill(-1);
 for(let p=0;p<w*h;p++){
  if(data[p*4+3]===0)continue;const x=p%w,y=Math.floor(p/w);let assigned=labels[p]?owner[labels[p]]:-1;
  // Preserve sub-threshold antialias paint with its adjacent silhouette first.
  if(assigned<0)for(let radius=1;radius<=2&&assigned<0;radius++)for(let dy=-radius;dy<=radius&&assigned<0;dy++)for(let dx=-radius;dx<=radius;dx++){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const id=labels[ny*w+nx];if(id){assigned=owner[id];break;}
  }
  if(assigned<0)assigned=nearest(x,y);pixelOwner[p]=assigned;
  const b=bounds[assigned];b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);
 }
 const scale=Math.min(...bounds.map(b=>Math.min((cellSize-padding*2)/(b.maxX-b.minX+1),(cellSize-padding*2)/(b.maxY-b.minY+1))));
 const cells=[];
 for(let frame=0;frame<16;frame++){
  const b=bounds[frame],width=b.maxX-b.minX+1,height=b.maxY-b.minY+1,rgba=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y+b.minY)*w+x+b.minX;if(pixelOwner[p]===frame)data.copy(rgba,(y*width+x)*4,p*4,p*4+4);}
  const outW=Math.max(1,Math.round(width*scale)),outH=Math.max(1,Math.round(height*scale));
  const input=await sharp(rgba,{raw:{width,height,channels:4}}).resize(outW,outH).png().toBuffer();
  cells.push({input,left:frame%4*cellSize+Math.floor((cellSize-outW)/2),top:Math.floor(frame/4)*cellSize+cellSize-padding-outH});
 }
 const png=await sharp({create:{width:cellSize*4,height:cellSize*4,channels:4,background:'#00000000'}}).composite(cells).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
 return {png,frames:bounds.map((b,i)=>({frame:i,sourceBounds:b,bodyPixels:ordered[i].count})),scale};
}
