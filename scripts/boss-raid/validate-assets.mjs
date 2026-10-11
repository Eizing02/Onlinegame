import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assetFiles } from './asset-files.mjs';
const files=[]; let failures=0;
for(const asset of assetFiles()) {
  const filename=path.join('public/assets/boss-raid',asset.folder,asset.file);
  try {
    const metadata=await sharp(filename).metadata();
    const {data,info}=await sharp(filename).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const valid=metadata.format==='png'&&info.width%4===0&&info.height%4===0;
    const fw=info.width/4,fh=info.height/4; const frames=[]; const warnings=[];
    if(!valid) throw new Error('PNG dimensions must divide into an exact 4x4 grid');
    let transparent=0,opaqueBlack=0;
    for(let i=0;i<16;i++) {
      let left=fw,top=fh,right=-1,bottom=-1,visible=0;
      for(let y=0;y<fh;y++)for(let x=0;x<fw;x++) {
        const offset=(((Math.floor(i/4)*fh+y)*info.width)+(i%4*fw+x))*4;
        const alpha=data[offset+3];
        if(alpha<10)transparent++;
        if(alpha>240&&data[offset]<5&&data[offset+1]<5&&data[offset+2]<5)opaqueBlack++;
        if(alpha>32){visible++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      if(!visible)throw new Error(`Empty frame ${i}`);
      const edgeTouch=left===0||top===0||right===fw-1||bottom===fh-1;
      if(edgeTouch)warnings.push(`Frame ${i}: silhouette touches a cell edge; inspect weapon/wing cropping.`);
      frames.push({index:i,bounds:{left,top,right,bottom},edgeTouch,visiblePixels:visible});
    }
    if(!metadata.hasAlpha||transparent===0)throw new Error('No actual transparent pixels; opaque background needs author review');
    if(opaqueBlack/(info.width*info.height)>0.15)warnings.push('Many opaque black pixels: review whether background is baked in.');
    files.push({key:asset.key,path:`/assets/boss-raid/${asset.folder}/${asset.file}`,width:info.width,height:info.height,frameWidth:fw,frameHeight:fh,frameCount:16,decodedBytes:info.width*info.height*4,transparentPixels:transparent,opaqueBlackPixels:opaqueBlack,warnings,frames,status:'PASS'});
  }catch(error){failures++;files.push({key:asset.key,status:'FAIL',error:String(error)});}
}
const report={sheets:files.length,frames:files.filter(f=>f.status==='PASS').length*16,failures,decodedBytes:files.reduce((n,f)=>n+(f.decodedBytes??0),0),files};
await mkdir('docs/boss-raid',{recursive:true});
await writeFile('docs/boss-raid/asset-validation.json',JSON.stringify(report,null,2)+'\n');
await mkdir('public/assets/boss-raid',{recursive:true});
await writeFile('public/assets/boss-raid/readiness.json',JSON.stringify({ready:failures===0,sheets:files.length,files:files.map(({key,width,height,status})=>({key,width,height,status}))},null,2)+'\n');
console.log(`${files.length} sheets, ${report.frames} nonempty transparent frames; ${failures} failures; ${(report.decodedBytes/1024**2).toFixed(1)} MiB if all decoded (never preload all).`);
console.log(`${files.reduce((n,f)=>n+(f.warnings?.length??0),0)} cell-edge/black-pixel warnings recorded for visual review.`);
if(failures)process.exitCode=1;
