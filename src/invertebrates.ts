import {Group,Mesh,SphereGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,DoubleSide,Vector3,scene} from 'starhermit:scene';
import type {Gravel} from './gravel.js';
import type {Aquarium} from './simulation.js';
import {submergedHooks} from './water/aquarium.js';
import {leafScattering} from './tissue.js';
const sphere=new SphereGeometry(1,14,10);
const eye=new MeshStandardMaterial({color:0x121a16,roughness:.15});
function mat(color:number,roughness=.4,opacity=1){const m=new MeshStandardMaterial({color,roughness,metalness:.02,transparent:opacity<1,opacity,side:DoubleSide});m.hooks=submergedHooks({light:leafScattering});return m;}
const snailBody=mat(0xa6aa7a,.73),shell=mat(0xa38042,.32),red=mat(0xc63c2b,.35,.82),amber=mat(0xb7c9a2,.26,.65),nymph=mat(0x7a8a51,.74);
shell.hooks=submergedHooks({surface:`fn surface(s: Surface)->Surface{var o=s;let bands=pow(abs(sin(s.uv.x*34.0+s.uv.y*3.0)),5.0);o.base_color=vec4f(s.base_color.rgb*(0.50+bands*0.65),1.0);return o;}`});
function part(parent:Group,material:MeshStandardMaterial,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=new Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;if(material.transparent)m.renderOrder=28;parent.add(m);return m;}
function rod(parent:Group,material:MeshStandardMaterial,a:Vector3,b:Vector3,r:number){const d=b.clone().sub(a),m=new Mesh(new CylinderGeometry(r*.65,r,d.length(),6),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new Vector3(0,1,0),d.normalize());if(material.transparent)m.renderOrder=28;parent.add(m);return m;}
function spiral(){const vertices:number[]=[],uv:number[]=[],ix:number[]=[];const steps=100,sides=10;
 for(let i=0;i<=steps;i++){const t=i/steps,a=t*Math.PI*5.7,rad=.015+t*.15,tube=.008+t*.058;for(let j=0;j<=sides;j++){const b=j/sides*Math.PI*2;vertices.push(Math.cos(a)*(rad+Math.cos(b)*tube),Math.sin(a)*(rad+Math.cos(b)*tube),Math.sin(b)*tube);uv.push(t,j/sides);}}
 for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j;ix.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
const shellGeo=spiral();
export interface Resident {name:string;detail:string;kind:'snail'|'shrimp'|'insect';root:Group;phase:number;x:number;z:number;angle:number;limbs:Group[];glass:boolean;}
export class Invertebrates {
 readonly animals:Resident[]=[];
 readonly group=new Group();
 constructor(private readonly gravel:Gravel){
  scene.add(this.group);
  for(let i=0;i<3;i++)this.addSnail(i);
  for(let i=0;i<7;i++)this.addShrimp(i);
  for(let i=0;i<3;i++)this.addInsect(i);
 }
 private resident(name:string,detail:string,kind:Resident['kind'],i:number):Resident{
  const root=new Group();this.group.add(root);const r:Resident={name,detail,kind,root,phase:i*2.399,x:Math.sin(i*3.1+1)*5.8,z:Math.cos(i*4.3)*2.4,angle:i*2.4,limbs:[],glass:false};this.animals.push(r);return r;
 }
 private addSnail(i:number){const r=this.resident(i===0?'Nerite snail':'Ramshorn snail','A tireless algae grazer. Leaves, driftwood and glass are its garden.','snail',i+20);r.glass=i===0;
  part(r.root,snailBody,.015,.045,0,.29,.055,.105);part(r.root,snailBody,.24,.085,0,.10,.075,.075);
  const house=new Mesh(shellGeo,shell);house.position.set(-.055,.21,0);house.scale.setScalar(i===0?1.12:.96);house.castShadow=true;house.receiveShadow=true;r.root.add(house);
  if(i===0)part(r.root,shell,-.06,.20,0,.19,.17,.14);
  for(const side of [-1,1]){rod(r.root,snailBody,new Vector3(.24,.1,side*.05),new Vector3(.38,.20,side*.12),.012);part(r.root,eye,.38,.20,side*.12,.018,.018,.018);}
 }
 private addShrimp(i:number){const cherry=i<4,r=this.resident(cherry?'Cherry shrimp':'Amano shrimp','Picks biofilm from the gravel; a tiny swimmer with a large appetite.','shrimp',i+1),m=cherry?red:amber;
  part(r.root,m,.07,.14,0,.18,.10,.095);part(r.root,m,.23,.16,0,.09,.07,.075);
  for(let k=0;k<6;k++){const tail=new Group();tail.position.set(-.05-k*.055,.12+Math.sin(k*.35)*.04,0);r.root.add(tail);part(tail,m,0,0,0,.065,.075-k*.007,.075-k*.006);r.limbs.push(tail);}
  for(const side of [-1,1]){
   part(r.root,eye,.28,.21,side*.048,.022,.025,.02);
   rod(r.root,m,new Vector3(.29,.15,side*.035),new Vector3(.56,.27,side*.15),.006);rod(r.root,m,new Vector3(.56,.27,side*.15),new Vector3(.70,.29,side*.29),.0035);
   for(let k=0;k<5;k++){const limb=new Group();limb.position.set(.15-k*.06,.09,side*.05);r.root.add(limb);rod(limb,m,new Vector3(),new Vector3(-.04,-.045,side*.075),.007);rod(limb,m,new Vector3(-.04,-.045,side*.075),new Vector3(.01,-.09,side*.12),.004);r.limbs.push(limb);}
   part(r.root,m,-.37,.10,side*.045,.075,.02,.065);
  }
 }
 private addInsect(i:number){const r=this.resident(i===0?'Water boatman':'Mayfly nymph',i===0?'Rows through quiet water with long paddle-shaped legs.':'A small freshwater insect browsing the planted shallows.','insect',i+11);
  part(r.root,nymph,0,.10,0,.19,.065,.08);part(r.root,nymph,.17,.11,0,.075,.06,.065);
  for(let k=0;k<5;k++)part(r.root,nymph,-.12-k*.035,.10,0,.045,.04-k*.004,.065-k*.008);
  for(const side of [-1,1]){
   part(r.root,eye,.21,.14,side*.044,.025,.024,.02);
   for(let k=0;k<3;k++){const g=new Group();g.position.set(.12-k*.1,.08,side*.055);r.root.add(g);rod(g,nymph,new Vector3(),new Vector3(-.04,-.02,side*.13),.008);rod(g,nymph,new Vector3(-.04,-.02,side*.13),new Vector3(-.12,-.06,side*.24),.005);r.limbs.push(g);}
   rod(r.root,nymph,new Vector3(.21,.13,side*.025),new Vector3(.4,.14,side*.10),.004);
  }
  if(i>0)for(const side of [-1,0,1])rod(r.root,nymph,new Vector3(-.27,.1,side*.02),new Vector3(-.52,.12,side*.14),.004);
 }
 update(dt:number,time:number,tank:Aquarium){
  for(const r of this.animals){
   const speed=r.kind==='snail'?.018:r.kind==='shrimp'?.14:.11;
   r.angle+=Math.sin(time*.19+r.phase)*dt*.45;
   r.x+=Math.cos(r.angle)*dt*speed;r.z-=Math.sin(r.angle)*dt*speed;
   if(Math.abs(r.x)>6.5){r.x=Math.sign(r.x)*6.5;r.angle=Math.PI-r.angle;}
   if(Math.abs(r.z)>2.65){r.z=Math.sign(r.z)*2.65;r.angle=-r.angle;}
   let y=this.gravel.model.heightAt(r.x,r.z)+.035;
   if(r.kind==='shrimp'){const swim=Math.max(0,Math.sin(time*.17+r.phase)-.5);y+=swim*(1.5+Math.sin(time*.7+r.phase)*.4);}
   if(r.kind==='insect'&&r.name==='Water boatman')y=4.5+Math.sin(time*.3+r.phase)*.7;
   if(r.glass){r.root.position.set(-4.8+Math.sin(time*.015)*.8,1.6+Math.sin(time*.02)*.7,2.96);r.root.rotation.set(Math.PI/2,0,Math.PI*.35);}
   else {r.root.position.set(r.x,y,r.z);r.root.rotation.set(0,r.angle,0);}
   for(let i=0;i<r.limbs.length;i++){const limb=r.limbs[i]!;if(r.kind==='shrimp'&&i<6)limb.rotation.y=Math.sin(time*5+r.phase-i*.5)*.07;else limb.rotation.z=Math.sin(time*(r.kind==='insect'?7:11)+r.phase+i*.65)*.22;}
  }
  // Small grazing contribution to the existing ecosystem; no new care burden.
  tank.algae=Math.max(0,tank.algae-dt*.000004);tank.food=Math.max(0,tank.food-dt*.00001);
 }
 pick(x:number,y:number,width:number,height:number,camera:Parameters<Vector3['project']>[0]):Resident|undefined{
  let best=22,hit:Resident|undefined;for(const r of this.animals){const p=r.root.position.clone().project(camera),d=Math.hypot((p.x*.5+.5)*width-x,(-p.y*.5+.5)*height-y);if(d<best){best=d;hit=r;}}return hit;
 }
}
