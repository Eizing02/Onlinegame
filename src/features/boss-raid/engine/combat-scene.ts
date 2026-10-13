import { GAME_PALETTE } from "@/lib/theme/palette";
import { Application, AnimatedSprite, Container, Graphics, Sprite, Texture, type Ticker } from "pixi.js";
import { CombatFeedback, HERO_EFFECTS, bossEffect, type EffectId } from "./combat-feedback";
import { SpriteLoader } from "../assets/sprite-loader";
import type { BossClip, HeroClip, HeroType } from "../assets/manifest";
import visualData from "../assets/visual-metadata.json";
import type { RaidEvent, RaidHero, RaidPresentation } from "../types";
import { AttackEventQueue } from "./attack-event-queue";
import { ScreenEffectManager } from "./screen-effects";
import { SceneLayers } from "../scenes/scene-layers";
import { sceneById } from "../scenes/registry";
import { assignHeroSlots, cameraFit, depthScale, insidePolygon, placementWarnings, profileForStage, project, type Camera, type Profile, type SceneDefinition, type UV } from "../scenes/geometry";
import { heroSound, bossSound, type CueSink, type SoundId } from "../audio/cues";

type FrameVisual={footX:number;footY:number;bounds:{minX:number;minY:number;maxX:number;maxY:number}};
type ClipVisual={frameWidth:number;frameHeight:number;baseVisualHeight:number;frames:FrameVisual[]};
type Visual={facing:"left"|"right";hover:number;shadowScale:number;clips:Record<string,ClipVisual>};
const visual=visualData as unknown as Record<"boss"|HeroType,Visual>;
type Actor={sprite:AnimatedSprite;shadow:Graphics;type:"boss"|HeroType;foot:UV;homeX:number;homeY:number;height:number;scale:number;generation:number;hp:number;slot:number;clip:string;release?:()=>void;movement?:number;offsetX:number;offsetY:number;complete?:()=>void};
export type Placement={profile:"wide"|"phone";camera:Camera;polygon:UV[];fallback:boolean;actors:{id:string;type:string;foot:UV;x:number;y:number;grounded:boolean;clip:string;frame:number;scale:number;anchorScreen:{x:number;y:number};shadowScreen:{x:number;y:number}}[]};
export type SceneOptions={sceneId?:string;compactViewport?:boolean;definition?:SceneDefinition;profile?:"wide"|"phone";allowUnreviewed?:boolean;zoom?:number;pan?:{x:number;y:number};footOffsets?:Record<string,{x:number;y:number}>;onPlacement?:(placement:Placement)=>void;debug?:boolean};

