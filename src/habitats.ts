import {Group,Mesh,SphereGeometry,CylinderGeometry,MeshStandardMaterial,DoubleSide,scene} from 'starhermit:scene';
import {submergedHooks} from './water/aquarium.js';
import {leafScattering} from './tissue.js';
import {habitatPositions} from './ecology.js';
import type {Aquarium} from './simulation.js';
import type {Gravel} from './gravel.js';
const sphere=new SphereGeometry(1,10,7),tube=new CylinderGeometry(.39,.43,1.15,16,1,true);
function mat(color:number,roughness=.85){const m=new MeshStandardMaterial({color,roughness,side:DoubleSide});m.hooks=submergedHooks({light:leafScattering});return m;}
const moss=mat(0x52823b),leaf=mat(0x9b7240),stone=mat(0x677467);
export class HabitatGarden{
 private beds=habitatPositions.map(p=>{const root=new Group(),garden=new Group(),litter=new Group(),refuge=new Group();root.position.set(p.x,0,p.z);scene.add(root);root.add(garden,litter,refuge);
  for(let i=0;i<19;i++){const a=i*2.399,r=Math.sqrt(i/19)*.8,m=new Mesh(sphere,moss);m.position.set(Math.cos(a)*r,.10+Math.sin(i*4)*.035,Math.sin(a)*r);m.scale.set(.23,.16,.22);m.castShadow=true;m.receiveShadow=true;garden.add(m);
   const l=new Mesh(sphere,leaf);l.position.set(Math.cos(a)*r,.02+i*.002,Math.sin(a)*r);l.scale.set(.24,.014,.10);l.rotation.y=a;l.rotation.z=Math.sin(i)*.15;l.receiveShadow=true;litter.add(l);}
  const c=new Mesh(tube,stone);c.rotation.z=Math.PI/2;c.position.y=.43;c.castShadow=true;c.receiveShadow=true;refuge.add(c);
  for(let i=0;i<9;i++){const a=i/8*Math.PI,m=new Mesh(sphere,stone);m.position.set(Math.cos(a)*.5,.08+Math.sin(a)*.55,-.4);m.scale.set(.17,.15,.12);m.castShadow=true;refuge.add(m);}
  return {root,garden,litter,refuge};});
 constructor(private gravel:Gravel){}
 update(s:Aquarium){for(let i=0;i<this.beds.length;i++){const b=this.beds[i]!,h=s.ecology.habitats[i]!;b.root.position.y=this.gravel.model.heightAt(b.root.position.x,b.root.position.z)+.03;b.garden.visible=h.kind==='moss';b.garden.scale.setScalar(.55+h.maturity*.65);b.litter.visible=h.kind==='leaves'&&h.maturity>0;b.litter.scale.setScalar(.3+h.maturity*.7);b.refuge.visible=h.kind==='cave';}}
}
