import { z } from "zod";
import data from "./registry.json";
import { placementWarnings, type SceneDefinition } from "./geometry";
const uv=z.object({u:z.number().min(0).max(1),v:z.number().min(0).max(1)}).strict();
const slot=z.object({foot:uv,scaleMultiplier:z.number().min(.3).max(2),facing:z.enum(['left','right']),visualHeight:z.number().positive().max(2000)}).strict();
const alignment=z.object({scale:z.number().positive().max(4),offsetU:z.number().min(-2).max(2),offsetV:z.number().min(-2).max(2)}).strict();
const filename=z.string().regex(/^[^/\\]+\.(png|webp)$/i).refine(v=>!v.includes('..'));
const profile=z.object({images:z.object({far:filename,mid:filename,fight:filename}).strict(),imageWidth:z.number().int().positive().max(8192),imageHeight:z.number().int().positive().max(8192),playablePolygon:z.array(uv).min(3).max(30),safeInset:z.number().min(0).max(.1),floorDepth:z.object({backV:z.number().min(0).max(1),frontV:z.number().min(0).max(1),backScale:z.number().min(.3).max(2),frontScale:z.number().min(.3).max(2)}).strict().refine(v=>v.frontV>v.backV),cameraBounds:z.object({left:z.number().min(0).max(1),top:z.number().min(0).max(1),right:z.number().min(0).max(1),bottom:z.number().min(0).max(1)}).strict().refine(b=>b.right>b.left&&b.bottom>b.top),boss:slot,heroes:z.array(slot).length(5),layerAlignment:z.object({far:alignment,mid:alignment,fight:alignment}).strict(),calibration:z.object({reviewed:z.boolean(),reviewedAt:z.string().optional(),notes:z.string().max(2000)}).strict()}).strict();
export const sceneSchema=z.object({sceneId:z.string().regex(/^[a-z][a-z0-9-]{0,40}$/),label:z.string().min(1).max(100),profiles:z.object({wide:profile,phone:profile}).strict(),visualFootOffsets:z.record(z.enum(['boss','warrior','mage','wizard','witch','fairy']),z.object({x:z.number().min(-.2).max(.2),y:z.number().min(-.2).max(.2)}).strict()).optional()}).strict().superRefine((scene,ctx)=>{for(const name of ['wide','phone'] as const)for(const warning of placementWarnings(scene.profiles[name]))ctx.addIssue({code:'custom',path:['profiles',name],message:warning});});
export const SCENES=data.scenes.map(s=>sceneSchema.parse(s) as SceneDefinition);
export const DEFAULT_SCENE_ID=data.defaultSceneId;
export function sceneById(id=DEFAULT_SCENE_ID){return SCENES.find(s=>s.sceneId===id);}
export const layerUrl=(sceneId:string,file:string)=>`/assets/boss-raid/scenes/${sceneId}/${encodeURIComponent(file)}`;
