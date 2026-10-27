// Evidence from actual runtime atlas pixels; this never authors replacement artwork.
import fs from 'node:fs/promises';import sharp from 'sharp';
import catalog from '../../src/features/boss-raid/assets/catalog.json' with {type:'json'};
const dir='.impeccable/review/raid-boss-roster';await fs.mkdir(dir,{recursive:true});
for(const boss of ['stone_titan','crystal_scorpion']){
 for(const [group,clips]of Object.entries({stance:['idle','ready','attack_1','attack_2','dodge','hit'],battle:['death','run','breath','shield','ultimate','victory_roar']})){
  const cells=[];for(let row=0;row<clips.length;row++)for(const[col,frame]of [0,7,15].entries()){
   const input=await sharp(`public/assets/boss-raid/${catalog.bosses[boss].folder}/${catalog.bossClips[clips[row]]}.png`).extract({left:frame%4*384,top:Math.floor(frame/4)*384,width:384,height:384}).resize(160,160).png().toBuffer();
   cells.push({input,left:col*160,top:row*160});
  }
  await sharp({create:{width:480,height:960,channels:4,background:'#f5efe1'}}).composite(cells).png().toFile(`${dir}/${boss}-${group}-frames.png`);
 }
}
console.log('Four contacts: stance = idle/ready/attack_1/attack_2/dodge/hit; battle = death/run/breath/shield/ultimate/victory_roar. Columns actual frames 0/7/15.');
