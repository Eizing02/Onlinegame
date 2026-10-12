import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]??'D:/sound effect');
const names={button:'Button Click',critical:'Critical Hit',defeat:'Defeat',claw:'Dragon Claw',death:'Dragon Death',fire:'Dragon Fire',roar:'Dragon Roar',ultimate:'Dragon Ultimate',fairy1:'Fairy — Light Bolt',fairy2:'Fairy — Starburst',heal:'Heal',mage1:'Mage — Arcane Bolt',mage2:'Mage — Frost Burst',hit:'Normal Hit',shake:'Screen Shake',shield:'Shield',spawn:'Spawn',victory:'Victory',warrior2:'Warrior — Shield Bash',warrior1:'Warrior — Sword Slash',witch1:'Witch — Poison Orb',witch2:'Witch — Shadow Curse',wizard1:'Wizard — Fireball',wizard2:'Wizard — Lightning',countdown:'Countdown'};
const inventory=await fs.readdir(root);if(new Set(inventory.map(n=>n.normalize('NFC').toLowerCase())).size!==inventory.length)throw new Error('Ambiguous Unicode/case audio filenames');
const destination='public/assets/boss-raid/audio';await fs.mkdir(`${destination}/fallback`,{recursive:true});await fs.mkdir(`${destination}/music`,{recursive:true});
let converter=true;try{execFileSync('ffmpeg',['-version'],{windowsHide:true,stdio:'pipe'});}catch{converter=false;}
const sounds={},audit=[];
for(const [id,stem] of Object.entries(names)){
 const filename=stem+'.opus';if(!inventory.includes(filename))throw new Error(`Missing exact SFX ${filename}`);
 const source=await fs.readFile(path.join(root,filename));if(source.toString('ascii',0,4)!=='OggS'||!source.includes(Buffer.from('OpusHead')))throw new Error(`Invalid Ogg Opus container ${filename}`);
 await fs.copyFile(path.join(root,filename),`${destination}/${filename}`);
 let metadata={};try{metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=format_name,duration:stream=codec_name,sample_rate,channels','-of','json',path.join(root,filename)],{windowsHide:true,encoding:'utf8'}));}catch{}
 const sources=[{url:`/assets/boss-raid/audio/${encodeURIComponent(filename)}`,mime:'audio/ogg; codecs=opus'}];
 if(converter){const fallback=stem+'.mp3';execFileSync('ffmpeg',['-v','error','-y','-i',path.join(root,filename),'-vn','-codec:a','libmp3lame','-b:a','128k',`${destination}/fallback/${fallback}`],{windowsHide:true,stdio:'pipe'});sources.push({url:`/assets/boss-raid/audio/fallback/${encodeURIComponent(fallback)}`,mime:'audio/mpeg'});}
 const family=['button'].includes(id)?'ui':['claw','fire','roar','ultimate','shield','shake'].includes(id)?'boss':['death','victory','defeat'].includes(id)?'result':['hit','heal','countdown','spawn'].includes(id)?'common':'hero';
 sounds[id]={filename,sources,family,gain:family==='ui'?.25:family==='boss'?.5:.45,priority:['death','victory','ultimate','defeat'].includes(id)?10:family==='ui'?1:5,dormant:['critical','spawn'].includes(id)};
 audit.push({id,filename,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex'),container:'ogg',codec:'opus',probe:metadata,fallback:converter?'mp3':'NONE (converter unavailable)',status:'READY',dormant:sounds[id].dormant});
}
const music={};for(const name of ['raid_lobby','raid_battle','raid_final_phase']){const filename=name+'.mp3';if(!inventory.includes(filename))throw new Error(`Approved music missing: ${filename}`);await fs.copyFile(path.join(root,filename),`${destination}/music/${filename}`);music[name]={url:`/assets/boss-raid/audio/music/${filename}`,mime:'audio/mpeg'};}
await fs.mkdir('src/features/boss-raid/audio',{recursive:true});await fs.writeFile('src/features/boss-raid/audio/registry.json',JSON.stringify({sounds,music},null,2)+'\n');
await fs.writeFile(destination+'/manifest.json',JSON.stringify({sounds,music},null,2)+'\n');
await fs.mkdir('docs/boss-raid/scene-audio',{recursive:true});await fs.writeFile('docs/boss-raid/scene-audio/audio-import.json',JSON.stringify({source:root,sfxCount:audit.length,audit,music,extraFiles:inventory.filter(f=>!audit.some(a=>a.filename===f)&&!Object.keys(music).some(m=>m+'.mp3'===f)),musicAuthorization:'User confirmed all three MP3 tracks in this task.',converter},null,2)+'\n');
console.log(`Imported ${audit.length} exact OPUS SFX, ${converter?25:0} derived MP3 fallbacks, and 3 approved BGM tracks.`);
