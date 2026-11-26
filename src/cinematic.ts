// Cinematic mode (after SimPond's cinematic.rs): after a spell with no input the HUD goes and the
// camera alternates between watching the whole tank and following one of its inhabitants. Every
// shot is filmed from outside the glass, as an aquarium documentary would be: long lenses for the
// small residents, wide ones for the tank. Shots come from shuffled bags (never the same twice in a
// row), ease in from the last on a critically damped spring and dip to black for a long move.
import {species} from './simulation.js';
import type {Fish} from './simulation.js';
import type {Resident} from './invertebrates.js';

/** Seconds without input before the tour starts. */
export const IDLE_SECONDS=45;
const SHOT_SECONDS=11;
const EASE_SECONDS=3;
const DIP_SECONDS=.45;
const DIP_DISTANCE=8;
const HINT_SECONDS=5;
/** The front glass is at z ≈ 3.07; the camera keeps this far out. */
const FRONT=3.65;

export interface V{x:number;y:number;z:number}
const v=(x:number,y:number,z:number):V=>({x,y,z});
const add=(a:V,b:V)=>v(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a:V,b:V)=>v(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a:V,k:number)=>v(a.x*k,a.y*k,a.z*k);
const len=(a:V)=>Math.hypot(a.x,a.y,a.z);
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smooth=(t:number)=>{t=clamp(t,0,1);return t*t*(3-2*t);};

/** A critically damped spring toward `target` taking about `time` seconds (Unity's SmoothDamp). */
function damp(x:V,vel:V,target:V,time:number,dt:number){
 const w=2/Math.max(.05,time),k=w*dt,e=1/(1+k+.48*k*k+.235*k*k*k);
 for(const a of ['x','y','z'] as const){const change=x[a]-target[a],temp=(vel[a]+change*w)*dt;vel[a]=(vel[a]-temp*w)*e;x[a]=target[a]+(change+temp)*e;}
}
function dampScalar(x:number,target:number,time:number,dt:number){return target+(x-target)*Math.exp(-dt*3/Math.max(.05,time));}

/** The point to look at so `subject` sits on a third seen from `eye`: side −1 left, +1 right. */
function thirds(eye:V,subject:V,side:number,low:number,fov:number,aspect:number){
 const f=sub(subject,eye),d=Math.max(.05,len(f)),fwd=mul(f,1/d);
 let right=v(-fwd.z,0,fwd.x);const rl=len(right);if(rl<1e-3)return subject;right=mul(right,1/rl);
 const up=v(right.y*fwd.z-right.z*fwd.y,right.z*fwd.x-right.x*fwd.z,right.x*fwd.y-right.y*fwd.x);
 const tan=Math.tan(fov*Math.PI/360);
 return add(sub(subject,mul(right,side*d*tan*aspect/3)),mul(up,low*d*tan/3));
}
/** The vertical field of view (degrees) that shows `span` units at distance `d`. */
const lens=(span:number,d:number,lo=7,hi=50)=>clamp(2*Math.atan(span/2/Math.max(.1,d))*180/Math.PI,lo,hi);

type TankShot='wide'|'arc'|'glass'|'end'|'crane'|'surface';
type LifeShot='chase'|'school'|'floor'|'macro';
type Kind=TankShot|LifeShot;
const TANK:TankShot[]=['wide','arc','glass','end','crane','surface'];
const LIFE:LifeShot[]=['chase','school','floor','macro'];

export interface Subjects{fish:readonly Fish[];residents:readonly Resident[];day:boolean}
export interface CinematicView{eye:V;look:V;fov:number;focus:number}

class Rng{constructor(public s:number){}next(){this.s=(this.s*1664525+1013904223)>>>0;return this.s/4294967296;}}

