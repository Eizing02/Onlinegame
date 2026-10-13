import assert from 'node:assert/strict';
import { loadTs } from '../../scripts/boss-raid/load-ts.mjs';
let checks=0,destroyedTextures=0,fail=false,pending=false;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
class Node {
  children=[];x=0;y=0;alpha=1;destroyed=false;
  position={set:(x,y)=>{this.x=x;this.y=y;}};
  scale={x:1,y:1,set:(x,y=x)=>{this.scale.x=x;this.scale.y=y;}};
  anchor={set:()=>{}};
  addChild(child){this.children.push(child);return child;}
  destroy(){this.destroyed=true;for(const child of this.children)child.destroy();}
}
class Texture {constructor(options){this.options=options;}destroy(){destroyedTextures++;}}
class ImageSource {constructor(options){this.options=options;}}
class Sprite extends Node {constructor(texture){super();this.texture=texture;}}
class Text extends Node {constructor(options){super();this.options=options;}}
class Image {
  complete=false;naturalWidth=0;
  set src(value){if(!value){this.complete=true;this.naturalWidth=0;return;}if(pending)return;queueMicrotask(()=>{this.complete=true;this.naturalWidth=fail?0:384;(fail?this.onerror:this.onload)?.();});}
}
const {CombatFeedback,feedbackAmount,bossEffect,HERO_EFFECTS}=loadTs('src/features/boss-raid/engine/combat-feedback.ts',{Image},{'pixi.js':{Container:Node,Texture,ImageSource,Sprite,Text}});
const event={seq:1,type:'hero_attack',damage:60,damageTaken:null,heal:0};
eq(feedbackAmount(event),60);eq(feedbackAmount({...event,type:'hero_hit'}),null);
eq(feedbackAmount({...event,type:'hero_hit',damageTaken:8}),8);
eq(feedbackAmount({...event,type:'heal',heal:5}),5);
for(const type of ['boss_defeated','raid_ended','boss_phase'])eq(feedbackAmount({...event,type}),null);
for(const damage of [0,-1,NaN,Infinity])eq(feedbackAmount({...event,damage}),null);
eq(bossEffect('breath'),'dragon-flame');eq(bossEffect('ultimate'),'dragon-ultimate');eq(bossEffect('attack_1'),'dragon-claw');
eq(new Set(Object.values(HERO_EFFECTS)).size,5);
const root=new Node(),feedback=new CombatFeedback(root,()=>.5,'Noto Sans Thai',false,true);
await feedback.preload(['warrior','mage','wizard','witch','fairy','mage']);eq(feedback.metrics().textures,9);
const anchor=()=>({x:300,y:200,height:160});
feedback.impact(event,'boss','warrior-slash',anchor);eq(feedback.metrics().active,2);
feedback.impact(event,'boss','warrior-slash',anchor);eq(feedback.metrics().active,2);eq(feedback.metrics().shown.length,1);
const number=root.children[1],startY=number.y;feedback.tick(110);eq(number.scale.x>1,true);eq(number.y<startY,true);feedback.tick(700);eq(number.alpha<1,true);feedback.tick(300);eq(feedback.metrics().active,0);
feedback.impact({...event,seq:2,type:'hero_hit',damageTaken:null},'pupil','dragon-claw',anchor);eq(feedback.metrics().active,1);eq(feedback.metrics().shown.at(-1).amount,null);
feedback.clear();eq(feedback.metrics().active,0);
for(let seq=3;seq<63;seq++)feedback.impact({...event,seq},'boss','mage-energy',anchor);
eq(feedback.metrics().active,48);eq(feedback.metrics().shown.length,32);
feedback.destroy();eq(destroyedTextures,9);eq(feedback.metrics().textures,0);eq(feedback.metrics().active,0);
feedback.impact({...event,seq:64},'boss','mage-energy',anchor);eq(feedback.metrics().active,0);
fail=true;const fallback=new CombatFeedback(new Node(),()=>1,'sans-serif',false,true);await fallback.preload(['mage']);eq(fallback.metrics().textures,0);fallback.impact(event,'boss','mage-energy',anchor);eq(fallback.metrics().active,1);fallback.destroy();
pending=true;const waiting=new CombatFeedback(new Node(),()=>1,'sans-serif',false,true);const loading=waiting.preload(['witch']);waiting.destroy();await loading;eq(waiting.metrics().textures,0);
console.log(`Combat feedback: ${checks} checks PASS (values, bounce/fade, dedup, bounded nodes, actual assets, failures, pending-load cancellation, owned texture disposal).`);
