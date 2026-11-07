// Oddwater's forgiving freshwater ecosystem. All progression uses simulated hours.
export const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export type FoodKind='flakes'|'sinking'|'greens';
export const foods:Record<FoodKind,{name:string;hint:string;sink:number}>={
 flakes:{name:'Flakes',hint:'Small meals for the tetras, rasboras and gourami.',sink:.18},
 sinking:{name:'Sinking pellets',hint:'Reach the corys and other bottom grazers.',sink:.65},
 greens:{name:'Algae wafer',hint:'A slow meal for shrimp and snails; fish may nibble.',sink:.42},
};
export const species=[
 {name:'Neon tetra',latin:'Paracheirodon innesi',color:0x62dfe5,size:.58,zone:2.8,speed:.75,school:true,cost:18,group:6,food:'flakes' as FoodKind,minSchool:6},
 {name:'Harlequin rasbora',latin:'Trigonostigma heteromorpha',color:0xe7b17c,size:.72,zone:3.5,speed:.62,school:true,cost:20,group:6,food:'flakes' as FoodKind,minSchool:6},
 {name:'Peppered cory',latin:'Corydoras paleatus',color:0xb4b39b,size:.82,zone:.6,speed:.42,school:true,cost:22,group:4,food:'sinking' as FoodKind,minSchool:4},
 {name:'Pearl gourami',latin:'Trichopodus leerii',color:0xd9bc9b,size:1.13,zone:4.4,speed:.32,school:false,cost:24,group:1,food:'flakes' as FoodKind,minSchool:1},
];
export interface Fish{id:number;type:number;x:number;y:number;z:number;vx:number;vy:number;vz:number;hunger:number;health:number;phase:number;name:string;stress:number;bond:number;growth:number;meals:number;}
export interface Pellet{x:number;y:number;z:number;age:number;kind:FoodKind;}
export interface Nursery{type:number;hours:number;ready:boolean;}
export interface Counters{rinsed:number;trimmed:number;bred:number;meals:number;foodKinds:number;rehomed:number;}
export interface KeeperProject{cycle:number;baseline:Counters;started:number;calm:number;}
export interface Aquarium{
 version:2;hours:number;wonder:number;ammonia:number;nitrite:number;nitrate:number;oxygen:number;temp:number;ph:number;bacteria:number;plants:number;algae:number;food:number;fed:number;changed:number;dreams:number;fish:Fish[];pellets:Pellet[];healthy:number;claimed:number[];
 filter:number;aerator:number;filterDirt:number;lightHours:number;foodKind:FoodKind;plantGrowth:number;cuttings:number;crewEnergy:number;observed:string[];milestones:string[];counters:Counters;project:KeeperProject;nursery:Nursery|null;log:{hour:number;text:string}[];
}
const names=['Ripple','Clover','Pebble','Juniper','Miso','Pip','Fern','Comet','Moss','Opal','Puddle','Willow','Nori','Copper','Bramble','Lumen','Biscuit','Cedar','Pearl','Wisp','Echo','Maple','Dew','Tansy','Nimbus','Reed','Cinder','Dapple','Brook','Sprout','Olive','Coral','Mica','Cress','Finch'];
const counts=():Counters=>({rinsed:0,trimmed:0,bred:0,meals:0,foodKinds:0,rehomed:0});
export function newAquarium():Aquarium{
 const s:Aquarium={version:2,hours:8,wonder:32,ammonia:.015,nitrite:.008,nitrate:8.2,oxygen:7.4,temp:25,ph:6.9,bacteria:.85,plants:9,algae:.04,food:0,fed:0,changed:0,dreams:0,fish:[],pellets:[],healthy:0,claimed:[],filter:0,aerator:0,filterDirt:.04,lightHours:8,foodKind:'flakes',plantGrowth:.15,cuttings:0,crewEnergy:.8,observed:[],milestones:[],counters:counts(),project:{cycle:0,baseline:counts(),started:8,calm:0},nursery:null,log:[]};
 addFish(s,0,8);addFish(s,1,6);addFish(s,2,4);addFish(s,3,1);record(s,'An established aquarium. A whole community to get to know.');return s;
}
function finite(value:unknown,fallback:number,lo:number,hi:number){return typeof value==='number'&&Number.isFinite(value)?clamp(value,lo,hi):fallback;}
// The storage key stays oddwater-v1: migration is additive and never resets a good aquarium.
export function restoreAquarium(raw:unknown):Aquarium{
 if(!raw||typeof raw!=='object')return newAquarium();
 const saved=raw as Record<string,unknown>;
 if(![1,2].includes(saved.version as number)||!Array.isArray(saved.fish)||!saved.fish.length||saved.fish.length>50)return newAquarium();
 const s=newAquarium();
 const limits:Record<string,[number,number]>={hours:[0,1e7],wonder:[0,1e9],ammonia:[0,100],nitrite:[0,100],nitrate:[0,1000],oxygen:[2,9],temp:[15,35],ph:[5.8,8],bacteria:[0,1.5],plants:[0,36],algae:[0,1],food:[0,100],fed:[0,1e8],changed:[0,1e8],dreams:[0,3],healthy:[0,1e10],filter:[0,2],aerator:[0,2],filterDirt:[0,1],lightHours:[6,12],plantGrowth:[0,1],cuttings:[0,20],crewEnergy:[0,1]};
 for(const [key,[lo,hi]] of Object.entries(limits)){const dest=s as unknown as Record<string,unknown>;dest[key]=finite(saved[key],dest[key] as number,lo,hi);}
 s.filter=Math.floor(s.filter);s.aerator=Math.floor(s.aerator);s.plants=Math.floor(s.plants);s.dreams=Math.floor(s.dreams);s.cuttings=Math.floor(s.cuttings);
 s.foodKind=typeof saved.foodKind==='string'&&Object.keys(foods).includes(saved.foodKind)?saved.foodKind as FoodKind:'flakes';
 s.claimed=Array.isArray(saved.claimed)?[...new Set(saved.claimed.filter((i):i is number=>Number.isInteger(i)&&i>=0&&i<4))]:[];
 s.observed=Array.isArray(saved.observed)?[...new Set(saved.observed.filter((v):v is string=>typeof v==='string'&&guide.some(g=>g.key===v)))]:[];
 s.milestones=Array.isArray(saved.milestones)?[...new Set(saved.milestones.filter((v):v is string=>typeof v==='string').slice(0,30))]:[];
 s.fish=[];
 for(const [index,value] of saved.fish.slice(0,35).entries()){
  if(!value||typeof value!=='object')continue;const f=value as Record<string,unknown>;
  const type=Math.floor(finite(f.type,0,0,3));addFish(s,type,1);const out=s.fish[s.fish.length-1]!;
  for(const key of ['x','y','z','vx','vy','vz','hunger','health','phase','stress','bond','growth','meals'] as const){const ranges:Record<string,[number,number]>={x:[-6.5,6.5],y:[.28,5.6],z:[-2.65,2.65],vx:[-2,2],vy:[-2,2],vz:[-2,2],hunger:[0,1],health:[12,100],phase:[0,7],stress:[0,100],bond:[0,100],growth:[.3,1],meals:[0,1e8]};const [lo,hi]=ranges[key]!;out[key]=finite(f[key],out[key],lo,hi);}
  out.id=index;out.name=typeof f.name==='string'&&f.name.trim()?f.name.trim().slice(0,18):names[index%names.length]!;
 }
 if(!s.fish.length)return newAquarium();s.pellets=[];
 const c=saved.counters as Partial<Counters>|undefined;for(const key of Object.keys(s.counters) as (keyof Counters)[])s.counters[key]=Math.floor(finite(c?.[key],0,0,key==='foodKinds'?7:1e8));
 const project=saved.project as Partial<KeeperProject>|undefined;s.project={cycle:Math.floor(finite(project?.cycle,0,0,1e6)),started:finite(project?.started,s.hours,0,s.hours),calm:finite(project?.calm,0,0,100),baseline:counts()};
 for(const key of Object.keys(s.counters) as (keyof Counters)[])s.project.baseline[key]=finite(project?.baseline?.[key],s.counters[key],0,s.counters[key]);
 const nursery=saved.nursery as Partial<Nursery>|undefined;s.nursery=nursery&&Number.isInteger(nursery.type)&&(nursery.type??-1)>=0&&(nursery.type??4)<4?{type:nursery.type!,hours:finite(nursery.hours,0,0,12),ready:nursery.ready===true}:null;
 s.log=Array.isArray(saved.log)?saved.log.filter((v):v is {hour:number;text:string}=>!!v&&typeof v==='object'&&Number.isFinite(v.hour)&&typeof v.text==='string').slice(-30).map(v=>({hour:v.hour,text:v.text.slice(0,180)})):[];
 if(saved.version===1)record(s,'The keeper’s notebook is open: foods, equipment, observations and a nursery.');return s;
}
export function record(s:Aquarium,text:string){s.log.push({hour:s.hours,text});if(s.log.length>30)s.log.shift();}
export function addFish(s:Aquarium,type:number,n:number,growth=1){
 const p=species[type];if(!p||!Number.isInteger(n)||n<1||s.fish.length+n>35)return false;
 for(let i=0;i<n;i++){const id=s.fish.reduce((n,f)=>Math.max(n,f.id+1),0);s.fish.push({id,type,x:(Math.random()-.5)*11,y:p.zone+(Math.random()-.5)*.8,z:(Math.random()-.5)*4.4,vx:p.speed*(Math.random()>.5?1:-1),vy:0,vz:0,hunger:.43,health:100,phase:Math.random()*6.28,name:names[id%names.length]!,stress:growth<1?8:12,bond:0,growth,meals:0});}return true;
}
export function rehomeFish(s:Aquarium,id:number){
 const index=s.fish.findIndex(f=>f.id===id);if(index<0)return 'That fish is already with another keeper.';
 const f=s.fish[index]!,p=species[f.type]!;
 if(s.fish.filter(g=>g.type===f.type).length<=p.minSchool)return 'Keep a complete social group before rehoming a neighbour.';
 s.fish.splice(index,1);s.counters.rehomed++;record(s,`${f.name} joins another keeper’s aquarium. Space for a new generation.`);return `${f.name} has a new home with another keeper.`;
}
export function isDay(s:Aquarium){const hour=s.hours%24;return hour>=7&&hour<7+s.lightHours;}
export function comfort(s:Aquarium,f:Fish,counts?:readonly number[]){
 const p=species[f.type]!,school=counts?.[f.type]??s.fish.filter(g=>g.type===f.type).length;
 return clamp(100-Math.max(0,p.minSchool-school)*9-Math.max(0,11-s.plants)*1.5-Math.max(0,s.fish.length-(24+s.filter*5))*2-Math.max(0,s.lightHours-10)*5-(s.oxygen<6?(6-s.oxygen)*14:0),0,100);
}
export function harmony(s:Aquarium){const hungry=s.fish.reduce((a,f)=>a+f.hunger,0)/Math.max(1,s.fish.length),stress=s.fish.reduce((a,f)=>a+f.stress,0)/Math.max(1,s.fish.length);return clamp(100-s.ammonia*140-s.nitrite*190-Math.max(0,s.nitrate-25)*1.3-Math.max(0,6-s.oxygen)*15-Math.abs(s.temp-25)*5-hungry*14-s.algae*10-stress*.035,0,100);}
export function feed(s:Aquarium,x=0,z=0,kind:FoodKind=s.foodKind){
 const n=kind==='greens'?3:8;if(s.pellets.length+n>48)return false;
 for(let i=0;i<n;i++)s.pellets.push({x:x+(Math.random()-.5)*1.2,y:5.65-Math.random()*.12,z:z+(Math.random()-.5)*1.1,age:0,kind});
 s.fed++;s.counters.meals++;s.counters.foodKinds|=1<<(['flakes','sinking','greens'] as const).indexOf(kind);return true;
}
export function waterChange(s:Aquarium){s.ammonia*=.7;s.nitrite*=.7;s.nitrate*=.7;s.food*=.7;s.oxygen=Math.min(8.4,s.oxygen+.6);s.changed++;record(s,'Fresh water: dissolved waste is diluted. The filter’s bacteria stay.');}
export function upgrade(s:Aquarium,kind:'filter'|'aerator'){
 const level=s[kind];if(level>=2)return 'This equipment is already fully upgraded.';
 const cost=kind==='filter'?[24,48][level]!:[18,36][level]!;
 if(s.wonder<cost)return `This upgrade needs ${cost} Wonder.`;
 s.wonder-=cost;s[kind]++;record(s,`${kind==='filter'?'Biological filter':'Air return'} upgraded to level ${s[kind]+1}.`);return kind==='filter'?'More filter media. Bacteria gain room to process waste.':'A gentler, richer flow of oxygen. The shrimp approve.';
}
export function rinseFilter(s:Aquarium){if(s.filterDirt<.08)return 'The filter is already flowing freely.';s.filterDirt=Math.max(0,s.filterDirt-.7);s.counters.rinsed++;record(s,'Filter sponge rinsed in old tank water; bacteria preserved.');return 'Filter rinsed in old tank water. Flow restored; bacteria preserved.';}
export function trimPlants(s:Aquarium){if(s.plantGrowth<.6)return 'Let the stems mature before taking cuttings.';if(s.cuttings>=20)return 'The cutting basket is full. Plant some before trimming again.';s.plantGrowth-=.45;s.cuttings=Math.min(20,s.cuttings+2);s.counters.trimmed++;record(s,'Two healthy cuttings saved from a careful trim.');return 'Two cuttings saved. Your next plants can come from this tank.';}
export function plantAquarium(s:Aquarium){if(s.plants>=36)return 'The planting is full. Leave open swimming space.';if(!s.cuttings&&s.wonder<8)return 'A plant costs 8 Wonder. Happy fish earn more.';if(s.cuttings)s.cuttings--;else s.wonder-=8;s.plants++;s.plantGrowth=Math.max(0,s.plantGrowth-.035);return 'A new plant takes root. More habitat, less nitrate.';}
export function nurseryNeeds(s:Aquarium,type:number){
 const p=species[type];if(!p)return 'Choose a fish species.';
 if(s.fish.length>33)return 'Leave space for two juveniles (33 fish or fewer).';
 if(s.fish.filter(f=>f.type===type&&f.growth>.9).length<Math.max(2,p.minSchool))return 'A settled adult pair or complete school is needed.';
 if(s.plants<11)return 'Grow at least 11 plants for sheltered eggs.';
 if(s.filter<1)return 'Add the first biological filter upgrade.';
 if(harmony(s)<82)return 'Reach 82% harmony before preparing a nursery.';
 return '';
}
export function startNursery(s:Aquarium,type:number){if(s.nursery)return 'A nursery is already being tended.';const need=nurseryNeeds(s,type);if(need)return need;if(s.wonder<18)return 'The nursery needs 18 Wonder.';s.wonder-=18;s.nursery={type,hours:0,ready:false};record(s,`A sheltered ${species[type]!.name.toLowerCase()} nursery is prepared.`);return 'Eggs sheltered among the leaves. Keep the water calm for 12 tank hours.';}
export function welcomeFry(s:Aquarium){if(!s.nursery?.ready)return 'The nursery needs more calm tank hours.';if(s.fish.length>33)return 'Leave space for two juveniles.';const type=s.nursery.type;addFish(s,type,2,.32);s.counters.bred+=2;s.nursery=null;record(s,`Two young ${species[type]!.name.toLowerCase()} join their school.`);return 'Two juveniles join the school. Watch them grow with good care.';}
export function observe(s:Aquarium,key:string){if(!guide.some(g=>g.key===key)||s.observed.includes(key))return false;s.observed.push(key);s.wonder+=3;record(s,`Field guide: ${guide.find(g=>g.key===key)?.name??key} observed. +3 Wonder.`);return true;}
export const guide=[
 ...species.map((p,i)=>({key:'fish-'+i,name:p.name,detail:i===2?'Bottom forager; offer sinking pellets.':i===3?'Likes leaf cover, quiet water and surface flakes.':'Keep a complete school, leaf cover and small flake meals.'})),
 {key:'Cherry shrimp',name:'Cherry shrimp',detail:'Browses biofilm. Algae wafers support the clean-up crew.'},
 {key:'Amano shrimp',name:'Amano shrimp',detail:'An energetic grazer of algae, soft debris and wafers.'},
 {key:'Nerite snail',name:'Nerite snail',detail:'Grazes glass and leaves; a little biofilm is useful habitat.'},
 {key:'Ramshorn snail',name:'Ramshorn snail',detail:'Browses the substrate and fallen food around plants.'},
 {key:'Mayfly nymph',name:'Mayfly nymph',detail:'A freshwater insect exploring the planted substrate.'},
 {key:'Water boatman',name:'Water boatman',detail:'Paddles through the water column and rests near the surface.'},
];
export function milestoneList(s:Aquarium){return [
 {id:'observer',title:'Every neighbour has a name',detail:'Observe 6 different species',progress:s.observed.length,target:6,reward:20},
 {id:'botanist',title:'A garden that gives back',detail:'Take cuttings from mature stems',progress:s.counters.trimmed,target:1,reward:18},
 {id:'engineer',title:'A little room to breathe',detail:'Upgrade both filter and air return',progress:Math.min(1,s.filter)+Math.min(1,s.aerator),target:2,reward:22},
 {id:'nursery',title:'A smaller kind of wonder',detail:'Welcome two home-raised juveniles',progress:s.counters.bred,target:2,reward:35},
 {id:'naturalist',title:'The complete field guide',detail:'Observe every species in the tank',progress:s.observed.length,target:guide.length,reward:30},
 {id:'steward',title:'Room for the next generation',detail:'Rehome two fish while keeping social groups',progress:s.counters.rehomed,target:2,reward:15},
 {id:'reverie',title:'Ordinary impossibilities',detail:'Awaken all three dreams',progress:s.dreams,target:3,reward:40},
 ];}
