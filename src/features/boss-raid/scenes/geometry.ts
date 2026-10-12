import type { HeroType } from "../assets/manifest";
export type UV = {u:number;v:number};
export type Slot = {foot:UV;scaleMultiplier:number;facing:"left"|"right";visualHeight:number};
export type Profile = {images:Record<"far"|"mid"|"fight",string>;imageWidth:number;imageHeight:number;playablePolygon:UV[];safeInset:number;floorDepth:{backV:number;frontV:number;backScale:number;frontScale:number};cameraBounds:{left:number;top:number;right:number;bottom:number};boss:Slot;heroes:Slot[];layerAlignment:Record<"far"|"mid"|"fight",{scale:number;offsetU:number;offsetV:number}>;calibration:{reviewed:boolean;reviewedAt?:string;notes:string}};
export type SceneDefinition = {sceneId:string;label:string;profiles:Record<"wide"|"phone",Profile>;visualFootOffsets?:Record<string,{x:number;y:number}>};
export type Camera = {scale:number;x:number;y:number;imageWidth:number;imageHeight:number};
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function cameraFit(profile:Profile,width:number,height:number,zoom=1,pan={x:0,y:0}):Camera {
 const b=profile.cameraBounds,w=(b.right-b.left)*profile.imageWidth,h=(b.bottom-b.top)*profile.imageHeight;
 const scale=Math.min(Math.max(1,width)/w,Math.max(1,height)/h)*clamp(zoom,.5,2);
 return {scale,x:(width-w*scale)/2-b.left*profile.imageWidth*scale+pan.x,y:(height-h*scale)/2-b.top*profile.imageHeight*scale+pan.y,imageWidth:profile.imageWidth,imageHeight:profile.imageHeight};
}
export const project=(p:UV,c:Camera)=>({x:c.x+p.u*c.imageWidth*c.scale,y:c.y+p.v*c.imageHeight*c.scale});
export const unproject=(p:{x:number;y:number},c:Camera):UV=>({u:(p.x-c.x)/(c.imageWidth*c.scale),v:(p.y-c.y)/(c.imageHeight*c.scale)});
export function insidePolygon(p:UV,polygon:UV[]) {
 let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {const a=polygon[i],b=polygon[j];if((a.v>p.v)!==(b.v>p.v)&&p.u<(b.u-a.u)*(p.v-a.v)/(b.v-a.v)+a.u)inside=!inside;}return inside;
}
export function edgeDistance(p:UV,polygon:UV[]) {
 let distance=Infinity;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.u-a.u,dy=b.v-a.v,t=clamp(((p.u-a.u)*dx+(p.v-a.v)*dy)/(dx*dx+dy*dy||1),0,1);distance=Math.min(distance,Math.hypot(p.u-a.u-t*dx,p.v-a.v-t*dy));}return distance;
}
export function constrainPoint(p:UV,polygon:UV[],inset:number):UV {
 const center=polygon.reduce((c,v)=>({u:c.u+v.u/polygon.length,v:c.v+v.v/polygon.length}),{u:0,v:0});
 const point={u:clamp(p.u,0,1),v:clamp(p.v,0,1)};
 if(insidePolygon(point,polygon)&&edgeDistance(point,polygon)>=inset)return point;
 for(let step=1;step<=100;step++){const t=step/100,q={u:point.u+(center.u-point.u)*t,v:point.v+(center.v-point.v)*t};if(insidePolygon(q,polygon)&&edgeDistance(q,polygon)>=inset)return q;}return center;
}
export function profileForStage(width:number,height:number,profiles?:Record<"wide"|"phone",Profile>):"wide"|"phone" {
 if(!profiles)return width/Math.max(1,height)<1?'phone':'wide';
 const coverage=(p:Profile)=>{const b=p.cameraBounds,w=(b.right-b.left)*p.imageWidth,h=(b.bottom-b.top)*p.imageHeight,scale=Math.min(width/w,height/h);return w*h*scale*scale;};
 return coverage(profiles.phone)>coverage(profiles.wide)?'phone':'wide';
}
export function depthScale(p:UV,profile:Profile){const d=profile.floorDepth;return d.backScale+(d.frontScale-d.backScale)*clamp((p.v-d.backV)/(d.frontV-d.backV),0,1);}
export function assignHeroSlots(heroes:{id:string;heroType:HeroType|null}[]) {
 const preferred:Record<HeroType,number>={warrior:0,mage:1,wizard:2,witch:3,fairy:4};const occupied=new Set<number>(),result=new Map<string,number>();
 for(const h of [...heroes].sort((a,b)=>(a.heroType?preferred[a.heroType]:5)-(b.heroType?preferred[b.heroType]:5)||a.id.localeCompare(b.id))){const wish=h.heroType?preferred[h.heroType]:0;const index=!occupied.has(wish)?wish:[0,2,1,3,4].find(i=>!occupied.has(i));if(index!==undefined){occupied.add(index);result.set(h.id,index);}}
 return result;
}
export function placementWarnings(p:Profile){const warnings:string[]=[];let area=0;const polygon=p.playablePolygon;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a.u*b.v-b.u*a.v;for(let j=i+2;j<polygon.length;j++){if(i===0&&j===polygon.length-1)continue;const c=polygon[j],d=polygon[(j+1)%polygon.length],cross=(x:UV,y:UV,z:UV)=>(y.u-x.u)*(z.v-x.v)-(y.v-x.v)*(z.u-x.u);if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.u,b.u),Math.min(c.u,d.u))<=Math.min(Math.max(a.u,b.u),Math.max(c.u,d.u))&&Math.max(Math.min(a.v,b.v),Math.min(c.v,d.v))<=Math.min(Math.max(a.v,b.v),Math.max(c.v,d.v)))warnings.push('Polygon intersects itself');}}if(Math.abs(area)<.0001)warnings.push('Polygon has no usable area');for(const [name,slot] of [["boss",p.boss],...p.heroes.map((s,i)=>[`hero${i+1}`,s])] as [string,Slot][]){if(!insidePolygon(slot.foot,polygon)||edgeDistance(slot.foot,polygon)<p.safeInset)warnings.push(`${name}: outside safe floor`);}if(p.boss.foot.u>=Math.min(...p.heroes.map(s=>s.foot.u)))warnings.push('Boss must remain left of heroes');if(new Set(p.heroes.map(s=>s.foot.u)).size<2)warnings.push('Heroes must have a depth formation');return [...new Set(warnings)];}
