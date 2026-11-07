// Persistent microhabitats and freshwater residents. Time is measured in tank hours.
import type {Aquarium} from './simulation.js';
export type HabitatKind='bare'|'moss'|'leaves'|'cave';
export interface Habitat{kind:HabitatKind;maturity:number;}
export interface Neighbour{id:number;type:number;growth:number;energy:number;moult:number;rest:number;}
export interface Ecology{habitats:Habitat[];colony:Neighbour[];nextId:number;brood:{hours:number;ready:boolean}|null;born:number;shared:number;moults:number;notes:string[];}
export const habitats:Record<HabitatKind,{name:string;cost:number;detail:string}>={
 bare:{name:'Open gravel',cost:0,detail:'Open foraging ground. No shelter bonus; no upkeep.'},
 moss:{name:'Moss garden',cost:12,detail:'Grows into shelter for moulting shrimp and shrimplets. Mature at 35%.'},
 leaves:{name:'Leaf litter',cost:6,detail:'A slow food source for snails and nymphs. Decomposes over 48 tank hours; adds a little waste.'},
 cave:{name:'Pebble refuge',cost:16,detail:'Permanent shelter for resting grazers. Moss provides the finer cover needed for a shrimp brood.'},
};
export const habitatPositions=[{x:-4.7,z:1.35},{x:0,z:1.65},{x:4.7,z:1.35}];
export const neighbours=[
 {name:'Cherry shrimp',kind:'shrimp' as const,detail:'A freshwater breeder. Moss shelters its soft shell and young.'},
 {name:'Amano shrimp',kind:'shrimp' as const,detail:'An energetic grazer. Its larvae need brackish water, so it does not breed here.'},
 {name:'Nerite snail',kind:'snail' as const,detail:'A glass grazer. Its young cannot develop in this freshwater tank.'},
 {name:'Ramshorn snail',kind:'snail' as const,detail:'Browses fallen food, biofilm and soft leaf litter.'},
 {name:'Mayfly nymph',kind:'insect' as const,detail:'Browses leaf litter and rests in the planted shallows.'},
 {name:'Water boatman',kind:'insect' as const,detail:'Rows to the surface to renew its air supply.'},
];
export const fieldNotes=[
 {id:'meal',title:'A table on the tank floor',hint:'Watch a shrimp or snail browsing a sunken algae wafer.'},
 {id:'night',title:'After the lights fade',hint:'Visit a resting snail or nymph during the tank’s real night.'},
 {id:'moult',title:'A softer suit of armour',hint:'Visit a shrimp recovering from a moult. A refuge helps.'},
 {id:'young',title:'A world inside the moss',hint:'Visit a home-raised shrimplet before it is fully grown.'},
];
const bound=(v:unknown,d:number,a:number,b:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;
export function newEcology():Ecology{
 const types=[0,0,0,0,1,1,1,2,3,3,4,4,5];
 return {habitats:Array.from({length:3},()=>({kind:'bare',maturity:0})),colony:types.map((type,id)=>({id,type,growth:1,energy:.8,moult:id*1.3,rest:0})),nextId:13,brood:null,born:0,shared:0,moults:0,notes:[]};
}
export function restoreEcology(raw:unknown):Ecology{
 const e=newEcology();if(!raw||typeof raw!=='object')return e;const v=raw as Partial<Ecology>;
 if(Array.isArray(v.habitats))e.habitats=e.habitats.map((d,i)=>{const h=v.habitats?.[i];return h&&Object.hasOwn(habitats,h.kind)?{kind:h.kind,maturity:bound(h.maturity,0,0,1)}:d;});
 if(Array.isArray(v.colony)&&v.colony.length){const ids=new Set<number>();const restored:Neighbour[]=[];for(const n of v.colony.slice(0,24)){if(!n||!Number.isInteger(n.type)||n.type<0||n.type>=neighbours.length)continue;let id=Math.floor(bound(n.id,restored.length,0,1e8));while(ids.has(id))id++;ids.add(id);restored.push({id,type:n.type,growth:bound(n.growth,1,.3,1),energy:bound(n.energy,.8,.1,1),moult:bound(n.moult,0,0,20),rest:bound(n.rest,0,0,1.5)});}if(restored.length)e.colony=restored;}
 e.nextId=Math.max(...e.colony.map(n=>n.id+1),Math.floor(bound(v.nextId,13,0,1e8)));
 for(const key of ['born','shared','moults'] as const)e[key]=Math.floor(bound(v[key],0,0,1e8));
 e.notes=Array.isArray(v.notes)?[...new Set(v.notes.filter(n=>fieldNotes.some(f=>f.id===n)))]:[];
 e.brood=v.brood&&typeof v.brood==='object'?{hours:bound(v.brood.hours,0,0,16),ready:v.brood.ready===true}:null;return e;
}
function log(s:Aquarium,text:string){s.log.push({hour:s.hours,text});if(s.log.length>30)s.log.shift();}
export function setHabitat(s:Aquarium,slot:number,kind:HabitatKind){
 const h=s.ecology.habitats[slot];if(!h||!Object.hasOwn(habitats,kind))return 'Choose a habitat and a bed.';
 if(h.kind===kind&&!(kind==='leaves'&&h.maturity<.5))return 'That habitat is already in place.';
 const p=habitats[kind];if(s.wonder<p.cost)return `This habitat needs ${p.cost} Wonder.`;
 s.wonder-=p.cost;h.kind=kind;h.maturity=kind==='moss'?.15:kind==='bare'?0:1;log(s,`${['Left','Middle','Right'][slot]} bed: ${p.name.toLowerCase()}.`);return `${p.name} placed in the ${['left','middle','right'][slot]} bed.`;
}
export function shelter(e:Ecology){return e.habitats.reduce((n,h)=>n+(h.kind==='cave'?1:h.kind==='moss'?h.maturity:0),0);}
export function broodNeeds(s:Aquarium,quality:number){
 if(s.ecology.colony.filter(n=>n.type<2).length>11)return 'Share grown shrimp first; leave room for two (13 shrimp maximum).';
 if(s.ecology.colony.filter(n=>n.type===0&&n.growth>=.95).length<4)return 'Keep four adult cherry shrimp in the colony.';
 if(!s.ecology.habitats.some(h=>h.kind==='moss'&&h.maturity>=.35))return 'Grow a moss bed to 35% maturity.';
 if(s.oxygen<6||quality<82)return 'Keep oxygen above 6 and harmony at 82%.';
 if(s.ecology.colony.filter(n=>n.type===0).some(n=>n.energy<.5))return 'The cherry shrimp need more energy. Offer a small wafer.';
 return '';
}
export function startBrood(s:Aquarium,quality:number){
 if(s.ecology.brood)return 'A shrimp brood is already sheltered.';const need=broodNeeds(s,quality);if(need)return need;
 if(s.wonder<12)return 'Sheltering a brood needs 12 Wonder.';s.wonder-=12;s.ecology.brood={hours:0,ready:false};log(s,'A cherry shrimp brood is sheltered in the moss.');return 'Keep the moss and water settled for 16 tank hours.';
}
export function welcomeShrimp(s:Aquarium){
 if(!s.ecology.brood?.ready)return 'The shrimp brood needs more settled tank hours.';
 if(s.ecology.colony.filter(n=>n.type<2).length>11)return 'Leave space for two shrimplets.';
 for(let i=0;i<2;i++)s.ecology.colony.push({id:s.ecology.nextId++,type:0,growth:.32,energy:.85,moult:0,rest:0});s.ecology.born+=2;s.ecology.brood=null;log(s,'Two tiny cherry shrimp begin life in the moss.');return 'Two shrimplets welcomed. Fine moss gives them a safe start.';
}
export function shareShrimp(s:Aquarium){
 const adults=s.ecology.colony.filter(n=>n.type===0&&n.growth>=.95);if(adults.length<6)return 'Keep four adult cherry shrimp; two additional adults can be shared.';
 const ids=new Set(adults.slice(-2).map(n=>n.id));s.ecology.colony=s.ecology.colony.filter(n=>!ids.has(n.id));s.ecology.shared+=2;log(s,'Two grown cherry shrimp join another keeper’s colony.');return 'Two grown shrimp shared. Space for the next brood.';
}
export function crewActivity(s:Aquarium,n:Neighbour,day:boolean){
 if(n.type<2&&n.rest>0)return 'Recovering from a moult';
 if(n.growth<.95)return 'Growing among the moss';
 if(s.pellets.some(p=>p.kind==='greens'&&p.y<1.2)&&n.type<4)return 'Browsing a wafer';
 if(!day&&(n.type===3||n.type===4))return 'Resting in the shallows';
 if(n.type===5)return 'Paddling for air';if(n.type===2)return 'Grazing the glass';
 if(n.type===4||n.type===3)return s.ecology.habitats.some(h=>h.kind==='leaves'&&h.maturity>0)?'Browsing leaf litter':'Browsing the gravel';
 return n.energy<.3?'Searching for food':s.ecology.habitats.some(h=>h.kind==='moss')?'Grazing the moss':'Picking through the gravel';
}
export function noteFor(s:Aquarium,n:Neighbour,day:boolean){
 const activity=crewActivity(s,n,day);return activity==='Recovering from a moult'?'moult':n.growth<.95?'young':activity==='Browsing a wafer'?'meal':activity==='Resting in the shallows'?'night':null;
}
export function recordBehaviour(s:Aquarium,id:number,day:boolean){
 const n=s.ecology.colony.find(n=>n.id===id);if(!n)return 'Choose a resident to watch.';const note=noteFor(s,n,day);
 if(!note)return 'Watch for a meal, night rest, a moult or a shrimplet.';
 if(s.ecology.notes.includes(note))return 'This behavior is already in your field notes.';
 s.ecology.notes.push(note);s.wonder+=5;log(s,`Field note: ${fieldNotes.find(f=>f.id===note)!.title}. +5 Wonder.`);return 'Behavior recorded in the field notes. +5 Wonder.';
}
export function advanceEcology(s:Aquarium,h:number,quality:number,day:boolean){
 const e=s.ecology;
 for(const bed of e.habitats){if(bed.kind==='moss')bed.maturity=Math.min(1,bed.maturity+h*(day?.025:.004));if(bed.kind==='leaves'&&bed.maturity>0){bed.maturity=Math.max(0,bed.maturity-h/48);s.food+=h*.002;}}
 const cover=shelter(e),leaf=e.habitats.some(h=>h.kind==='leaves'&&h.maturity>0),moss=e.habitats.reduce((v,h)=>v+(h.kind==='moss'?h.maturity:0),0);
 for(const n of e.colony){const food=s.algae>.04||s.food>.04||leaf||moss>.25;
  n.energy=Math.max(.1,Math.min(1,n.energy+h*(food?.012:-.008)));
  if(n.type<2){n.rest=Math.max(0,n.rest-h);n.moult+=h;if(n.moult>=20){n.moult%=20;n.rest=1.5;e.moults++;}if(n.growth<1)n.growth=Math.min(1,n.growth+h*(quality>=80&&n.energy>.4&&cover>.3?.022:.004));}
 }
 if(e.brood&&!e.brood.ready&&!broodNeeds(s,quality)){e.brood.hours=Math.min(16,e.brood.hours+h);if(e.brood.hours>=16){e.brood.ready=true;log(s,'Tiny cherry shrimp are ready to leave their sheltered brood.');}}
 s.crewEnergy=e.colony.reduce((v,n)=>v+n.energy,0)/Math.max(1,e.colony.length);
}
