// Isolated review of the game's actual resident meshes and shared materials.
// Copy alongside src/ into a temporary package with this as engine.entry.
import {onStart,onRender,setReady} from 'starhermit:engine';
import {onAction} from 'starhermit:input';
import {PerspectiveCamera,DirectionalLight,HemisphereLight,AmbientLight,Color,Mesh,MeshStandardMaterial,BoxGeometry,scene,renderer} from 'starhermit:scene';
import * as draw from 'starhermit:draw';
import {Invertebrates} from '../src/invertebrates.js';
import {Gravel} from '../src/gravel.js';
import {newAquarium} from '../src/simulation.js';
import {submergedHooks} from '../src/water/aquarium.js';
import type {MaterialHooks} from 'starhermit:scene';
let back=false,scattering=true;
const saved=new Map<MeshStandardMaterial,MaterialHooks>();
const camera=new PerspectiveCamera(35,1440/900,.1,40);camera.position.set(0,2.5,9);camera.lookAt(0,.6,0);renderer.camera=camera;scene.background=new Color(0x102a29);
const sun=new DirectionalLight(0xfff2d9,3.2);scene.add(sun,sun.target,new HemisphereLight(0xb7dcce,0x33443a,.35),new AmbientLight(0xffffff,.12));sun.target.position.set(0,.5,0);
const floor=new Mesh(new BoxGeometry(10,.1,4),new MeshStandardMaterial({color:0x465e51,roughness:.9}));floor.position.y=-.08;scene.add(floor);
onAction(e=>{if(!e.pressed)return;if(e.action==='feed')back=!back;if(e.action==='change'){scattering=!scattering;for(const [m,h] of saved){if(scattering)m.hooks=h;else{const {light,...rest}=h;void light;m.hooks=submergedHooks(rest);}}}});
setReady(false);
onStart(()=>{
 const animals=new Invertebrates(new Gravel(),newAquarium()).animals;
 const selected=[animals.find(r=>r.name==='Cherry shrimp')!,animals.find(r=>r.name==='Amano shrimp')!,animals.find(r=>r.name==='Nerite snail')!,animals.find(r=>r.name==='Ramshorn snail')!];
 for(const r of animals)r.root.visible=selected.includes(r);
 selected.forEach((r,i)=>{r.root.position.set(-3+i*2,0,0);r.root.scale.setScalar(2.5);r.root.rotation.set(0,-.3,0);r.root.traverse(o=>{if(o instanceof Mesh&&o.material instanceof MeshStandardMaterial&&o.material.hooks)saved.set(o.material,o.material.hooks);});});
 setReady(true);
});
onRender(()=>{sun.position.set(-1,back?1.5:5,back?-5:5);draw.text('RESIDENT TISSUE REVIEW',24,24,{size:24,color:'#d4eda2'});draw.text((back?'Back light':'Front light')+' · '+(scattering?'Scattering on':'Scattering off'),24,62,{size:18,color:'#efd69b'});});
