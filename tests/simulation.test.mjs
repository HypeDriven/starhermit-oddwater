import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newAquarium,restoreAquarium,feed,swim,advance,waterChange,upgrade,rinseFilter,plantAquarium,trimPlants,startNursery,welcomeFry,nurseryNeeds,observe,completeProject,projectInfo,milestoneList,comfort,quirk,isDay,addFish} from '../src/simulation.ts';
const copy=s=>JSON.parse(JSON.stringify(s));
test('a v1 aquarium migrates without losing fish or plants, and drops Wonder, dreams and claims',()=>{
 const before=newAquarium();before.wonder=137;before.plants=14;before.dreams=2;before.claimed=[0,2];before.fish[0].health=73;
 const old=copy(before);old.version=1;
 for(const k of ['filter','aerator','filterDirt','lightHours','foodKind','plantGrowth','cuttings','crewEnergy','observed','milestones','counters','project','nursery','log'])delete old[k];
 for(const f of old.fish)for(const k of ['name','stress','bond','growth','meals'])delete f[k];
 const after=restoreAquarium(old);assert.equal(after.version,4);assert.equal(after.plants,14);for(const k of ['wonder','dreams','claimed','milestones'])assert.equal(k in after,false,k);assert.equal(after.fish.length,19);assert.equal(after.fish[0].health,73);assert.equal(after.fish[0].growth,1);assert.ok(after.fish.every(f=>f.name&&Number.isFinite(f.stress)));
});
test('new progression, juvenile growth and nursery progress survive a save round trip',()=>{
 const s=newAquarium();s.filter=1;s.aerator=2;s.cuttings=3;s.observed=['fish-0','Cherry shrimp'];s.nursery={type:0,hours:4.5,ready:false};s.fish[0].name='Tiny comet';s.fish[0].growth=.43;s.project.cycle=2;s.project.calm=1.25;
 const restored=restoreAquarium(copy(s));for(const key of ['filter','aerator','cuttings','observed','nursery','project'])assert.deepEqual(restored[key],s[key]);assert.equal(restored.fish[0].name,'Tiny comet');assert.equal(restored.fish[0].growth,.43);assert.equal(restored.pellets.length,0);
});
test('food choice changes sinking rate, and reaching the food increases trust',()=>{
 const flakes=newAquarium(),pellets=newAquarium();flakes.fish.forEach(f=>f.hunger=0);pellets.fish.forEach(f=>f.hunger=0);feed(flakes,0,0,'flakes');feed(pellets,0,0,'sinking');swim(flakes,2,0);swim(pellets,2,0);assert.ok(pellets.pellets[0].y<flakes.pellets[0].y-.5);
 const s=newAquarium(),f=s.fish.find(f=>f.type===2);s.fish=[f];f.hunger=.8;s.pellets=[{x:f.x,y:f.y,z:f.z,age:0,kind:'sinking'}];swim(s,.01,0);assert.equal(f.meals,1);assert.equal(f.bond,3);assert.equal(s.pellets.length,0);assert.ok(f.hunger<.8);
});
test('the food cap refuses extra portions without advancing meal or project counters',()=>{
 const s=newAquarium();for(let i=0;i<6;i++)assert.ok(feed(s));assert.equal(s.pellets.length,48);const meals=s.counters.meals;assert.equal(feed(s,0,0,'greens'),false);assert.equal(s.counters.meals,meals);
});
test('filter and air upgrades are free, capped and improve their actual ecosystem functions',()=>{
 const base=newAquarium(),improved=restoreAquarium(copy(base));base.ammonia=improved.ammonia=.3;base.oxygen=improved.oxygen=4.5;upgrade(improved,'filter');upgrade(improved,'aerator');assert.equal(improved.filter,1);assert.equal(improved.aerator,1);advance(base,80,1);advance(improved,80,1);assert.ok(improved.ammonia<base.ammonia);assert.ok(improved.oxygen>base.oxygen);
 improved.filter=2;assert.match(upgrade(improved,'filter'),/fully upgraded/);assert.equal(improved.filter,2);
});
test('a careful filter rinse restores flow while retaining bacteria',()=>{
 const s=newAquarium();s.filterDirt=.85;const bacteria=s.bacteria;rinseFilter(s);assert.ok(s.filterDirt<.2);assert.equal(s.bacteria,bacteria);assert.equal(s.counters.rinsed,1);
});
test('planting uses saved cuttings first and respects the plant limit',()=>{
 const s=newAquarium();s.plantGrowth=.8;trimPlants(s);assert.equal(s.cuttings,2);const count=s.plants;plantAquarium(s);assert.equal(s.plants,count+1);assert.equal(s.cuttings,1);s.cuttings=0;plantAquarium(s);assert.equal(s.plants,count+2);s.cuttings=1;trimPlants(s);assert.equal(s.cuttings,1);s.plants=36;plantAquarium(s);assert.equal(s.cuttings,1);
});
test('the nursery enforces habitat, school and water prerequisites',()=>{
 const s=newAquarium();assert.match(startNursery(s,0),/11 plants/);assert.equal(s.nursery,null);s.plants=11;assert.match(nurseryNeeds(s,0),/filter upgrade/);s.filter=1;assert.equal(nurseryNeeds(s,0),'');s.ammonia=.5;assert.match(nurseryNeeds(s,0),/82%/);s.ammonia=.01;assert.match(nurseryNeeds(s,3),/adult pair/);
});
test('nursery development pauses in poor water, then produces exactly two growing juveniles',()=>{
 const s=newAquarium();s.plants=11;s.filter=1;startNursery(s,0);assert.ok(s.nursery);s.ammonia=1;advance(s,8,1);assert.equal(s.nursery.hours,0);s.ammonia=.01;
 for(let i=0;i<125;i++)advance(s,8,1);assert.equal(s.nursery.ready,true);const before=s.fish.length;welcomeFry(s);assert.equal(s.fish.length,before+2);assert.equal(s.counters.bred,2);assert.equal(s.nursery,null);welcomeFry(s);assert.equal(s.fish.length,before+2);
 const juvenile=s.fish.at(-1);assert.equal(juvenile.growth,.32);juvenile.hunger=.1;advance(s,80,1);assert.ok(juvenile.growth>.32);assert.equal(restoreAquarium(copy(s)).fish.at(-1).growth,juvenile.growth);
});
test('observations, milestones and projects complete once',()=>{
 const s=newAquarium();assert.equal(observe(s,'fish-0'),true);assert.equal(observe(s,'fish-0'),false);
 const observer=()=>milestoneList(s).find(m=>m.id==='observer');assert.ok(observer().progress<observer().target);
 for(const key of ['fish-1','fish-2','fish-3','Cherry shrimp','Amano shrimp'])observe(s,key);
 assert.ok(observer().progress>=observer().target);assert.equal(milestoneList(s).some(m=>m.id==='reverie'),false);
 feed(s,0,0,'flakes');feed(s,0,0,'sinking');feed(s,0,0,'greens');assert.equal(projectInfo(s).ready,true);assert.equal(completeProject(s),true);assert.equal(s.project.cycle,1);assert.equal(completeProject(s),false);
});
test('social schools and plant shelter affect comfort and stress',()=>{
 const good=newAquarium(),lonely=newAquarium();good.plants=14;lonely.fish=lonely.fish.filter(f=>f.type!==0||f===lonely.fish[0]);assert.ok(comfort(good,good.fish[0])>comfort(lonely,lonely.fish[0]));advance(good,160,1);advance(lonely,160,1);assert.ok(lonely.fish[0].stress>good.fish[0].stress);
});
test('light schedules have real nights, and paused time does not progress care',()=>{
 const s=newAquarium();s.hours=7;assert.equal(isDay(s),true);s.hours=15;assert.equal(isDay(s),false);s.lightHours=12;assert.equal(isDay(s),true);const before=copy(s);advance(s,800,0);assert.deepEqual(s,before);
});
test('capacity constraints keep purchases and nurseries within tank limits',()=>{
 const s=newAquarium();assert.equal(addFish(s,0,17),false);assert.equal(s.fish.length,19);assert.equal(addFish(s,0,16),true);assert.equal(s.fish.length,35);s.plants=15;s.filter=1;assert.match(nurseryNeeds(s,0),/space/);
});
test('long simulated care stays finite and preserves water-change dilution',()=>{
 const s=newAquarium();for(let i=0;i<500;i++){advance(s,8,20);swim(s,.05,i*.05);if(i%50===0)waterChange(s);}for(const key of ['ammonia','nitrite','nitrate','oxygen','filterDirt','plantGrowth','crewEnergy'])assert.ok(Number.isFinite(s[key]),key);assert.ok(s.fish.every(f=>f.health>=12&&f.health<=100&&f.stress>=0&&f.stress<=100));s.nitrate=20;waterChange(s);assert.equal(s.nitrate,14);
});
test('rehoming makes space, preserves a social group and keeps new fish IDs distinct',async()=>{
 const {rehomeFish}=await import('../src/simulation.ts');const s=newAquarium();const first=s.fish[0];rehomeFish(s,first.id);assert.equal(s.fish.length,18);assert.equal(s.counters.rehomed,1);const second=s.fish.find(f=>f.type===0);rehomeFish(s,second.id);assert.equal(s.fish.filter(f=>f.type===0).length,6);const third=s.fish.find(f=>f.type===0);assert.match(rehomeFish(s,third.id),/social group/);assert.equal(s.fish.length,17);addFish(s,0,2,.32);assert.equal(new Set(s.fish.map(f=>f.id)).size,s.fish.length);assert.equal(restoreAquarium(copy(s)).counters.rehomed,2);
});
test('school quirks are steady per fish, bounded and not all alike',()=>{
 const values=[0,1,2,3,4,5,6,7].map(id=>quirk(id,1));assert.ok(values.every(v=>v>=-1&&v<=1));assert.equal(quirk(3,1),quirk(3,1));assert.ok(new Set(values.map(v=>v.toFixed(3))).size>6);
});
