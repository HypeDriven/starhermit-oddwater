import {InstancedMesh,SphereGeometry,MeshStandardMaterial,Matrix4,Quaternion,Vector3,Color} from 'starhermit:scene';
import {VoxelBed} from './gravel-model.js';
import {submergedHooks} from './water/aquarium.js';
export class Gravel {
 readonly model=new VoxelBed();readonly mesh:InstancedMesh;
 private readonly matrix=new Matrix4();private readonly rotation=new Quaternion();private readonly axis=new Vector3(.3,.8,.2).normalize();private readonly position=new Vector3();private readonly scale=new Vector3();private accumulator=0;
 constructor(){
  const geometry=new SphereGeometry(1,9,6),position=geometry.getAttribute('position')!;
  for(let i=0;i<position.array.length;i+=3){const a=position.array;const d=1+Math.sin(a[i]!*11+a[i+2]!*7)*.07+Math.cos(a[i+1]!*13)*.045;a[i]!*=d;a[i+1]!*=d;a[i+2]!*=d;}
  geometry.computeVertexNormals();
  const material=new MeshStandardMaterial({color:0xffffff,roughness:.67,metalness:.03});
  material.hooks=submergedHooks({surface:`fn surface(s: Surface)->Surface{var o=s;let grain=sin(s.world.x*280.0)*sin(s.world.z*230.0+s.world.y*180.0);o.base_color=vec4f(s.base_color.rgb*(0.92+grain*0.08),s.base_color.a);return o;}`});
  this.mesh=new InstancedMesh(geometry,material,this.model.stones.length);this.mesh.receiveShadow=true;this.mesh.castShadow=true;this.mesh.frustumCulled=false;
  const colors=[0x8c907c,0xa69779,0x656c61,0x404d48,0xc0b395,0x817966,0x9e9a86];
  for(let i=0;i<this.model.stones.length;i++)this.mesh.setColorAt(i,new Color(colors[i%colors.length]!));this.sync();
 }
 private sync(){for(let i=0;i<this.model.stones.length;i++){
  const p=this.model.stones[i]!;this.position.set(p.x,p.y,p.z);this.rotation.setFromAxisAngle(this.axis,p.spin+p.vx*.1);this.scale.set(p.r*1.2,p.r*.66,p.r);
  this.matrix.compose(this.position,this.rotation,this.scale);this.mesh.setMatrixAt(i,this.matrix);
 }}
 update(dt:number){this.accumulator+=Math.min(.1,dt);let changed=false;while(this.accumulator>=1/60){changed=this.model.step(1/60)||changed;this.accumulator-=1/60;}if(changed)this.sync();}
}