export class Cinematic{
 active=false;idle=0;
 /** 0..1: the letterbox bars, the dip to black, the caption and the hint. */
 bars=0;fade=0;caption='';captionAlpha=0;hint=0;
 private kind:Kind='wide';private lastTank:Kind|undefined;private lastLife:Kind|undefined;private nextIsLife=false;
 private tankBag:TankShot[]=[];private lifeBag:LifeShot[]=[];
 private clock=0;private side=1;private coin=0;private target=-1;
 private lead=0;private heading=v(1,0,0);
 private eye=v(0,3,22);private eyeV=v(0,0,0);private look=v(0,2.45,0);private lookV=v(0,0,0);private fov=40;private focus=20;
 private pending:Kind|undefined;private dipping=0;
 private rng=new Rng(1);
 private started=false;

 /** Any input: the idle clock starts again. */
 poke(){this.idle=0;}
 /** Whether the tour should start now; `may` is false while a dialog is open or a drag is under way. */
 tickIdle(dt:number,may:boolean){if(this.active)return false;if(!may){this.idle=0;return false;}this.idle+=dt;return this.idle>=IDLE_SECONDS;}

 enter(from:CinematicView,seed:number){
  this.active=true;this.started=false;this.eye={...from.eye};this.look={...from.look};this.fov=from.fov;this.focus=from.focus;this.eyeV=v(0,0,0);this.lookV=v(0,0,0);
  this.rng=new Rng((Math.imul(seed|0,0x9e3779b9)^0x85ebca6b)>>>0||1);for(let i=0;i<6;i++)this.rng.next();
  this.tankBag=[];this.lifeBag=[];this.lastTank=this.lastLife=undefined;this.nextIsLife=false;this.pending=undefined;this.dipping=0;this.fade=0;this.hint=HINT_SECONDS;
  this.clock=SHOT_SECONDS;// choose the first shot on the first update
 }
 /** Leave at once; the caller eases its own camera back from `view()`. */
 exit(){this.active=false;this.fade=0;this.pending=undefined;this.captionAlpha=0;}
 view():CinematicView{return {eye:{...this.eye},look:{...this.look},fov:this.fov,focus:this.focus};}

