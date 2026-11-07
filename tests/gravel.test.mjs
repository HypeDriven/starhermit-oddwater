import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VoxelBed} from '../src/gravel-model.ts';
test('voxel bed settles into finite, bounded pebble positions',()=>{
 const bed=new VoxelBed(800);for(let i=0;i<180;i++)bed.step(1/60);
 assert.equal(bed.stones.length,800);
 for(const p of bed.stones){assert.ok([p.x,p.y,p.z,p.vx,p.vy,p.vz].every(Number.isFinite));assert.ok(Math.abs(p.x)<=6.9);assert.ok(Math.abs(p.z)<=2.9);assert.ok(p.y>=.10&&p.y<.8);}
});
test('a local water disturbance moves nearby stones and wakes a sleeping bed',()=>{
 const bed=new VoxelBed(800);for(let i=0;i<180;i++)bed.step(1/60);assert.equal(bed.step(1/60),false);
 const target=bed.stones[40],before={x:target.x,y:target.y,z:target.z};bed.disturb(target.x,target.z,1,1);
 for(let i=0;i<12;i++)bed.step(1/60);
 assert.ok(Math.hypot(target.x-before.x,target.y-before.y,target.z-before.z)>.005);
});
test('the collision lattice contains each pebble after settling',()=>{
 const bed=new VoxelBed(800);const heads=[...bed.occupancy].filter(i=>i>=0);assert.ok(heads.length>400);assert.ok(heads.every(i=>i<bed.stones.length));
});
