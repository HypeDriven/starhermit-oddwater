// Oddwater's aquarium model. Units: mg/L, degrees C, simulated hours.
// A forgiving aquarium-inspired model, not an animal-care calculator.
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const species = [
  {name:'Neon tetra',latin:'Paracheirodon innesi',color:0x62dfe5,size:0.58,zone:2.8,speed:0.75,school:true,cost:18,group:6},
  {name:'Harlequin rasbora',latin:'Trigonostigma heteromorpha',color:0xe7b17c,size:0.72,zone:3.5,speed:0.62,school:true,cost:20,group:6},
  {name:'Peppered cory',latin:'Corydoras paleatus',color:0xb4b39b,size:0.82,zone:0.6,speed:0.42,school:true,cost:22,group:4},
  {name:'Pearl gourami',latin:'Trichopodus leerii',color:0xd9bc9b,size:1.13,zone:4.4,speed:0.32,school:false,cost:24,group:1},
];
export interface Fish {id:number;type:number;x:number;y:number;z:number;vx:number;vy:number;vz:number;hunger:number;health:number;phase:number;}
export interface Pellet {x:number;y:number;z:number;age:number;}
export interface Aquarium {version:number;hours:number;wonder:number;ammonia:number;nitrite:number;nitrate:number;oxygen:number;temp:number;ph:number;bacteria:number;plants:number;algae:number;food:number;fed:number;changed:number;dreams:number;fish:Fish[];pellets:Pellet[];healthy:number;claimed:number[];}
export function newAquarium():Aquarium {const s:Aquarium={version:1,hours:8,wonder:32,ammonia:0.015,nitrite:0.008,nitrate:8.2,oxygen:7.4,temp:25,ph:6.9,bacteria:0.85,plants:9,algae:0.04,food:0,fed:0,changed:0,dreams:0,fish:[],pellets:[],healthy:0,claimed:[]};addFish(s,0,8);addFish(s,1,6);addFish(s,2,4);addFish(s,3,1);return s;}
export function addFish(s:Aquarium,type:number,n:number){for(let i=0;i<n;i++){const p=species[type];s.fish.push({id:s.fish.length,type,x:(Math.random()-.5)*11,y:p.zone+(Math.random()-.5)*0.8,z:(Math.random()-.5)*4.4,vx:p.speed*(Math.random()>.5?1:-1),vy:0,vz:0,hunger:0.43,health:100,phase:Math.random()*6.28});}}
export function harmony(s:Aquarium){const hungry=s.fish.reduce((a,f)=>a+f.hunger,0)/s.fish.length;return clamp(100-s.ammonia*140-s.nitrite*190-Math.max(0,s.nitrate-25)*1.3-Math.max(0,6-s.oxygen)*15-Math.abs(s.temp-25)*5-hungry*14-s.algae*10,0,100);}
export function feed(s:Aquarium,x=0,z=0){if(s.pellets.length>45)return false;for(let i=0;i<8;i++)s.pellets.push({x:x+(Math.random()-.5)*1.2,y:5.65-Math.random()*.12,z:z+(Math.random()-.5)*1.1,age:0});s.fed++;return true;}
export function waterChange(s:Aquarium){s.ammonia*=.7;s.nitrite*=.7;s.nitrate*=.7;s.food*=.7;s.oxygen=Math.min(8.4,s.oxygen+.6);s.changed++;}
export function advance(s:Aquarium,seconds:number,speed:number){const h=seconds*speed/80;s.hours+=h;const light=Math.max(0,Math.sin((s.hours%24-6)/12*Math.PI));const load=s.fish.length/19;
  const production=.022*load+s.food*.16;const convert=Math.min(s.ammonia+h*production,s.bacteria*.16*h);const convert2=Math.min(s.nitrite+convert*.8,s.bacteria*.14*h);
  s.ammonia=Math.max(0,s.ammonia+production*h-convert);s.nitrite=Math.max(0,s.nitrite+convert*.8-convert2);s.nitrate=Math.max(0,s.nitrate+convert2*3.2-s.plants*.005*light*h);s.bacteria=clamp(s.bacteria+h*.008,0,1.2);s.food=Math.max(0,s.food-h*.08);s.oxygen=clamp(s.oxygen+h*((7.7-s.oxygen)*.35+s.plants*.014*light-.12*load-s.food*.15),2,9);s.algae=clamp(s.algae+h*(light*.012+s.nitrate*.0003-.007-s.plants*.0005),0,1);
  s.ph=clamp(s.ph+(6.9-s.ph)*h*.03-s.food*h*.001,5.8,8);const quality=harmony(s);if(quality>80){s.wonder+=h*3.2;s.healthy+=seconds*speed;}
  for(const f of s.fish){f.hunger=clamp(f.hunger+h*.035,0,1);f.health=clamp(f.health+h*(quality>65?.15:-.4),12,100);}
}
export function swim(s:Aquarium,dt:number,t:number){
 for(let i=s.pellets.length-1;i>=0;i--){const p=s.pellets[i];p.age+=dt;p.y=Math.max(.25,p.y-dt*.24);if(p.age>45){s.food+=.04;s.pellets.splice(i,1);}}
 for(const f of s.fish){const p=species[f.type];let ax=-f.x*.025,ay=(p.zone+Math.sin(t*.28+f.phase)*.5-f.y)*.24,az=-f.z*.06;let nearest:Pellet|undefined;let best=100;
  if(f.hunger>.12)for(const pellet of s.pellets){const d=(pellet.x-f.x)**2+(pellet.y-f.y)**2+(pellet.z-f.z)**2;if(d<best){best=d;nearest=pellet;}}
  if(nearest&&best<70){ax+=(nearest.x-f.x)*.7;ay+=(nearest.y-f.y)*.7;az+=(nearest.z-f.z)*.7;if(best<.16){const n=s.pellets.indexOf(nearest);if(n>=0)s.pellets.splice(n,1);f.hunger=Math.max(0,f.hunger-.22);s.wonder+=.16;}}
  else {ax+=Math.sin(t*.37+f.phase)*.12;az+=Math.cos(t*.24+f.phase)*.13;}
  for(const g of s.fish){if(g===f)continue;const dx=g.x-f.x,dy=g.y-f.y,dz=g.z-f.z;const d=dx*dx+dy*dy+dz*dz;if(d<.38&&d>.001){ax-=dx/(d+.1)*.22;ay-=dy/(d+.1)*.2;az-=dz/(d+.1)*.22;}else if(g.type===f.type&&p.school&&d<12&&!nearest){ax+=dx*.012+(g.vx-f.vx)*.08;ay+=dy*.01;az+=dz*.012+(g.vz-f.vz)*.08;}}
  if(Math.abs(f.x)>5.8)ax-=Math.sign(f.x)*(Math.abs(f.x)-5.8)*1.5;if(Math.abs(f.z)>2.2)az-=Math.sign(f.z)*(Math.abs(f.z)-2.2)*1.5;if(f.y>5.3)ay-=(f.y-5.3)*2;if(f.y<.4)ay+=(.4-f.y)*2;
  // The large central stones are steering obstacles, not invisible swim-throughs.
  const ox=f.x-.4,oz=f.z+.4;const od=ox*ox+oz*oz;if(f.y<1.8&&od<2.1){ax+=ox*.7;az+=oz*.7;ay+=.3;}
  f.vx+=ax*dt;f.vy+=ay*dt;f.vz+=az*dt;const v=Math.sqrt(f.vx*f.vx+f.vy*f.vy+f.vz*f.vz);const cap=p.speed*(nearest?1.8:1.1);if(v>cap){f.vx*=cap/v;f.vy*=cap/v;f.vz*=cap/v;}if(v<.12)f.vx+=.1*dt;f.x=clamp(f.x+f.vx*dt,-6.5,6.5);f.y=clamp(f.y+f.vy*dt,.28,5.6);f.z=clamp(f.z+f.vz*dt,-2.65,2.65);
 }
}
