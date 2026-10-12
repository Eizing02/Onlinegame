import { Container, Sprite, Texture } from "pixi.js";
import { layerUrl } from "./registry";
import type { Profile } from "./geometry";
type Entry={texture:Texture;refs:number;bytes:number;touched:number;nativeWidth:number;nativeHeight:number};
const cache=new Map<string,Entry>(),pending=new Map<string,Promise<Entry>>();let decoders=0;const waiters:(()=>void)[]=[];
async function acquire(url:string,quality:"full"|"low"){
 const key=`${quality}:${url}`;
 let entry=cache.get(key);if(!entry){let task=pending.get(key);if(!task){task=(async()=>{if(decoders>=2)await new Promise<void>(r=>waiters.push(r));decoders++;try{const image=new Image();image.decoding='async';image.src=url;await image.decode();let source:HTMLImageElement|HTMLCanvasElement=image;const ratio=quality==='low'?Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight)):1,canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);const context=canvas.getContext('2d');if(context){
 // Bake the theme effect into the existing bounded texture cache, once per decode.
 // The original image and native camera/alpha geometry are unchanged; no camera-dependent render cache.
 if('filter' in context)context.filter=decodeURIComponent(url).includes('fight')?'grayscale(1) sepia(.42) brightness(1.12)':'grayscale(1) sepia(.12) hue-rotate(155deg) saturate(.65) brightness(1.14)';context.drawImage(image,0,0,canvas.width,canvas.height);source=canvas;}
 const texture=Texture.from(source),e={texture,refs:0,bytes:texture.width*texture.height*4,touched:performance.now(),nativeWidth:image.naturalWidth,nativeHeight:image.naturalHeight};cache.set(key,e);return e;}finally{decoders--;waiters.shift()?.();}})();pending.set(key,task);}try{entry=await task;}finally{pending.delete(key);}}
 entry.refs++;entry.touched=performance.now();trim();let released=false;return {texture:entry.texture,nativeWidth:entry.nativeWidth,nativeHeight:entry.nativeHeight,release:()=>{if(released)return;released=true;entry.refs--;trim();}};
}
function trim(){let bytes=[...cache.values()].reduce((n,e)=>n+e.bytes,0);for(const [url,e]of [...cache].sort((a,b)=>a[1].touched-b[1].touched)){if(bytes<=24*1024**2&&cache.size<=3)break;if(!e.refs&&!pending.has(url)){cache.delete(url);bytes-=e.bytes;e.texture.destroy(true);}}}
export class SceneLayers {
 readonly root=new Container();private sprites:Partial<Record<'far'|'mid'|'fight',Sprite>>={};private leases:(()=>void)[]=[];private generation=0;private disposed=false;
 private scales:Partial<Record<'far'|'mid'|'fight',{x:number;y:number}>>={};
 constructor(private quality:"full"|"low"="full"){}
 warnings:string[]=[];
 cancelPending(){this.generation++;}
 align(profile:Profile){for(const layer of ['far','mid','fight'] as const){const sprite=this.sprites[layer];if(!sprite)continue;const a=profile.layerAlignment[layer],scale=this.scales[layer]??{x:1,y:1};sprite.scale.set(a.scale*scale.x,a.scale*scale.y);sprite.position.set(a.offsetU*profile.imageWidth,a.offsetV*profile.imageHeight);}}
 async load(sceneId:string,profile:Profile){
  const generation=++this.generation;const acquired=await Promise.allSettled((['far','mid','fight'] as const).map(async layer=>({layer,lease:await acquire(layerUrl(sceneId,profile.images[layer]),this.quality)})));
  if(this.disposed||generation!==this.generation){for(const r of acquired)if(r.status==='fulfilled')r.value.lease.release();return false;}
  this.clear();const missing:string[]=[];this.warnings=[];
  for(let i=0;i<acquired.length;i++){const result=acquired[i];if(result.status==='rejected'){missing.push(['far','mid','fight'][i]);continue;}const {layer,lease}=result.value;const sprite=new Sprite(lease.texture),align=profile.layerAlignment[layer];this.scales[layer]={x:lease.nativeWidth/lease.texture.width,y:lease.nativeHeight/lease.texture.height};sprite.scale.set(align.scale*this.scales[layer]!.x,align.scale*this.scales[layer]!.y);sprite.position.set(align.offsetU*profile.imageWidth,align.offsetV*profile.imageHeight);this.sprites[layer]=sprite;this.root.addChild(sprite);this.leases.push(lease.release);}
  if(missing.includes('fight')){this.clear();throw new Error('ไม่พบภาพพื้นลาน ใช้สนามสำรอง การตอบคำถามยังทำงานได้');}
  this.warnings=missing;if(missing.length)console.warn('Raid scene optional layers unavailable',missing);
  return true;
 }
 parallax(time:number,width:number,reduced:boolean,low:boolean,profile:Profile){for(const layer of ['far','mid'] as const){const sprite=this.sprites[layer];if(!sprite)continue;const base=profile.layerAlignment[layer];const amount=reduced||low?0:Math.sin(time/8000)*width*(layer==='far'?.001:.003);sprite.x=base.offsetU*profile.imageWidth+amount;}}
 private clear(){this.root.removeChildren().forEach(s=>s.destroy());this.sprites={};this.scales={};this.leases.splice(0).forEach(r=>r());}
 destroy(){this.disposed=true;this.generation++;this.clear();this.root.destroy();trim();}
 static metrics(){return {decodedBytes:[...cache.values()].reduce((n,e)=>n+e.bytes,0),sheets:cache.size,activeReferences:[...cache.values()].reduce((n,e)=>n+e.refs,0)};}
}