export class CombatScene {
 private app=new Application();private loader=new SpriteLoader();private layers:SceneLayers;private cameraRoot=new Container();private shadows=new Container();private actorLayer=new Container();private vfx=new Container();private actors=new Map<string,Actor>();private queue=new AttackEventQueue();private effects:ScreenEffectManager;private feedback:CombatFeedback;
 private observer?:ResizeObserver;private disposed=false;private elapsed=0;private time=0;private bossDead=false;private lastUltimateAt=-Infinity;private resizeFrame=0;private profileGeneration=0;private highestSeq=0;private profileName:"wide"|"phone"="wide";private profile:Profile|null=null;private camera:Camera={scale:1,x:0,y:0,imageWidth:1,imageHeight:1};private definition?:SceneDefinition;private options:SceneOptions;private onCue:CueSink=()=>{};
 private particles:{graphic:Graphics|Sprite;from:Actor;to:Actor;remaining:number;impact?:()=>void}[]=[];private sparks:{graphic:Graphics;vx:number;vy:number;remaining:number}[]=[];
 private loadedKey='';
 private frameTimes:number[]=[];
 private captureNext=false;private captureTimer:ReturnType<typeof setTimeout>|null=null;
 private knockedOut=new Set<string>();
 private bossStrike:{animation:BossClip;frame:number|null;impacts:((frame:number)=>void)[]}|null=null;
 private answerActive=false;private answerId='';private answerTask:Promise<void>=Promise.resolve();private realTick=performance.now();
 constructor(private host:HTMLElement,private reduced:boolean,private quality:"full"|"low",private onError:(message:string)=>void,private effectsEnabled=true,options:SceneOptions={},onCue:CueSink=()=>{}){
  this.options=options;this.layers=new SceneLayers(quality);this.definition=options.definition??sceneById(options.sceneId);this.onCue=onCue;this.effects=new ScreenEffectManager(host,reduced,effectsEnabled);this.actorLayer.sortableChildren=true;this.feedback=new CombatFeedback(this.vfx,()=>this.camera.scale,getComputedStyle(host).fontFamily,reduced,effectsEnabled);
 }
 setCueSink(sink:CueSink){this.onCue=sink;}
 configure(options:SceneOptions={}){this.options=options;this.definition=options.definition??sceneById(options.sceneId);if(this.app.renderer){void this.selectProfile();this.resize();}}
 async init(heroes:RaidHero[],bossHp:number){
  await this.app.init({width:Math.max(1,this.host.clientWidth),height:Math.max(1,this.host.clientHeight),backgroundAlpha:0,antialias:false,resolution:Math.min(devicePixelRatio,this.quality==='low'?1:1.5),autoDensity:true,preference:'webgl',powerPreference:'low-power'});
  if(this.disposed){this.app.destroy(true,{children:true});return;}
  this.app.canvas.setAttribute('aria-hidden','true');this.host.prepend(this.app.canvas);this.app.stage.addChild(this.cameraRoot);this.cameraRoot.addChild(this.layers.root,this.shadows,this.actorLayer,this.vfx);this.app.ticker.maxFPS=this.quality==='low'?30:60;
  this.addActor('boss','boss',bossHp,0);const slots=assignHeroSlots(heroes.filter(h=>h.eligible&&h.heroType));
  for(const h of heroes)if(h.eligible&&h.heroType){this.addActor(h.id,h.heroType,h.hp,slots.get(h.id)??0);if(h.hp===0)this.knockedOut.add(h.id);}
  void this.feedback.preload(heroes.flatMap(h=>h.heroType?[h.heroType]:[]));
  await this.selectProfile();this.resize();
  await Promise.all([...this.actors].map(([id,a])=>this.clip(id,a.hp===0?id==='boss'?'death':'defeat':'idle',a.hp===0)));
  this.bossDead=bossHp===0;this.observer=new ResizeObserver(()=>{cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>{this.resize();void this.selectProfile();});});this.observer.observe(this.host);const roster=this.host.parentElement?.querySelector(".raid-hero-hud");if(roster)this.observer.observe(roster);
  this.app.ticker.add(this.tick);document.addEventListener('visibilitychange',this.visibility);this.visibility();this.publishPlacement();
 }
 private cameraHeight(){const roster=this.host.parentElement?.querySelector<HTMLElement>(".raid-hero-hud");return Math.max(1,this.host.clientHeight-(roster?roster.offsetHeight+20:0));}
 private async selectProfile(){
  const requested=this.options.profile??profileForStage(this.host.clientWidth,this.cameraHeight(),this.definition?.profiles);
  const key=this.definition?`${this.definition.sceneId}:${requested}:${JSON.stringify(this.definition.profiles[requested].images)}`:'';
  if(this.profile&&this.definition&&key===this.loadedKey){this.profileGeneration++;this.layers.cancelPending();const fresh=this.definition.profiles[requested];if(placementWarnings(fresh).length===0){this.profile=fresh;this.layers.align(fresh);this.resize();}return;}
  const profile=this.definition?.profiles[requested];if(!profile||placementWarnings(profile).length||!profile.calibration.reviewed&&!this.options.allowUnreviewed){this.onError('ฉากยังไม่พร้อมหรือยังไม่ตรวจจุดยืน ใช้สนามสำรองและตอบคำถามต่อได้');return;}
  const token=++this.profileGeneration;
  try{const loaded=await this.layers.load(this.definition!.sceneId,profile);if(!loaded||this.disposed||token!==this.profileGeneration)return;this.profile=profile;this.profileName=requested;this.loadedKey=key;this.host.dataset.sceneProfile=requested;this.host.dataset.sceneId=this.definition!.sceneId;if(this.layers.warnings.length)this.onError('ชั้นฉากบางส่วนโหลดไม่ได้ พื้นลานและการตอบคำถามยังใช้งานได้');this.resize();}
  catch(e){if(!this.disposed&&token===this.profileGeneration){this.profile=null;this.loadedKey='';this.onError(e instanceof Error?e.message:'โหลดฉากไม่สำเร็จ ใช้สนามสำรอง');this.resize();if(requested==='phone'&&this.definition?.profiles.wide.calibration.reviewed){try{const wide=this.definition.profiles.wide;if(await this.layers.load(this.definition.sceneId,wide)){this.profile=wide;this.profileName='wide';this.loadedKey=`${this.definition.sceneId}:wide:${JSON.stringify(wide.images)}`;this.host.dataset.sceneProfile='wide';this.onError('ภาพ Phone ไม่พร้อม ใช้ Wide ตามสัดส่วนชั่วคราว');this.resize();}}catch{/* Flat fallback stays usable. */}}}}
 }
 private addActor(id:string,type:"boss"|HeroType,hp:number,slot:number){const sprite=new AnimatedSprite([Texture.EMPTY]);sprite.autoUpdate=false;const shadow=new Graphics();this.shadows.addChild(shadow);this.actorLayer.addChild(sprite);this.actors.set(id,{sprite,shadow,type,hp,slot,foot:{u:0,v:0},homeX:0,homeY:0,height:1,scale:1,generation:0,clip:'idle',offsetX:0,offsetY:0});}
 async clip(id:string,animation:BossClip|HeroClip,settle=false,impact?:(frame:number)=>void,start?:()=>void){
  const actor=this.actors.get(id);if(!actor||this.disposed)return;const generation=++actor.generation;actor.complete?.();actor.complete=undefined;actor.sprite.stop();actor.sprite.onComplete=undefined;actor.sprite.onFrameChange=undefined;
  try{const lease=await this.loader.acquire(actor.type,animation);if(this.disposed||generation!==actor.generation){lease.release();return;}actor.sprite.stop();actor.release?.();actor.release=lease.release;actor.clip=animation;actor.sprite.textures=lease.frames;actor.sprite.animationSpeed=lease.config.fps/60;actor.sprite.loop=lease.config.loop;let impacted=false;let done:()=>void=()=>{};const finished=new Promise<void>(resolve=>{done=resolve;});actor.complete=done;
   actor.sprite.onFrameChange=frame=>{this.groundFrame(actor,frame);if(!impacted&&frame>=lease.config.impactFrame){impacted=true;impact?.(frame);}};
   this.layoutActor(id,actor);actor.sprite.onComplete=()=>{done();actor.complete=undefined;if(!lease.config.holdLast&&!this.disposed&&generation===actor.generation)void this.clip(id,actor.hp===0?id==='boss'?'death':'defeat':'idle');};
   start?.();if(settle||this.reduced){actor.sprite.gotoAndStop(settle?15:0);this.groundFrame(actor,settle?15:0);if(!impacted)impact?.(settle?15:0);done();}else actor.sprite.gotoAndPlay(0);this.publishPlacement();if(!lease.config.loop)await finished;
  }catch(error){if(!this.disposed){console.warn('Raid sprite unavailable',animation,error);this.onError('โหลดภาพตัวละครไม่สำเร็จ การตอบคำถามและ HP ยังใช้งานได้');}}
 }
 private groundFrame(actor:Actor,frame:number){const clip=visual[actor.type].clips[actor.clip],data=clip?.frames[frame];if(!data)return;const override=this.options.footOffsets?.[actor.type]??this.definition?.visualFootOffsets?.[actor.type];actor.sprite.anchor.set(data.footX+(override?.x??0),data.footY+(override?.y??0));const hover=actor.type==='fairy'&&actor.hp>0?visual.fairy.hover:0;actor.sprite.position.set(actor.homeX+actor.offsetX,actor.homeY+actor.offsetY-hover);actor.sprite.zIndex=actor.homeY+actor.offsetY;actor.shadow.position.set(actor.homeX+actor.offsetX,actor.homeY+actor.offsetY);}
 update(heroes:RaidHero[],bossHp:number,events:RaidEvent[]){
  if(this.disposed)return;this.highestSeq=Math.max(this.highestSeq,...events.map(e=>e.seq),0);
  for(const h of heroes){const a=this.actors.get(h.id);if(!a)continue;const old=a.hp;a.hp=h.hp;if(!this.answerActive&&old===0&&h.hp>0){this.knockedOut.delete(h.id);void this.clip(h.id,'idle');}if(!this.answerActive&&old>0&&h.hp===0){if(!events.some(e=>e.type==='hero_hit'&&e.targetId===h.id&&e.heroHp===0))this.knockedOut.add(h.id);void this.clip(h.id,'defeat');}a.sprite.tint=h.hp===0?0x888888:0xffffff;}
  const boss=this.actors.get('boss');if(boss)boss.hp=bossHp;
  if(!this.answerActive&&bossHp===0&&!this.bossDead&&!events.some(e=>e.type==='boss_defeated')){this.bossDead=true;void this.clip('boss','death',true);for(const[id,a]of this.actors)if(id!=='boss'&&a.hp>0)void this.clip(id,'victory',true);}
  if(document.hidden)this.queue.reset(this.highestSeq);else this.queue.push(events);
 }
 private cue(event:RaidEvent,sound:SoundId,id:string,animation:string,frame:number,delayMs=0){const a=this.actors.get(id);this.onCue({sound,seq:event.seq,cueId:`${id}:${sound}`,pan:this.profile&&this.host.clientWidth>=600&&this.effectsEnabled?(a?.foot.u??.5)-.5:0,animation,frame,delayMs});}
 private bossAttackClip(event:RaidEvent):BossClip{const ultimate=!this.bossDead&&event.phase>=3&&performance.now()-this.lastUltimateAt>=4000;if(ultimate)this.lastUltimateAt=performance.now();return ultimate?'ultimate':event.phase>=3?'attack_2':event.phase===2?event.seq%2?'breath':'attack_2':'attack_1';}
 private present(event:RaidEvent){
  if(event.type==='boss_defeated'&&!this.bossDead){this.bossDead=true;void this.clip('boss','death',false,undefined,()=>this.cue(event,'death','boss','death',0));this.effects.play('victory');this.fireworks();let first=true;for(const[id,a]of this.actors)if(id!=='boss'&&a.hp>0){const play=first;first=false;void this.clip(id,'victory',false,undefined,play?()=>this.cue(event,'victory','boss','victory',0,200):undefined);}}
  else if(event.type==='hero_attack'&&event.actorId){const a=this.actors.get(event.actorId);if(!a)return;const animation=event.seq%2?'attack_1':'attack_2';void this.clip(event.actorId,animation,false,(frame)=>{const sound=heroSound(a.type as HeroType,animation);if(sound)this.cue(event,sound,event.actorId!,animation,frame);const impact=()=>{if(this.disposed||this.answerActive)return;if(event.damage>0){this.impactFeedback(event,'boss',HERO_EFFECTS[a.type as HeroType]);this.cue(event,'hit','boss',animation,7);if(!this.bossDead&&!this.bossStrike)void this.clip('boss','hit');this.effects.play('white');}};if(a.type==='warrior')impact();else this.projectile(a,this.actors.get('boss'),GAME_PALETTE.mist,impact,HERO_EFFECTS[a.type as HeroType]);});if(a.type==='warrior'&&!this.reduced)a.movement=0;}
  else if(event.type==='hero_hit'){
   const animation=this.bossStrike?.animation??this.bossAttackClip(event),ultimate=animation==='ultimate';
   const impact=(frame:number)=>{if(this.disposed||this.answerActive)return;const sound=bossSound(animation);if(sound)this.cue(event,sound,'boss',animation,frame);
    const hit=()=>{if(this.disposed||this.answerActive)return;if(event.targetId){const a=this.actors.get(event.targetId);if(a){this.impactFeedback(event,event.targetId,bossEffect(animation));void this.clip(event.targetId,event.heroHp===0?'defeat':'hit');if(event.heroHp===0){if(!this.knockedOut.has(event.targetId))this.cue(event,'defeat',event.targetId,animation,frame);this.knockedOut.add(event.targetId);}else this.cue(event,'hit',event.targetId,animation,frame);}}
     this.effects.play('red');if(event.phase>=2){this.effects.play('shake');if(!this.reduced&&this.effectsEnabled)this.cue(event,'shake','boss',animation,frame);}if(ultimate||animation==='breath')this.effects.play('dark');if(ultimate){this.effects.play('slow');this.effects.play('white');}};
    const from=this.actors.get('boss'),to=event.targetId?this.actors.get(event.targetId):undefined;
    if(from&&to&&(ultimate||animation==='breath'))this.projectile(from,to,GAME_PALETTE.wine,hit,'dragon-flame');else hit();
   };
   if(!this.bossDead)this.playBossStrike(animation,impact);
  }else if(event.type==='heal'&&event.actorId&&event.targetId&&event.heal>0){const a=this.actors.get(event.actorId),target=this.actors.get(event.targetId);this.knockedOut.delete(event.targetId);if(a&&target)this.projectile(a,target,GAME_PALETTE.mist,()=>{if(this.disposed||this.answerActive)return;this.impactFeedback(event,event.targetId!,'healing-light');this.cue(event,'heal',event.targetId!,'heal',0);},'healing-light');}
  else if(event.type==='boss_phase'&&!this.bossDead){const animation=event.phase===2?'shield':'ready';if(!this.bossStrike)void this.clip('boss',animation,false,(frame)=>{if(animation==='shield')this.cue(event,'shield','boss',animation,frame);this.effects.play('dark');});}
  else if(event.type==='raid_ended'&&!this.bossDead)void this.clip('boss','victory_roar',false,undefined,()=>this.cue(event,'roar','boss','victory_roar',0));
 }

 private playBossStrike(animation:BossClip,impact:(frame:number)=>void){
  if(this.bossStrike){if(this.bossStrike.frame===null)this.bossStrike.impacts.push(impact);else impact(this.bossStrike.frame);return;}
  const strike={animation,frame:null as number|null,impacts:[impact]};this.bossStrike=strike;
  const flush=(frame:number)=>{if(this.disposed||this.answerActive||this.bossStrike!==strike)return;strike.frame=frame;strike.impacts.splice(0).forEach(hit=>hit(frame));};
  void this.clip('boss',animation,false,flush).then(()=>{if(this.bossStrike!==strike)return;if(strike.frame===null)flush(this.actors.get('boss')?.sprite.currentFrame??0);this.bossStrike=null;});
 }

 /** Priority presentation for one acknowledged answer. Party events cannot replace its clips. */
 presentAnswer(presentation:RaidPresentation):Promise<void>{
  if(this.disposed)return Promise.resolve();if(this.answerActive&&this.answerId===presentation.id)return this.answerTask;
  this.bossStrike=null;this.answerActive=true;this.answerId=presentation.id;this.host.dataset.answerPlaying='true';this.host.dataset.answerCompleted='false';const valid=()=>!this.disposed&&this.answerActive&&this.answerId===presentation.id;this.highestSeq=Math.max(this.highestSeq,...presentation.events.map(e=>e.seq),0);this.queue.reset(this.highestSeq);
  const primary=presentation.events.find(e=>['hero_attack','hero_hit','heal'].includes(e.type)),death=presentation.events.find(e=>e.type==='boss_defeated');
  if(presentation.events.some(e=>e.type==='boss_phase'))this.effects.play('dark');
  this.answerTask=(async()=>{
   if(primary?.type==='hero_attack'&&primary.actorId){
    const a=this.actors.get(primary.actorId);if(!a)return;const animation=primary.seq%2?'attack_1':'attack_2';let impactTask:Promise<void>=Promise.resolve();let releaseImpact:()=>void=()=>{};
    const impactFinished=new Promise<void>(resolve=>{releaseImpact=resolve;});
    const impact=()=>{if(!valid()){releaseImpact();return;}if(primary.damage>0)this.impactFeedback(primary,'boss',HERO_EFFECTS[a.type as HeroType]);if(death){this.bossDead=true;impactTask=this.clip('boss','death',false,undefined,()=>this.cue(death,'death','boss','death',0));this.effects.play('victory');this.fireworks();}else if(primary.damage>0&&!this.bossDead){this.cue(primary,'hit','boss',animation,7);impactTask=this.clip('boss','hit');this.effects.play('white');}releaseImpact();};
    await this.clip(primary.actorId,animation,false,frame=>{const sound=heroSound(a.type as HeroType,animation);if(sound)this.cue(primary,sound,primary.actorId!,animation,frame);if(a.type==='warrior')impact();else this.projectile(a,this.actors.get('boss'),0xaec4d4,impact,HERO_EFFECTS[a.type as HeroType]);},()=>{if(a.type==='warrior'&&!this.reduced)a.movement=0;});
    if(!valid())return;
    // A missing sprite still yields a bounded visual result; no promise waits on a missing impact.
    if(a.clip===animation||this.reduced){await Promise.race([impactFinished,new Promise<void>(resolve=>setTimeout(resolve,400))]);}
    const victories=death?[...this.actors].filter(([id,h])=>id!=='boss'&&h.hp>0).map(([id],i)=>this.clip(id,'victory',false,undefined,i===0?()=>this.cue(death,'victory','boss','victory',0):undefined)):[];
    await Promise.all([impactTask,...victories]);
   }else if(primary?.type==='hero_hit'&&primary.targetId){
    const animation=this.bossAttackClip(primary);let target:Promise<void>=Promise.resolve();let resolveImpact:()=>void=()=>{};const arrived=new Promise<void>(resolve=>{resolveImpact=resolve;});
    if(!this.bossDead)await this.clip('boss',animation,false,frame=>{if(!valid()){resolveImpact();return;}const sound=bossSound(animation);if(sound)this.cue(primary,sound,'boss',animation,frame);
     const hit=()=>{if(!valid()){resolveImpact();return;}this.impactFeedback(primary,primary.targetId!,bossEffect(animation));target=this.clip(primary.targetId!,primary.heroHp===0?'defeat':'hit');this.cue(primary,primary.heroHp===0?'defeat':'hit',primary.targetId!,animation,frame);this.effects.play('red');if(primary.phase>=2){this.effects.play('shake');if(!this.reduced&&this.effectsEnabled)this.cue(primary,'shake','boss',animation,frame);this.effects.play('dark');}if(animation==='ultimate'){this.effects.play('slow');this.effects.play('white');}resolveImpact();};
     const boss=this.actors.get('boss');if(boss&&(animation==='breath'||animation==='ultimate'))this.projectile(boss,this.actors.get(primary.targetId!),GAME_PALETTE.wine,hit,'dragon-flame');else hit();
    });
    await Promise.race([arrived,new Promise<void>(resolve=>setTimeout(resolve,400))]);await target;
   }else if(primary?.type==='heal'&&primary.actorId&&primary.targetId){
    const a=this.actors.get(primary.actorId),target=this.actors.get(primary.targetId);if(a&&target)await new Promise<void>(resolve=>this.projectile(a,target,0xaec4d4,()=>{if(!valid()){resolve();return;}this.impactFeedback(primary,primary.targetId!,'healing-light');this.cue(primary,'heal',primary.targetId!,'heal',0);this.knockedOut.delete(primary.targetId!);void this.clip(primary.targetId!,'idle');resolve();},'healing-light'));
   }else if(death){this.bossDead=true;await this.clip('boss','death',false,undefined,()=>this.cue(death,'death','boss','death',0));}
  })();this.answerTask=this.answerTask.then(()=>{if(valid())this.host.dataset.answerCompleted='true';});return this.answerTask;
 }
 finishAnswer(){this.feedback.clear();delete this.host.dataset.answerPlaying;this.answerActive=false;this.answerId='';this.queue.reset(this.highestSeq);for(const[id,a]of this.actors){if(a.movement!==undefined){a.movement=undefined;a.offsetX=0;a.offsetY=0;this.groundFrame(a,a.sprite.currentFrame);}if(a.sprite.playing&&!a.sprite.loop){a.sprite.gotoAndStop(a.sprite.totalFrames-1);a.complete?.();a.complete=undefined;if(a.hp>0&&!(id==='boss'&&this.bossDead))void this.clip(id,'idle');}}}

 private projectile(from:Actor,to:Actor|undefined,color:number,impact?:()=>void,effect?:EffectId){if(!to){impact?.();return;}if(this.reduced||this.particles.length>=8){impact?.();return;}const height=from.scale*(visual[from.type].clips[from.clip]?.baseVisualHeight??from.height);const graphic=this.effectsEnabled&&effect?this.feedback.projectile(effect,height*.48)??new Graphics().circle(0,0,5).fill(color):new Graphics().circle(0,0,5).fill(color);if(graphic instanceof Sprite&&from.homeX<to.homeX&&effect!=='dragon-flame')graphic.scale.x*=-1;this.vfx.addChild(graphic);this.particles.push({graphic,from,to,remaining:350,impact});}
 private impactFeedback(event:RaidEvent,target:string,effect:EffectId){const a=this.actors.get(target);if(!a)return;this.feedback.impact(event,target,effect,()=>{const height=a.scale*(visual[a.type].clips[a.clip]?.baseVisualHeight??a.height);return {x:a.sprite.x,y:a.sprite.y-height*.5,height};});if(this.captureNext&&this.options.debug){this.captureNext=false;this.captureTimer=setTimeout(()=>{this.captureTimer=null;this.setPreviewPaused(true);},160);}}
 private fireworks(){if(this.reduced||!this.effectsEnabled||this.sparks.length)return;const count=this.quality==='low'?24:72,colors=[GAME_PALETTE.gold,GAME_PALETTE.mist,GAME_PALETTE.wine,GAME_PALETTE.mist];const w=this.profile?.imageWidth??this.app.screen.width,h=this.profile?.imageHeight??this.app.screen.height;for(let i=0;i<count;i++){const angle=i%24/24*Math.PI*2,g=new Graphics().circle(0,0,3).fill(colors[i%4]);g.position.set(w*(.25+Math.floor(i/24)*.22),h*(this.profileName==='phone'?.33:.4));this.vfx.addChild(g);this.sparks.push({graphic:g,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,remaining:1600});}}
 private tick=()=>{
  if(this.disposed)return;const now=performance.now(),delta=Math.max(0,Math.min(1000,now-this.realTick));this.realTick=now;this.frameTimes.push(delta);if(this.frameTimes.length>120)this.frameTimes.shift();this.time+=delta;this.elapsed+=delta;if(this.elapsed>120){this.elapsed=0;if(!this.answerActive)this.queue.take().forEach(e=>this.present(e));}
  if(this.profile)this.layers.parallax(this.time,this.profile.imageWidth,this.reduced||!this.effectsEnabled,this.quality==='low',this.profile);
  for(const a of this.actors.values()){if(!this.reduced&&a.sprite.playing)a.sprite.update({deltaTime:delta*60/1000*this.effects.speed} as Ticker);if(a.movement!==undefined){a.movement+=delta;const t=Math.min(a.movement/700,1),boss=this.actors.get('boss')!;const dx=boss.homeX-a.homeX,dy=boss.homeY-a.homeY,dist=Math.hypot(dx,dy)||1,reach=Math.min(dist*.4,a.height*.8);a.offsetX=dx/dist*reach*Math.sin(t*Math.PI);a.offsetY=dy/dist*reach*Math.sin(t*Math.PI);if(this.profile&&!insidePolygon({u:(a.homeX+a.offsetX)/this.profile.imageWidth,v:(a.homeY+a.offsetY)/this.profile.imageHeight},this.profile.playablePolygon)){a.offsetX=0;a.offsetY=0;}this.groundFrame(a,a.sprite.currentFrame);if(t===1){a.movement=undefined;a.offsetX=0;a.offsetY=0;}}}
  this.particles=this.particles.filter(p=>{p.remaining-=delta;const t=1-Math.max(0,p.remaining)/350;const x=p.from.homeX+p.from.offsetX-p.from.height*.2,y=p.from.homeY+p.from.offsetY-p.from.height*.55;p.graphic.position.set(x+(p.to.homeX-x)*t,y+(p.to.homeY-p.to.height*.45-y)*t);if(p.remaining<=0){p.graphic.destroy();p.impact?.();return false;}return true;});
  this.feedback.tick(delta);
  this.sparks=this.sparks.filter(p=>{p.remaining-=delta;p.vy+=delta*.08;p.graphic.x+=p.vx*delta/1000;p.graphic.y+=p.vy*delta/1000;p.graphic.alpha=Math.max(0,p.remaining/1600);if(p.remaining<=0){p.graphic.destroy();return false;}return true;});
  if(this.options.debug&&Math.floor(this.time/250)!==Math.floor((this.time-delta)/250))this.publishPlacement();
 };
 private layoutActor(id:string,a:Actor){
  const clip=visual[a.type].clips[a.clip],meta=clip?.frames[0];if(!clip||!meta)return;
  if(this.profile){const slot=id==='boss'?this.profile.boss:this.profile.heroes[a.slot];a.foot=slot.foot;a.homeX=a.foot.u*this.profile.imageWidth;a.homeY=a.foot.v*this.profile.imageHeight;a.height=slot.visualHeight*slot.scaleMultiplier*depthScale(a.foot,this.profile);a.scale=a.height/clip.baseVisualHeight;const width=meta.bounds.maxX-meta.bounds.minX+1;a.scale=Math.min(a.scale,this.profile.imageWidth*(id==='boss'?.38:.16)/Math.max(1,width));const flip=slot.facing!==visual[a.type].facing?-1:1;a.sprite.scale.set(a.scale*flip,a.scale);}
  else{const {width,height}=this.app.screen,heroes=[...this.actors.keys()].filter(k=>k!=='boss');a.homeX=width*(id==='boss'?.25:.81);a.homeY=id==='boss'?height*.58:height*(heroes.indexOf(id)+1)/(heroes.length+1);a.height=id==='boss'?height*.45:Math.min(height*.3,height/(heroes.length+1)*.7);a.scale=a.height/clip.baseVisualHeight;a.sprite.scale.set(a.scale);a.foot={u:a.homeX/width,v:a.homeY/height};}
  a.shadow.clear().ellipse(0,0,a.height*.16*visual[a.type].shadowScale,a.height*.035).fill({color:GAME_PALETTE.ink,alpha:.45});this.groundFrame(a,a.sprite.currentFrame);
 }
 private framingProfile(){
  const p=this.profile;if(!p||!this.options.compactViewport||this.profileName!=="wide"||this.host.clientHeight>=260||this.host.clientWidth<500||!matchMedia("(max-height:450px) and (min-width:600px)").matches)return p;
  const bounds={left:Math.min(...p.playablePolygon.map(v=>v.u)),right:Math.max(...p.playablePolygon.map(v=>v.u)),top:Math.min(...p.playablePolygon.map(v=>v.v)),bottom:Math.max(...p.playablePolygon.map(v=>v.v))};
  for(const[id,a]of this.actors){const slot=id==="boss"?p.boss:p.heroes[a.slot],data=visual[a.type],offset=this.options.footOffsets?.[a.type]??this.definition?.visualFootOffsets?.[a.type]??{x:0,y:0},height=slot.visualHeight*slot.scaleMultiplier*depthScale(slot.foot,p),flip=slot.facing===data.facing?1:-1;
   for(const clip of Object.values(data.clips)){const first=clip.frames[0].bounds,scale=Math.min(height/clip.baseVisualHeight,p.imageWidth*(id==="boss"?.38:.16)/(first.maxX-first.minX+1));for(const frame of clip.frames){const x1=slot.foot.u+(frame.bounds.minX-(frame.footX+offset.x)*clip.frameWidth)*scale*flip/p.imageWidth,x2=slot.foot.u+(frame.bounds.maxX-(frame.footX+offset.x)*clip.frameWidth)*scale*flip/p.imageWidth;bounds.left=Math.min(bounds.left,x1,x2);bounds.right=Math.max(bounds.right,x1,x2);bounds.top=Math.min(bounds.top,slot.foot.v+((frame.bounds.minY-(frame.footY+offset.y)*clip.frameHeight)*scale-data.hover)/p.imageHeight);bounds.bottom=Math.max(bounds.bottom,slot.foot.v+(frame.bounds.maxY-(frame.footY+offset.y)*clip.frameHeight)*scale/p.imageHeight);}}
  }
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));return {...p,cameraBounds:{left:clamp(bounds.left-.02),right:clamp(bounds.right+.02),top:clamp(bounds.top-.02),bottom:clamp(bounds.bottom+.02)}};
 }
 private resize(){if(this.disposed||!this.app.renderer)return;const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);this.app.renderer.resize(width,height);this.camera=this.profile?cameraFit(this.framingProfile()!,width,this.cameraHeight(),this.options.zoom,this.options.pan):{scale:1,x:0,y:0,imageWidth:width,imageHeight:height};this.cameraRoot.position.set(this.camera.x,this.camera.y);this.cameraRoot.scale.set(this.camera.scale);for(const[id,a]of this.actors)this.layoutActor(id,a);this.publishPlacement();}
 private publishPlacement(){if(!this.options.debug&&!this.options.onPlacement)return;const placement:Placement={profile:this.profileName,camera:this.camera,polygon:this.profile?.playablePolygon??[],fallback:!this.profile,actors:[...this.actors].map(([id,a])=>({id,type:a.type,foot:a.foot,...project(a.foot,this.camera),grounded:!this.profile||insidePolygon(a.foot,this.profile.playablePolygon),clip:a.clip,frame:a.sprite.currentFrame,scale:a.scale,anchorScreen:a.sprite.toGlobal({x:0,y:0}),shadowScreen:a.shadow.toGlobal({x:0,y:0})}))};if(this.options.debug){this.host.dataset.placement=JSON.stringify(placement);this.host.dataset.feedback=JSON.stringify(this.feedback.metrics());}this.options.onPlacement?.(placement);}
 private visibility=()=>{if(this.disposed)return;if(document.hidden){this.app.stop();this.queue.reset(this.highestSeq);this.feedback.clear();}else{this.realTick=performance.now();this.app.start();}};
 previewClip(actorId:string,clip:BossClip|HeroClip){return this.clip(actorId,clip);}
 captureNextImpact(){if(this.options.debug&&!this.disposed)this.captureNext=true;}
 setPreviewPaused(paused:boolean){if(!this.options.debug||this.disposed)return;if(paused){this.app.stop();this.host.dataset.previewPaused='true';this.publishPlacement();}else{delete this.host.dataset.previewPaused;this.realTick=performance.now();this.app.start();}}
 metrics(){const sorted=[...this.frameTimes].sort((a,b)=>a-b);return {scene:SceneLayers.metrics(),sprites:this.loader.metrics(),actorCount:this.actors.size,particles:this.particles.length,sparks:this.sparks.length,feedback:this.feedback.metrics(),frameP50Ms:sorted[Math.floor(sorted.length*.5)]??0,frameP95Ms:sorted[Math.floor(sorted.length*.95)]??0};}
 destroy(){this.disposed=true;if(this.captureTimer)clearTimeout(this.captureTimer);this.profileGeneration++;cancelAnimationFrame(this.resizeFrame);this.observer?.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.effects.destroy();this.feedback.destroy();for(const particle of this.particles){particle.impact?.();particle.graphic.destroy();}this.particles=[];this.actors.forEach(a=>{a.complete?.();a.release?.();});this.actors.clear();this.layers.destroy();if(this.app.renderer){this.app.ticker.remove(this.tick);this.app.destroy(true,{children:true,texture:false,textureSource:false});}this.loader.destroy();}
}