 private draw<T extends Kind>(bag:T[],all:readonly T[],last:Kind|undefined,ok:(k:T)=>boolean):T|undefined{
  for(let attempt=0;attempt<2;attempt++){
   if(!bag.length){bag.push(...all);for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.rng.next()*(i+1));[bag[i],bag[j]]=[bag[j]!,bag[i]!];}}
   while(bag.length){const k=bag.pop()!;if(k!==last&&ok(k))return k;}
  }
  return undefined;
 }
 private available(k:Kind,s:Subjects){
  if(k==='chase')return s.fish.length>0;
  if(k==='school')return this.largestSchool(s.fish)!==undefined;
  if(k==='floor')return s.fish.some(f=>f.type===2);
  if(k==='macro')return s.residents.length>0;
  return true;
 }
 private largestSchool(fish:readonly Fish[]){
  let best:number|undefined,count=3;for(let t=0;t<species.length;t++){if(!species[t]!.school)continue;const n=fish.filter(f=>f.type===t).length;if(n>count){count=n;best=t;}}return best;
 }
 private pick(s:Subjects):Kind{
  // Alternate: the whole tank, then one of its inhabitants.
  const life=this.nextIsLife;this.nextIsLife=!life;
  if(life){const k=this.draw(this.lifeBag,LIFE,this.lastLife,k=>this.available(k,s));if(k){this.lastLife=k;return k;}}
  const k=this.draw(this.tankBag,TANK,this.lastTank,()=>true)!;this.lastTank=k;return k;
 }
 private begin(k:Kind,s:Subjects){
  this.kind=k;this.clock=0;this.side=this.rng.next()<.5?-1:1;this.coin=this.rng.next();this.target=-1;this.lead=0;
  if(k==='chase'){
   // Favour the bigger, slower fish a little: they hold a frame better.
   const weights=s.fish.map(f=>.6+species[f.type]!.size);let r=this.rng.next()*weights.reduce((a,b)=>a+b,0);
   for(let i=0;i<s.fish.length;i++){r-=weights[i]!;if(r<=0){this.target=s.fish[i]!.id;break;}}
   if(this.target<0)this.target=s.fish[0]!.id;
  }
  if(k==='floor'){const corys=s.fish.filter(f=>f.type===2);this.target=corys[Math.floor(this.rng.next()*corys.length)]!.id;}
  if(k==='school')this.target=this.largestSchool(s.fish)!;
  if(k==='macro'){
   // The nerite on the glass makes the best close-up; otherwise any resident.
   const glass=s.residents.filter(r=>r.glass),pool=glass.length&&this.coin<.35?glass:s.residents;this.target=pool[Math.floor(this.rng.next()*pool.length)]!.id;
  }
  const f=s.fish.find(f=>f.id===this.target);if(f){const h=Math.hypot(f.vx,f.vz)||1;this.heading=v(f.vx/h,0,f.vz/h);}
 }

 /** Where the current shot wants the camera at shot time `t`, or undefined when its subject has gone. */
 private shot(t:number,s:Subjects,aspect:number,dt:number):(CinematicView&{lag:number;caption:string})|undefined{
  const u=t/SHOT_SECONDS,side=this.side;
  const tankLook=v(0,2.45,0);
  switch(this.kind){
   case 'wide':{const a=side*(.12+.1*u),d=27-7*smooth(u),eye=v(Math.sin(a)*d,3.1+1.2*(1-u),Math.cos(a)*d);return {eye,look:tankLook,fov:38,focus:d,lag:1.4,caption:s.day?'The planted tank':'The tank at night'};}
   case 'arc':{const a=side*(-.85+1.7*u),d=19.5,eye=v(Math.sin(a)*d,2.2+.6*Math.sin(u*Math.PI),Math.max(FRONT+4,Math.cos(a)*d));return {eye,look:v(0,2.3,0),fov:36,focus:d,lag:1.2,caption:''};}
   case 'glass':{const x=side*(-6.2+12.4*u),eye=v(x,1.15+.25*Math.sin(u*Math.PI),FRONT+.9);return {eye,look:v(x+side*1.6,.95,-1.6),fov:34,focus:4.2,lag:.9,caption:'Along the gravel'};}
   case 'end':{const eye=v(-10.8,2.6+.5*u,1.6-2.2*u);return {eye,look:v(-1,2.4,-.2),fov:30,focus:8,lag:1.2,caption:'Through the end glass'};}
   case 'crane':{const k=smooth(u),eye=v(side*(2.2-1.6*k),.9+9.6*k,6.2+4.2*k);return {eye,look:v(0,1.2+.8*k,-.2),fov:40,focus:len(sub(eye,v(0,1.5,0))),lag:1,caption:''};}
   case 'surface':{const x=side*(-4.5+9*u),eye=v(x,7.4,6.6);return {eye,look:v(x*.6,4.6,0),fov:32,focus:7.5,lag:1.2,caption:'Light on the water'};}
   case 'chase':case 'floor':{
    const f=s.fish.find(f=>f.id===this.target);if(!f)return undefined;
    const p=v(f.x,f.y,f.z),sp=Math.hypot(f.vx,f.vz);
    if(sp>.05){const h=v(f.vx/sp,0,f.vz/sp);damp(this.heading,{x:0,y:0,z:0},h,.9,dt);const hl=Math.hypot(this.heading.x,this.heading.z)||1;this.heading.x/=hl;this.heading.z/=hl;}
    const h=this.heading,low=this.kind==='floor';
    // Trail a little behind the fish along the glass, at its depth (or nose-down to the gravel).
    const eye=v(clamp(p.x-h.x*(low?1.1:1.6),-6.9,6.9),low?Math.max(.5,p.y+.28):p.y+.35+.25*Math.sin(u*Math.PI),Math.max(FRONT+(low?.15:.4),p.z+2.4));
    const d=len(sub(p,eye)),size=species[f.type]!.size*1.42*(.35+.65*f.growth);
    const fov=lens(size*(low?3.4:4.2),d,7,34);
    // Lead room: a fish swimming right sits on the left third.
    this.lead=dampScalar(this.lead,-clamp(h.x*1.6,-1,1),1.2,dt);
    const look=thirds(eye,p,this.lead,low?.35:0,fov,aspect);
    const name=f.name+'  ·  '+species[f.type]!.name;
    return {eye,look,fov,focus:d,lag:.55,caption:name};
   }
   case 'school':{
    const group=s.fish.filter(f=>f.type===this.target);if(group.length<4)return undefined;
    const c=mul(group.reduce((a,f)=>add(a,v(f.x,f.y,f.z)),v(0,0,0)),1/group.length);
    const r=Math.max(.8,...group.map(f=>Math.hypot(f.x-c.x,f.y-c.y,f.z-c.z)));
    const a=side*(-.45+.9*u),d=Math.max(4.2,r*2.8);
    const eye=v(clamp(c.x+Math.sin(a)*d,-8,8),c.y+.55,Math.max(FRONT+.3,c.z+Math.cos(a)*d));
    const dist=len(sub(c,eye));
    return {eye,look:c,fov:lens(r*2.9,dist,14,44),focus:dist,lag:1,caption:'A school of '+species[this.target]!.name.toLowerCase()+'s'};
   }
   case 'macro':{
    const r=s.residents.find(r=>r.id===this.target);if(!r)return undefined;
    const q=r.root.position,p=v(q.x,q.y+.12,q.z);
    const eye=r.glass?v(p.x+side*(.5-.3*u),p.y+.15,FRONT+.8):v(clamp(p.x+side*(.9-.6*u),-6.9,6.9),Math.max(.45,p.y+.4),Math.max(FRONT+.25,p.z+1.3));
    const d=len(sub(p,eye));
    return {eye,look:thirds(eye,p,side*.6,.2,lens(1,d,6,30),aspect),fov:lens(1,d,6,30),focus:d,lag:.8,caption:r.name};
   }
  }
 }

 update(dt:number,s:Subjects,aspect:number,reducedMotion:boolean):CinematicView{
  this.bars=dampScalar(this.bars,this.active?1:0,.6,dt);
  if(!this.active)return this.view();
  this.hint=Math.max(0,this.hint-dt);
  this.clock+=dt;
  // A dip to black in progress: fade out, cut, fade in.
  if(this.pending){
   this.dipping+=dt;this.fade=clamp(this.dipping/DIP_SECONDS,0,1);
   if(this.dipping>=DIP_SECONDS){this.begin(this.pending,s);this.pending=undefined;const first=this.shot(0,s,aspect,dt);if(first){this.eye={...first.eye};this.look={...first.look};this.fov=first.fov;this.focus=first.focus;}this.eyeV=v(0,0,0);this.lookV=v(0,0,0);this.clock=0;}
   if(this.pending)return this.view();
  }else this.fade=Math.max(0,this.fade-dt/DIP_SECONDS);
  let want=this.clock<SHOT_SECONDS?this.shot(this.clock,s,aspect,dt):undefined;
  if(!want){
   // Next shot: ease toward it, or dip to black when the move is long.
   const k=this.pick(s);this.begin(k,s);want=this.shot(0,s,aspect,dt);
   // The first shot eases from the player's camera; later long moves dip to black.
   if(want&&this.started&&len(sub(want.eye,this.eye))>DIP_DISTANCE){this.pending=k;this.dipping=0;return this.view();}
   this.started=true;if(!want)return this.view();
  }
  const ease=this.clock<EASE_SECONDS?lerpN(2.6,1,smooth(this.clock/EASE_SECONDS)):1,slow=reducedMotion?1.8:1;
  damp(this.eye,this.eyeV,want.eye,want.lag*ease*slow,dt);
  damp(this.look,this.lookV,want.look,want.lag*.8*ease*slow,dt);
  this.fov=dampScalar(this.fov,want.fov,want.lag*1.3*ease,dt);
  this.focus=dampScalar(this.focus,want.focus,.5,dt);
  const cap=this.clock<SHOT_SECONDS?want.caption:'';if(cap)this.caption=cap;
  const showFor=this.clock>1.2&&this.clock<SHOT_SECONDS-1.2&&!!cap;
  this.captionAlpha=dampScalar(this.captionAlpha,showFor?1:0,.5,dt);
  return this.view();
 }
}
const lerpN=(a:number,b:number,t:number)=>a+(b-a)*t;
