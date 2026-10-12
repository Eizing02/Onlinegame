// Offline silhouette analysis constrained to the visually inspected boot/body region.
import fs from 'node:fs/promises';import sharp from 'sharp';
const catalog=JSON.parse(await fs.readFile('src/features/boss-raid/assets/catalog.json','utf8'));const actors={};
for(const type of ['boss','warrior','mage','wizard','witch','fairy']){
 const clips=type==='boss'?Object.entries(catalog.bossClips):['idle','attack_1','attack_2','hit','victory','defeat'].map(c=>[c,c]);const entries={};
 for(const [clip,file] of clips){
  const p=`public/assets/boss-raid/${type==='boss'?'boss':`heroes/${type}`}/${file}.png`;const {data,info}=await sharp(p).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});const w=info.width/4,h=info.height/4;const frames=[];
  for(let frame=0;frame<16;frame++){
   const ox=frame%4*w,oy=Math.floor(frame/4)*h;let minX=w,minY=h,maxX=0,maxY=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>64){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
   // Central lower silhouette excludes outstretched spells, sword tips, wings and dragon tail.
   let groundY=minY;const left=Math.floor(w*(type==='boss'?.35:.26)),right=Math.floor(w*(type==='boss'?.74:.7));
   for(let y=Math.floor(minY+(maxY-minY)*.65);y<=maxY;y++){let count=0;for(let x=left;x<=right;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>100)count++;if(count>=Math.max(3,w*.012))groundY=y;}
   const xs=[];for(let y=Math.max(minY,groundY-Math.ceil(h*.04));y<=groundY;y++)for(let x=left;x<=right;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>100)xs.push(x);
   const footX=xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:w*.5;
   frames.push({footX:footX/w,footY:(groundY+1)/h,bounds:{minX,minY,maxX,maxY}});
  }
  const reference=frames[0];entries[clip]={frameWidth:w,frameHeight:h,baseVisualHeight:Math.max(1,reference.footY*h-reference.bounds.minY),frames};
 }
 actors[type]={facing:type==='boss'?'right':'left',hover:type==='fairy'?24:0,shadowScale:type==='boss'?1.9:1,reference:'Source contact sheets frames 0/7/15 visually inspected; constrained lower body alpha per frame, not global lowest effects pixel.',clips:entries};
}
await fs.writeFile('src/features/boss-raid/assets/visual-metadata.json',JSON.stringify(actors,null,2)+'\n');console.log('Grounding metadata for all 42 actual clips/672 frames generated; source sheets unchanged.');
