import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newAquarium,restoreAquarium,advance,harmony,isDay,swim} from '../src/simulation.ts';
import {setHabitat,startBrood,welcomeShrimp,shareShrimp,recordBehaviour,crewActivity,noteFor,broodNeeds} from '../src/ecology.ts';
const copy=s=>JSON.parse(JSON.stringify(s));
const step=(s,hours)=>{for(let t=0;t<hours;t+=.1)advance(s,8,1);};
const settled=()=>{const s=newAquarium();s.wonder=200;setHabitat(s,0,'moss');s.ecology.habitats[0].maturity=.8;return s;};
test('habitats charge only successful changes and leaf litter can be renewed when depleted',()=>{
 const s=newAquarium();setHabitat(s,0,'moss');assert.equal(s.wonder,20);setHabitat(s,0,'moss');assert.equal(s.wonder,20);
 setHabitat(s,1,'cave');assert.equal(s.wonder,4);assert.match(setHabitat(s,2,'leaves'),/needs 6/);assert.equal(s.ecology.habitats[2].kind,'bare');
 assert.match(setHabitat(s,4,'moss'),/Choose/);assert.match(setHabitat(s,0,'toString'),/Choose/);s.wonder=30;setHabitat(s,2,'leaves');setHabitat(s,2,'leaves');assert.equal(s.wonder,24);s.ecology.habitats[2].maturity=.1;setHabitat(s,2,'leaves');assert.equal(s.wonder,18);assert.equal(s.ecology.habitats[2].maturity,1);
});
test('moss grows, leaves decay and feed real residents; pause freezes the whole ecology',()=>{
 const bare=newAquarium(),garden=newAquarium();garden.wonder=100;setHabitat(garden,0,'moss');setHabitat(garden,1,'leaves');const before=copy(garden);advance(garden,8000,0);assert.deepEqual(garden,before);
 step(bare,8);step(garden,8);assert.ok(garden.ecology.habitats[0].maturity>.3);assert.ok(garden.ecology.habitats[1].maturity<1);assert.ok(garden.ecology.colony[0].energy>bare.ecology.colony[0].energy);assert.ok(garden.food>bare.food);
});
test('a wafer restores persistent resident energy, which survives reload',()=>{
 const s=newAquarium();s.ecology.colony.forEach(n=>n.energy=.2);s.pellets=[{x:0,y:.3,z:0,age:12,kind:'greens'}];swim(s,2,0);assert.ok(s.ecology.colony[0].energy>.2);assert.equal(restoreAquarium(copy(s)).ecology.colony[0].energy,s.ecology.colony[0].energy);
});
test('shrimp moult on simulated time and their recovery changes activity and field notes',()=>{
 const s=settled(),n=s.ecology.colony[0];n.moult=19.9;advance(s,16,1);assert.ok(n.rest>1);assert.equal(s.ecology.moults,1);assert.equal(crewActivity(s,n,true),'Recovering from a moult');assert.equal(noteFor(s,n,true),'moult');const saved=restoreAquarium(copy(s));assert.equal(saved.ecology.colony[0].rest,n.rest);step(s,2);assert.equal(n.rest,0);
});
test('broods require mature moss, reserve capacity, pause in poor water, and produce exactly two young',()=>{
 const s=newAquarium(),money=s.wonder;assert.match(startBrood(s,harmony(s)),/35%/);assert.equal(s.wonder,money);s.wonder=100;setHabitat(s,0,'moss');s.ecology.habitats[0].maturity=.8;
 assert.match(startBrood(s,harmony(s)),/16 tank hours/);assert.equal(s.wonder,76);startBrood(s,harmony(s));assert.equal(s.wonder,76);s.ammonia=1;advance(s,8,1);assert.equal(s.ecology.brood.hours,0);s.ammonia=.01;step(s,17);assert.equal(s.ecology.brood.ready,true);
 welcomeShrimp(s);assert.equal(s.ecology.born,2);assert.equal(s.ecology.colony.length,15);assert.equal(s.ecology.colony.at(-1).growth,.32);welcomeShrimp(s);assert.equal(s.ecology.colony.length,15);const n=s.ecology.colony.at(-1);step(s,2);assert.ok(n.growth>.32);
 for(let i=0;i<2;i++){s.ecology.brood={hours:16,ready:true};welcomeShrimp(s);}assert.equal(s.ecology.colony.filter(n=>n.type<2).length,13);assert.match(broodNeeds(s,harmony(s)),/Share grown/);s.ecology.brood={hours:16,ready:true};welcomeShrimp(s);assert.equal(s.ecology.colony.length,19);
});
test('sharing keeps four adult cherry shrimp and distinct IDs for later generations',()=>{
 const s=settled();assert.match(shareShrimp(s),/four adult/);s.ecology.brood={hours:16,ready:true};welcomeShrimp(s);assert.match(shareShrimp(s),/four adult/);s.ecology.colony.forEach(n=>n.growth=1);const money=s.wonder;shareShrimp(s);assert.equal(s.ecology.colony.filter(n=>n.type===0).length,4);assert.equal(s.ecology.shared,2);assert.equal(s.wonder,money);s.ecology.brood={hours:16,ready:true};welcomeShrimp(s);assert.equal(new Set(s.ecology.colony.map(n=>n.id)).size,s.ecology.colony.length);
});
test('fieldwork requires the actual behavior and cannot repeat its reward',()=>{
 const s=settled(),n=s.ecology.colony[0],money=s.wonder;recordBehaviour(s,n.id,true);assert.equal(s.wonder,money);
 s.pellets=[{x:0,y:.3,z:0,age:12,kind:'greens'}];recordBehaviour(s,n.id,true);assert.equal(s.wonder,money+5);recordBehaviour(s,n.id,true);assert.equal(s.wonder,money+5);s.pellets=[];
 const snail=s.ecology.colony.find(n=>n.type===3);s.hours=23;assert.equal(isDay(s),false);recordBehaviour(s,snail.id,false);assert.ok(s.ecology.notes.includes('night'));
 n.rest=1;recordBehaviour(s,n.id,true);s.ecology.brood={hours:16,ready:true};welcomeShrimp(s);recordBehaviour(s,s.ecology.colony.at(-1).id,true);assert.equal(s.ecology.notes.length,4);assert.equal(s.wonder,money+20);
});
test('legacy saves acquire the original crew; ecology restoration bounds bad values and duplicate IDs',()=>{
 const raw=copy(settled());raw.version=2;delete raw.ecology;const s=restoreAquarium(raw);assert.equal(s.version,3);assert.equal(s.ecology.colony.length,13);assert.equal(s.ecology.habitats.length,3);
 const next=copy(settled());next.ecology.brood={hours:6,ready:false};next.ecology.notes=['night','night','unknown'];next.ecology.habitats[1]={kind:'toString',maturity:100};next.ecology.colony[0].growth=null;next.ecology.colony[1].id=0;next.ecology.colony[1].energy=100;const out=restoreAquarium(next);assert.equal(out.ecology.colony[0].growth,1);assert.equal(out.ecology.colony[1].energy,1);assert.equal(new Set(out.ecology.colony.map(n=>n.id)).size,13);assert.deepEqual(out.ecology.notes,['night']);assert.equal(out.ecology.habitats[1].kind,'bare');assert.equal(out.ecology.brood.hours,6);assert.deepEqual(restoreAquarium(copy(out)).ecology,out.ecology);
});
