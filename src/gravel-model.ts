// Fixed-step, voxel broad phase with sphere contacts. Visual LOD never changes physics.
// The static floor and every resting pebble occupy a bounded 3D collision lattice.
export interface Pebble {x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;spin:number;}
const CELL=.23,NX=62,NY=12,NZ=27,MIN_X=-7.13,MIN_Y=.08,MIN_Z=-3.105;
const index=(x:number,y:number,z:number)=>(y*NZ+z)*NX+x;
export class VoxelBed {
 readonly stones:Pebble[]=[];
 readonly occupancy=new Int32Array(NX*NY*NZ);
 private readonly next:Int32Array;
 private seed=7118;
 private awake=3;
 private random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 constructor(count=3000){
  this.next=new Int32Array(count);
  // Interleave grid cells so every visual subset covers the entire bed.
  for(let i=0;i<count;i++){
   const cell=(i*1723)%(60*25),x=cell%60,z=Math.floor(cell/60),layer=Math.floor(i/1500);
   this.stones.push({x:-6.8+x*.228+(this.random()-.5)*.08,y:.21+layer*.19+this.random()*.08,z:-2.75+z*.228+(this.random()-.5)*.08,vx:0,vy:0,vz:0,r:.058+this.random()*.047,spin:this.random()*6.283});
  }
  for(let i=0;i<90;i++)this.step(1/60);
 }
 private rebuild(){
  this.occupancy.fill(-1);
  for(let i=0;i<this.stones.length;i++){
   const p=this.stones[i]!;const x=Math.max(0,Math.min(NX-1,Math.floor((p.x-MIN_X)/CELL))),y=Math.max(0,Math.min(NY-1,Math.floor((p.y-MIN_Y)/CELL))),z=Math.max(0,Math.min(NZ-1,Math.floor((p.z-MIN_Z)/CELL)));
   const k=index(x,y,z);this.next[i]=this.occupancy[k]!;this.occupancy[k]=i;
  }
 }
 step(dt:number){
  if(this.awake<=0)return false;this.awake-=dt;
  for(const p of this.stones){
   p.vy-=3.4*dt;p.vx*=.97;p.vz*=.97;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
   const floor=.13+p.r*.62;
   if(p.y<floor){p.y=floor;if(p.vy<0)p.vy=-p.vy*.09;p.vx*=.72;p.vz*=.72;}
   if(Math.abs(p.x)>6.87){p.x=Math.sign(p.x)*6.87;p.vx*=-.15;}
   if(Math.abs(p.z)>2.85){p.z=Math.sign(p.z)*2.85;p.vz*=-.15;}
  }
  this.rebuild();
  for(let i=0;i<this.stones.length;i++){
   const p=this.stones[i]!;const cx=Math.floor((p.x-MIN_X)/CELL),cy=Math.floor((p.y-MIN_Y)/CELL),cz=Math.floor((p.z-MIN_Z)/CELL);
   for(let y=Math.max(0,cy-1);y<=Math.min(NY-1,cy+1);y++)for(let z=Math.max(0,cz-1);z<=Math.min(NZ-1,cz+1);z++)for(let x=Math.max(0,cx-1);x<=Math.min(NX-1,cx+1);x++){
    for(let j=this.occupancy[index(x,y,z)]!;j>=0;j=this.next[j]!){
     if(j<=i)continue;const q=this.stones[j]!;const dx=q.x-p.x,dy=(q.y-p.y)*1.5,dz=q.z-p.z;const d2=dx*dx+dy*dy+dz*dz,min=p.r+q.r;
     if(d2>=min*min)continue;const d=Math.sqrt(Math.max(d2,1e-8)),move=(min-d)*.47,nx=dx/d,ny=dy/d,nz=dz/d;
     p.x-=nx*move;p.y-=ny*move/1.5;p.z-=nz*move;q.x+=nx*move;q.y+=ny*move/1.5;q.z+=nz*move;
     const impulse=Math.min(0,(q.vx-p.vx)*nx+(q.vy-p.vy)*ny+(q.vz-p.vz)*nz)*.5;
     p.vx+=nx*impulse;p.vy+=ny*impulse;p.vz+=nz*impulse;q.vx-=nx*impulse;q.vy-=ny*impulse;q.vz-=nz*impulse;
    }
   }
  }
  return true;
 }
 disturb(x:number,z:number,strength=1,radius=1.5){
  this.awake=4;
  for(const p of this.stones){const dx=p.x-x,dz=p.z-z,d=Math.sqrt(dx*dx+dz*dz);if(d>radius)continue;const a=(1-d/radius)*strength;p.vx+=dx/(d+.1)*a*.28;p.vz+=dz/(d+.1)*a*.28;p.vy+=a*.4;}
 }
 heightAt(x:number,z:number){
  const cx=Math.floor((x-MIN_X)/CELL),cz=Math.floor((z-MIN_Z)/CELL);let height=.17;
  for(let y=0;y<NY;y++)for(let zz=Math.max(0,cz-1);zz<=Math.min(NZ-1,cz+1);zz++)for(let xx=Math.max(0,cx-1);xx<=Math.min(NX-1,cx+1);xx++)for(let i=this.occupancy[index(xx,y,zz)]!;i>=0;i=this.next[i]!){const p=this.stones[i]!;if(Math.hypot(p.x-x,p.z-z)<p.r+.05)height=Math.max(height,p.y+p.r*.6);}
  return height;
 }
}
