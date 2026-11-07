import type {QualityTier} from 'starhermit:engine';
import {GLTFLoader,Group,Mesh,MeshStandardMaterial,DoubleSide} from 'starhermit:scene';
import type {Fish} from './simulation.js';
import {species,clamp} from './simulation.js';
import {submergedHooks} from './water/aquarium.js';
import {fishScattering} from './tissue.js';
const ids=['neon-tetra','harlequin-rasbora','peppered-cory','pearl-gourami'];
const cache=new Map<QualityTier,Group[]>();
const pending=new Map<QualityTier,Promise<Group[]>>();
let wanted:QualityTier='low',active:QualityTier='low';
export interface FishVisual {root:Group;yaw:number;phase:{value:number};variants:Group|undefined;fish:Fish;}
export const fishVisuals:FishVisual[]=[];
const BEND=`
fn vertex(v: Vertex) -> Vertex {
 var o=v;
 let x=v.position.x;
 let tail=clamp((0.30-x)/0.80,0.0,1.0);
 let a=uniforms.phase+x*7.5;
 let bend=sin(a)*tail*tail*0.12;
 let slope=cos(a)*7.5*tail*tail*0.12-sin(a)*tail*0.30;
 o.position.z=v.position.z+bend;
 o.normal=normalize(vec3f(v.normal.x-slope*v.normal.z,v.normal.y,v.normal.z));
 o.v0=vec4f(v.position,1.0);
 return o;
}`;
async function templates(tier:QualityTier):Promise<Group[]>{
 const saved=cache.get(tier);if(saved)return saved;
 let loading=pending.get(tier);
 if(!loading){
  loading=Promise.all(ids.map(async id=>(await new GLTFLoader().loadAsync(`assets/fish/${tier}/${id}.glb`)).scene));
  pending.set(tier,loading);
 }
 try{const models=await loading;cache.set(tier,models);return models;}finally{pending.delete(tier);}
}
function dress(v:FishVisual,models:Group[]){
 if(v.variants){v.root.remove(v.variants);v.variants.traverse(o=>{if(o instanceof Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});}
 const model=models[v.fish.type]!.clone(true);
 model.traverse(o=>{if(o instanceof Mesh){
  const source=Array.isArray(o.material)?o.material:[o.material];
  const mats=source.map(m=>{const material=m.clone();if(material instanceof MeshStandardMaterial){material.roughness=.38;material.metalness=.08;material.side=DoubleSide;material.hooks=submergedHooks({uniforms:{phase:v.phase},vertex:BEND,light:fishScattering});}return material;});
  o.material=Array.isArray(o.material)?mats:mats[0]!;o.castShadow=true;o.receiveShadow=true;
 }});
 v.variants=model;v.root.add(model);
}
export async function prepareFishModels(tier:QualityTier){wanted=active=tier;await templates(tier);}
export function createFish(fish:Fish):FishVisual{
 const root=new Group(),size=species[fish.type]!.size*1.42;root.scale.setScalar(size);
 const v:FishVisual={root,yaw:0,phase:{value:fish.phase},variants:undefined,fish};
 dress(v,cache.get(active)!);fishVisuals.push(v);return v;
}
export function removeFishVisual(id:number){
 const index=fishVisuals.findIndex(v=>v.fish.id===id);if(index<0)return;
 const v=fishVisuals[index]!;v.root.parent?.remove(v.root);v.root.traverse(o=>{if(o instanceof Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});fishVisuals.splice(index,1);
}
let changing=false;
export function updateFishQuality(tier:QualityTier){
 wanted=tier;if(changing||active===tier)return;
 changing=true;
 void templates(tier).then(models=>{if(wanted===tier){for(const v of fishVisuals)dress(v,models);active=tier;}}).catch(error=>console.error('Fish models: '+String(error))).finally(()=>{changing=false;});
}
export function animateFish(time:number,paused:boolean){
 for(const v of fishVisuals){const f=v.fish;
  v.root.position.set(f.x,f.y,f.z);v.root.scale.setScalar(species[f.type]!.size*1.42*(.35+.65*f.growth));
  const target=Math.atan2(-f.vz,f.vx);let diff=target-v.yaw;
  while(diff>Math.PI)diff-=Math.PI*2;while(diff< -Math.PI)diff+=Math.PI*2;
  v.yaw+=diff*.09;v.root.rotation.set(0,v.yaw,clamp(f.vy*.4,-.3,.3));
  if(!paused)v.phase.value=time*(7+species[f.type]!.speed*4)+f.phase;
 }
}