export function claimMilestone(s:Aquarium,id:string){const m=milestoneList(s).find(m=>m.id===id);if(!m||s.milestones.includes(id)||m.progress<m.target)return false;s.milestones.push(id);s.wonder+=m.reward;record(s,`${m.title}. +${m.reward} Wonder.`);return true;}
export function projectInfo(s:Aquarium){
 const b=s.project.baseline,stage=s.project.cycle%4;
 const titles=['A meal at every depth','The cutting exchange','An unhurried morning','A new generation'];
 const details=['Serve all three foods, then let harmony reach 85%.','Take two fresh cuttings from a mature planting.','Keep harmony at 85% for four tank hours.','Raise two juveniles in the sheltered nursery.'];
 const kinds=s.counters.foodKinds;
 const progress=stage===0?((kinds&1?1:0)+(kinds&2?1:0)+(kinds&4?1:0)):stage===1?s.counters.trimmed-b.trimmed:stage===2?s.project.calm:s.counters.bred-b.bred;
 const target=stage===0?3:stage===1?1:stage===2?4:2;
 return {title:titles[stage]!,detail:details[stage]!,progress:Math.max(0,progress),target,reward:24+Math.min(24,Math.floor(s.project.cycle/4)*4),ready:progress>=target&&(stage!==0||harmony(s)>=85)};
}
export function claimProject(s:Aquarium){const p=projectInfo(s);if(!p.ready)return false;s.wonder+=p.reward;s.project={cycle:s.project.cycle+1,baseline:{...s.counters},started:s.hours,calm:0};s.counters.foodKinds=0;s.project.baseline.foodKinds=0;record(s,`Keeper project complete: ${p.title}. +${p.reward} Wonder.`);return true;}
export function advice(s:Aquarium){
 if(s.ammonia>.07||s.nitrite>.05)return 'Change some water; pause feeding until waste falls.';
 if(s.oxygen<6)return 'Oxygen is low. Upgrade the air return and clear leftover food.';
 if(s.filterDirt>.65)return 'Rinse the filter sponge in old tank water to restore flow.';
 if(s.fish.some(f=>f.type===2&&f.hunger>.6))return 'The corys are hungry. Try a small sinking-pellet meal.';
 if(s.fish.reduce((a,f)=>a+f.hunger,0)/s.fish.length>.65)return 'Offer a small meal; watch who reaches the food.';
 if(s.lightHours>10&&s.algae>.25)return 'Shorten the light period. Long days encourage algae.';
 if(s.nursery?.ready)return 'The nursery is ready. Welcome the juveniles in the notebook.';
 if(s.plantGrowth>=.6)return 'Stems are ready for a careful trim and free cuttings.';
 if(s.nursery)return 'Eggs are developing among the leaves. Calm water helps them hatch.';
 return 'The tank is settled. Observe its residents or work on a keeper project.';
}
export function advance(s:Aquarium,seconds:number,speed:number){
 const h=seconds*speed/80;if(h<=0)return;s.hours+=h;const light=isDay(s)?1:0,load=s.fish.length/19;
 s.filterDirt=clamp(s.filterDirt+h*(.0025*load+s.food*.018),0,1);
 const efficiency=(1+s.filter*.42)*(1-s.filterDirt*.58),production=.022*load+s.food*.16;
 const convert=Math.min(s.ammonia+h*production,s.bacteria*.16*efficiency*h),convert2=Math.min(s.nitrite+convert*.8,s.bacteria*.14*efficiency*h);
 s.ammonia=Math.max(0,s.ammonia+production*h-convert);s.nitrite=Math.max(0,s.nitrite+convert*.8-convert2);s.nitrate=Math.max(0,s.nitrate+convert2*3.2-s.plants*.005*(.55+s.plantGrowth*.45)*light*h);
 s.bacteria=clamp(s.bacteria+h*.008,0,1.2+s.filter*.12);s.food=Math.max(0,s.food-h*(.08+s.crewEnergy*.035));
 s.oxygen=clamp(s.oxygen+h*((7.7-s.oxygen)*(.35+s.aerator*.22)+s.plants*.014*light-.12*load-s.food*.15),2,9);
 s.algae=clamp(s.algae+h*(light*.012+s.nitrate*.0003-.007-s.plants*.0005-s.crewEnergy*.002),0,1);
 s.crewEnergy=clamp(s.crewEnergy+h*(s.algae>.04||s.food>.04?.018:-.008),.1,1);
 s.plantGrowth=clamp(s.plantGrowth+h*(light?(s.nitrate>1?.022:.009):-.002),0,1);
 s.ph=clamp(s.ph+(6.9-s.ph)*h*.03-s.food*h*.001,5.8,8);
 const quality=harmony(s);if(quality>80){s.wonder+=h*(3.2+s.observed.length*.04);s.healthy+=seconds*speed;}
 const schools=[0,0,0,0];for(const f of s.fish)schools[f.type]!++;
 for(const f of s.fish){f.hunger=clamp(f.hunger+h*.035,0,1);const desired=clamp(100-comfort(s,f,schools)-f.bond*.04+Math.max(0,75-quality)*.6+Math.max(0,f.hunger-.7)*35,0,100);f.stress=clamp(f.stress+(desired-f.stress)*Math.min(1,h*.22),0,100);f.health=clamp(f.health+h*(quality>65?.15:-.4),12,100);f.growth=clamp(f.growth+h*(quality>75&&f.hunger<.7?.014:.003),.3,1);}
 if(quality>=85)s.project.calm+=h;
 if(s.nursery&&!s.nursery.ready&&quality>=82&&s.oxygen>=6&&s.plants>=11){s.nursery.hours=Math.min(12,s.nursery.hours+h);if(s.nursery.hours>=12){s.nursery.ready=true;record(s,'The nursery has hatched. Two juveniles are ready to join their school.');}}
}

export function swim(s:Aquarium,dt:number,t:number){
 for(let i=s.pellets.length-1;i>=0;i--){const p=s.pellets[i];p.age+=dt;p.y=Math.max(.25,p.y-dt*foods[p.kind].sink);if(p.kind==='greens'&&p.y<.5){s.crewEnergy=clamp(s.crewEnergy+dt*.02,0,1);p.age+=dt*.8;}if(p.age>(p.kind==='greens'?70:45)){s.food+=p.kind==='greens'?.025:.04;s.pellets.splice(i,1);}}
 for(const f of s.fish){const p=species[f.type];let ax=-f.x*.025,ay=(p.zone+Math.sin(t*.28+f.phase)*.5-f.y)*.24,az=-f.z*.06;let nearest:Pellet|undefined;let best=100;
  if(f.hunger>.12)for(const pellet of s.pellets){if(pellet.kind==='greens'&&f.hunger<.8)continue;const preference=pellet.kind===p.food?1:2.8;const d=preference*((pellet.x-f.x)**2+(pellet.y-f.y)**2+(pellet.z-f.z)**2);if(d<best){best=d;nearest=pellet;}}
  if(nearest&&best<70){ax+=(nearest.x-f.x)*.7;ay+=(nearest.y-f.y)*.7;az+=(nearest.z-f.z)*.7;if(best<.16){const n=s.pellets.indexOf(nearest);if(n>=0)s.pellets.splice(n,1);f.hunger=Math.max(0,f.hunger-.22);f.bond=clamp(f.bond+(nearest.kind===p.food?3:1),0,100);f.meals++;s.wonder+=.16;}}
  else {ax+=Math.sin(t*.37+f.phase)*.12;az+=Math.cos(t*.24+f.phase)*.13+(1.6-f.z)*.018*f.bond/100;}
  for(const g of s.fish){if(g===f)continue;const dx=g.x-f.x,dy=g.y-f.y,dz=g.z-f.z;const d=dx*dx+dy*dy+dz*dz;if(d<.38&&d>.001){ax-=dx/(d+.1)*.22;ay-=dy/(d+.1)*.2;az-=dz/(d+.1)*.22;}else if(g.type===f.type&&p.school&&d<12&&!nearest){ax+=dx*.012+(g.vx-f.vx)*.08;ay+=dy*.01;az+=dz*.012+(g.vz-f.vz)*.08;}}
  if(Math.abs(f.x)>5.8)ax-=Math.sign(f.x)*(Math.abs(f.x)-5.8)*1.5;if(Math.abs(f.z)>2.2)az-=Math.sign(f.z)*(Math.abs(f.z)-2.2)*1.5;if(f.y>5.3)ay-=(f.y-5.3)*2;if(f.y<.4)ay+=(.4-f.y)*2;
  // The large central stones are steering obstacles, not invisible swim-throughs.
  const ox=f.x-.4,oz=f.z+.4;const od=ox*ox+oz*oz;if(f.y<1.8&&od<2.1){ax+=ox*.7;az+=oz*.7;ay+=.3;}
  f.vx+=ax*dt;f.vy+=ay*dt;f.vz+=az*dt;const v=Math.sqrt(f.vx*f.vx+f.vy*f.vy+f.vz*f.vz);const cap=p.speed*(nearest?1.8:1.1)*(1-f.stress*.002);if(v>cap){f.vx*=cap/v;f.vy*=cap/v;f.vz*=cap/v;}if(v<.12)f.vx+=.1*dt;f.x=clamp(f.x+f.vx*dt,-6.5,6.5);f.y=clamp(f.y+f.vy*dt,.28,5.6);f.z=clamp(f.z+f.vz*dt,-2.65,2.65);
 }
}
