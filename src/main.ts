import { frame, onFixedUpdate, onRender, onStart, onSuspend, onQuit, setFixedRate, levelSettings, openMenu, setBusy, setReady } from 'starhermit:engine';
import { AmbientLight, HemisphereLight, DirectionalLight, PointLight, BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry, BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, MeshBasicMaterial, PerspectiveCamera, Color, Group, Vector3,  OrthographicCamera, FogExp2, DoubleSide, ACESFilmicToneMapping, scene, renderer } from 'starhermit:scene';
import { onAction, onPointerButton, onPointerMove, onWheel } from 'starhermit:input';
import { storage } from 'starhermit:storage';
import * as draw from 'starhermit:draw';
import * as ui from 'starhermit:ui';
import {newAquarium,restoreAquarium,advance,swim,feed,waterChange,harmony,species,addFish,clamp,isDay,comfort,foods,upgrade,rinseFilter,trimPlants,plantAquarium,startNursery,welcomeFry,observe,claimMilestone,claimProject,record,rehomeFish} from './simulation.js';
import type {Fish,FoodKind} from './simulation.js';
import {budgets as graphicsBudgets} from './graphics.js';
import {prepareFishModels,createFish as makeFish,fishVisuals,animateFish,updateFishQuality,removeFishVisual} from './fish.js';
import {prepareSound,toggleSound,soundEnabled,sound} from './sound.js';
import {AquariumWater,submergedHooks} from './water/aquarium.js';
import {leafScattering} from './tissue.js';
import {Gravel} from './gravel.js';
import {Invertebrates} from './invertebrates.js';
import type {Resident} from './invertebrates.js';
import {HabitatGarden} from './habitats.js';
import {setHabitat,startBrood,welcomeShrimp,shareShrimp,recordBehaviour,noteFor,crewActivity} from './ecology.js';
import type {HabitatKind} from './ecology.js';
import {notebook,drawNotebook} from './notebook.js';

let tank=newAquarium();
try{tank=restoreAquarium(storage.getJson('oddwater-v1'));}catch{}
let time=0,speed=1,view='tank',activeTool='observe',tab='care',selected=-1,toast='Welcome, keeper. Explore care, tiny habitats and field notes in Notebook.',toastUntil=9,saveClock=0,lightOn=true;
let rehomeConfirmation=-1;
let lightPreview:'auto'|'day'|'night'='auto';
let yaw=.18,pitch=.26,distance=22.4,dragging=false,dragX=0,dragY=0,downX=0,downY=0,moved=false,showHelp=false;
let filterBody:Mesh|undefined;
let habitatGarden:HabitatGarden|undefined;
let substrate:Gravel|undefined,aquariumWater:AquariumWater|undefined,residents:Invertebrates|undefined,selectedResident:Resident|undefined;
let width=1280,height=800,S=1,compact=false;
const C={ink:'#e5ece1',muted:'#91a99f',lime:'#d4eda2',gold:'#efd69b',panel:'#102c2a',line:'#35514a'};
const camera=new PerspectiveCamera(40,16/9,.1,100);renderer.camera=camera;scene.background=new Color(0x071a1b);scene.fog=new FogExp2(0x0b2928,.016);renderer.antialias='fxaa';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;
const sun=new DirectionalLight(0xf1ffe2,2.8);sun.position.set(-3,11,6);scene.add(sun,sun.target,new HemisphereLight(0x9ce8cd,0x24302a,.95),new AmbientLight(0x8bc3bd,.3));renderer.shadowMap.enabled=true;sun.castShadow=true;sun.shadow.camera=new OrthographicCamera(-10,10,9,-9,.1,35);sun.shadow.mapSize=2048;sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=2;renderer.ao={blendIntensity:.48,radius:.36,samples:8,resolution:.5};renderer.bloom={strength:.08,radius:.25,threshold:1.1,resolution:.5};
const glow=new PointLight(0xbbeeca,8,19);glow.position.set(0,6,0);scene.add(glow);
const sphere=new SphereGeometry(1,20,12),smallSphere=new SphereGeometry(1,8,6),box=new BoxGeometry(1,1,1);
function material(color:number,rough=.6){const m=new MeshStandardMaterial({color,roughness:rough,metalness:.06});m.hooks=submergedHooks();return m;}
const wood=material(0x51422d,.93),rim=material(0x354a42,.35),sand=material(0x8b8263,.94),black=material(0x081716,.7);
function mesh(geo:BufferGeometry,mat:MeshStandardMaterial|MeshBasicMaterial,x:number,y:number,z:number,sx=1,sy=1,sz=1,parent:Group|typeof scene=scene){const m=new Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=mat instanceof MeshStandardMaterial&&!mat.transparent;m.receiveShadow=true;parent.add(m);return m;}
function branch(a:Vector3,b:Vector3,r1:number,r2:number,mat=wood,parent:Group|typeof scene=scene){const d=b.clone().sub(a);const m=new Mesh(new CylinderGeometry(r2,r1,d.length(),9),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new Vector3(0,1,0),d.normalize());m.castShadow=mat instanceof MeshStandardMaterial&&!mat.transparent;m.receiveShadow=true;parent.add(m);return m;}
wood.hooks=submergedHooks({surface:`fn surface(s: Surface) -> Surface {var o=s;let bark=sin(s.uv.x*90.0+sin(s.uv.y*16.0)*2.0)*.12+sin(s.uv.x*210.0+s.uv.y*9.0)*.05;o.base_color=vec4f(s.base_color.rgb*(.7+bark),s.base_color.a);o.roughness=.94;return o;}`});
sand.hooks=submergedHooks({surface:`fn surface(s: Surface)->Surface{var o=s;let grain=sin(s.world.x*120.0+s.world.z*70.0)*sin(s.world.z*170.0);o.base_color=vec4f(s.base_color.rgb*(0.94+grain*0.06),s.base_color.a);return o;}`});
let graphicsLevel='';
function updateGraphics(){
 const f=frame();if(graphicsLevel===f.level)return;graphicsLevel=f.level;
 const q=graphicsBudgets[f.quality],level=levelSettings();
 renderer.antialias=level.antialias;
 renderer.shadowMap.enabled=q.shadow>0&&level.shadows;
 sun.castShadow=renderer.shadowMap.enabled;
 sun.shadow.mapSize=q.shadow||512;
 renderer.ao=q.aoSamples?{blendIntensity:.48,radius:.36,samples:q.aoSamples,resolution:q.aoResolution}:null;
 renderer.bloom=q.bloom?{strength:.08,radius:.25,threshold:1.1,resolution:q.bloom}:null;
 if(substrate)substrate.mesh.count=q.gravel;
 aquariumWater?.setQuality(f.quality);updateFishQuality(f.quality);
}
function buildTank(){
 mesh(box,black,0,-1.17,0,14.6,1.85,6.6);mesh(box,rim,0,-.28,0,14.5,.2,6.5);mesh(box,sand,0,-.04,0,14,.35,6);
 const back=new MeshBasicMaterial({color:0x0d3633});mesh(box,back,0,2.9,-3.07,14.1,6.1,.07);
 const glass=new MeshBasicMaterial({color:0x86cfba,transparent:true,opacity:.045,side:DoubleSide,depthWrite:false});
 mesh(box,glass,-7.05,2.9,0,.06,6.1,6);mesh(box,glass,7.05,2.9,0,.06,6.1,6);
 for(const x of [-7.1,7.1])for(const z of [-3.1,3.1])mesh(box,rim,x,2.95,z,.055,6.25,.055);
 for(const z of [-3.1,3.1]){mesh(box,rim,0,6.05,z,14.3,.06,.06);mesh(box,rim,0,.02,z,14.3,.06,.06);}
 const strip=new MeshBasicMaterial({color:0xd3f6cd});mesh(box,strip,0,6.3,-.3,10,.045,.16);branch(new Vector3(-5.1,6.05,-3),new Vector3(-5.1,6.3,-.3),.025,.025,rim);branch(new Vector3(5.1,6.05,-3),new Vector3(5.1,6.3,-.3),.025,.025,rim);
 substrate=new Gravel();scene.add(substrate.mesh);
 for(let i=0;i<8;i++){const rock=new SphereGeometry(1,24,16);const ra=rock.getAttribute('position')!;const a=ra.array;for(let j=0;j<a.length;j+=3){const n=1+.1*Math.sin(a[j]*8+a[j+2]*4)+.065*Math.cos(a[j+1]*11-a[j+2]*7);a[j]*=n;a[j+1]*=n;a[j+2]*=n;}rock.computeVertexNormals();const rm=material([0x545e50,0x6b7460,0x414e45][i%3],.98);rm.hooks=submergedHooks({surface:`fn surface(s: Surface) -> Surface {var o=s;let p=s.world*35.0;let grain=sin(p.x+sin(p.z*1.8))*sin(p.y+p.z)*.07+sin(s.world.y*30.0+s.world.x*12.0)*.055;o.base_color=vec4f(s.base_color.rgb*(.8+grain),s.base_color.a);return o;}`});const m=mesh(rock,rm,Math.sin(i*5.2)*2+.8,.35+Math.random()*.25,Math.cos(i*3.7)*1.1-.6,.5+Math.random()*.5,.4+Math.random()*.6,.5+Math.random()*.4);m.rotation.set(.3*i,.4*i,.2*i);}
 const points=[[-4,.1,-.3],[-3.5,.8,-.5],[-2.4,1.5,-.5],[-1.1,2.1,-.7],[.2,2.7,-.8],[1.1,3.1,-1.2],[2.2,3.4,-1.5]];
 for(let i=1;i<points.length;i++)branch(new Vector3(...points[i-1] as [number,number,number]),new Vector3(...points[i] as [number,number,number]),.28-i*.025,.25-i*.026);
 branch(new Vector3(-1,2.2,-.7),new Vector3(-.2,3.4,-1),.11,.025);branch(new Vector3(-2.5,1.4,-.5),new Vector3(-3.2,2.7,-1.4),.12,.03);branch(new Vector3(-3.4,.8,-.5),new Vector3(-4.7,.15,1.1),.16,.04);branch(new Vector3(.3,2.7,-.8),new Vector3(2.6,.2,-1),.13,.07);
 // Sponge filter, lift tube and gentle air return.
 const sponge=material(0x172b27,.97);filterBody=mesh(box,sponge,6.45,.95,-2.15,.65,1.6,.65);branch(new Vector3(6.45,1,-2.15),new Vector3(6.45,5.5,-2.15),.055,.055,rim);
}
function leafGeo(len:number,w:number){const v:number[]=[],uv:number[]=[],ix:number[]=[];for(let j=0;j<=14;j++){const t=j/14;const wj=Math.sin(Math.PI*t)**.82*w*(1+.055*Math.sin(t*25));for(const side of [-1,0,1]){v.push(side*wj,len*t,Math.sin(t*Math.PI)*len*.2+(1-Math.abs(side))*wj*.35);uv.push((side+1)*.5,t);}}for(let j=0;j<14;j++)for(let k=0;k<2;k++){const a=j*3+k;ix.push(a,a+1,a+3,a+1,a+4,a+3);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(v,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}

const plants:Group[]=[];
const greens=[0x3c7140,0x578849,0x255d37,0x76944c,0x9a7850];
function plant(x:number,z:number,tall:boolean){const g=new Group();g.position.set(x,.14,z);scene.add(g);plants.push(g);const n=tall?10:7;for(let j=0;j<n;j++){const a=j*2.4;const len=(tall?2.1:1)*(.7+Math.random()*.6);const lm=material(greens[j%greens.length],.68);lm.side=DoubleSide;lm.hooks=submergedHooks({light:leafScattering,surface:`fn surface(s: Surface) -> Surface {var o=s;let rib=1.0-smoothstep(.01,.035,abs(s.uv.x-.5));let veins=pow(abs(sin(s.uv.y*110.0+abs(s.uv.x-.5)*25.0)),20.0);o.base_color=vec4f(s.base_color.rgb*(.9+rib*.25+veins*.08),s.base_color.a);o.roughness=.51;return o;}`});const l=mesh(leafGeo(len,tall?.12:.22),lm,Math.cos(a)*.08,0,Math.sin(a)*.08,1,1,1,g);l.rotation.set(Math.cos(a)*.55,a,Math.sin(a)*.55);}return g;}
function buildPlants(){for(const [x,z,t] of [[-5.9,-2.1,1],[-4.8,-2.3,1],[-3.8,-2.2,1],[-1.8,-2.1,1],[3.6,-2.3,1],[4.6,-2.3,1],[5.5,-1.4,1],[-5.4,1.7,0],[3.8,1.7,0],[4.8,1.3,0],[-2.8,.7,0],[1.5,-1.8,0],[-6,.3,0],[5.7,.4,0]])plant(x,z,!!t);for(let i=0;i<18;i++)plant(-6+Math.random()*12,Math.random()*4.4-2.2,false).scale.set(.4,.4,.4);}
function createFish(f:Fish){scene.add(makeFish(f).root);}
const pelletVisuals:Mesh[]=[];const pelletMat=material(0xc99655,.8);
const nurseryEggs=new Group();scene.add(nurseryEggs);const eggMaterial=new MeshStandardMaterial({color:0xe3dba7,emissive:0x5d6732,emissiveIntensity:.35,roughness:.3});nurseryEggs.position.set(-5.1,.78,-1.9);for(let i=0;i<6;i++)mesh(smallSphere,eggMaterial,(i%3)*.10,Math.floor(i/3)*.12,0,.045,.055,.045,nurseryEggs);habitatGarden?.update(tank);
 nurseryEggs.visible=false;
const selectionHalo=new Mesh(new TorusGeometry(.43,.012,6,40),new MeshBasicMaterial({color:0xe4eaa3,transparent:true,opacity:.65,depthWrite:false}));selectionHalo.rotation.x=Math.PI/2;scene.add(selectionHalo);selectionHalo.visible=false;
const dreams=new Group();scene.add(dreams);const dreamObjects:Group[]=[];
function dreamObject(kind:number){const g=new Group();g.position.set(kind===0?2.7:kind===1?-3.2:.2,kind===0?3.2:kind===1?3.9:4.2,kind===0?.6:kind===1?.5:-1.4);dreams.add(g);const gold=material(0xd8bd70,.25);gold.metalness=.75;const mint=new MeshStandardMaterial({color:0xb7eac5,emissive:0x689f95,emissiveIntensity:.7,roughness:.65});
 if(kind===0){const ring=new Mesh(new TorusGeometry(.68,.045,10,64),gold);g.add(ring);mesh(sphere,mint,0,0,0,.26,.26,.26,g);for(let i=0;i<6;i++)mesh(smallSphere,gold,Math.cos(i)*.9,Math.sin(i)*.9,0,.025,.025,.025,g);}
 if(kind===1){mesh(sphere,mint,0,0,0,.48,.48,.48,g);for(let i=0;i<9;i++)mesh(smallSphere,material(0x7ea48d,.98),Math.sin(i*2.4)*.35,Math.cos(i*1.7)*.32,.3,.07,.045,.02,g);const r=new Mesh(new TorusGeometry(.83,.018,8,64),gold);r.rotation.x=.6;g.add(r);}
 if(kind===2){const cup=mesh(new CylinderGeometry(.38,.26,.5,24,1,true),material(0xd8e0cb,.25),0,0,0,1,1,1,g);cup.rotation.z=Math.PI;const handle=new Mesh(new TorusGeometry(.19,.045,8,24),gold);handle.position.set(.4,0,0);g.add(handle);mesh(new CylinderGeometry(.53,.53,.035,32),gold,0,.36,0,1,1,1,g);}
 dreamObjects.push(g);}
function notify(s:string){toast=s;toastUntil=time+6;}
function save(){try{storage.setJson('oddwater-v1',tank as never);}catch{notify('Save unavailable. Keep this session open to retain progress.');}}
function useFeed(){if(feed(tank)){notify(tank.pellets.length>24?'A little goes a long way. Uneaten food becomes waste.':'Dinner is served. Watch the school find the food.');activeTool='observe';sound('feed');aquariumWater?.ripple(0,0,.07);save();}else notify('There is already plenty of food in the water.');}
function addPlant(){const before=tank.plants,message=plantAquarium(tank);if(tank.plants>before){plant((Math.random()-.5)*11,(Math.random()-.5)*4,Math.random()>.5);record(tank,'A new plant takes root.');}notify(message);save();}
function notebookAction(action:string,value?:string|number){
 if(action==='feed'||action==='plant'){doAction(action);return;}
 let message='';
 if(action==='target-feed'){activeTool='feed';selected=-1;selectedResident=undefined;notebook.open=false;notify('Tap the water to place a small meal for nearby neighbours.');return;}
 if(action==='food'){tank.foodKind=value as FoodKind;message=foods[tank.foodKind].hint;}
 if(action==='filter'||action==='aerator')message=upgrade(tank,action);
 if(action==='rinse')message=rinseFilter(tank);
 if(action==='trim')message=trimPlants(tank);
 if(action==='nursery')message=startNursery(tank,Number(value));
 if(action==='welcome-fry'){message=welcomeFry(tank);for(let j=fishVisuals.length;j<tank.fish.length;j++)createFish(tank.fish[j]!);}
 if(action==='light-hours'){tank.lightHours=Number(value);record(tank,'Light period set to '+value+' hours.');message='Light cycle updated. Plants grow by day; the tank rests at night.';}
 if(action==='milestone')message=claimMilestone(tank,String(value))?'A keeper’s memory recorded. Wonder collected.':'That memory is still taking shape.';
 if(action==='project')message=claimProject(tank)?'Project remembered. A new keeper project is waiting.':'Keep tending this project; its reward will be ready in time.';
 if(action==='habitat'){const [slot,kind]=String(value).split(':');message=setHabitat(tank,Number(slot),kind as HabitatKind);}
 if(action==='brood')message=startBrood(tank,harmony(tank));
 if(action==='welcome-shrimp')message=welcomeShrimp(tank);
 if(action==='share-shrimp'){message=shareShrimp(tank);selectedResident=undefined;}
 if(action==='field-note'&&selectedResident)message=recordBehaviour(tank,selectedResident.id,isDay(tank));
 residents?.sync(tank);
 if(message)notify(message);save();
}
function findNeighbour(key:string){
 selected=-1;selectedResident=undefined;rehomeConfirmation=-1;
 if(key.startsWith('fish-'))selected=tank.fish.findIndex(f=>f.type===Number(key.slice(5)));
 else selectedResident=residents?.animals.find(r=>key.startsWith('resident-')?r.id===Number(key.slice(9)):r.name===key);
 if(selected>=0||selectedResident){if(observe(tank,selectedResident?.name??key))notify('A new field-guide observation. +3 Wonder.');notebook.open=false;activeTool='observe';view='tank';tab='care';save();}
}
function unlockDream(){if(tank.dreams>=3){notify('All three impossibilities are awake. The aquarium is dreaming.');return;}const cost=[35,55,80][tank.dreams];if(tank.wonder<cost){notify('This dream needs '+cost+' Wonder. Keep your ecosystem thriving.');return;}if(harmony(tank)<70){notify('Dreams need a calm ecosystem: reach 70% harmony.');return;}tank.wonder-=cost;dreamObject(tank.dreams);tank.dreams++;sound('dream');aquariumWater?.ripple(0,0,.12);notify(['An orbiting pearl. The fish insist it has always been here.','A tiny moon rises underwater. The corys remain unimpressed.','Tea is served upside down. The water declines to spill.'][tank.dreams-1]);save();}
function doAction(a:string){if(a==='feed')useFeed();if(a==='change'){waterChange(tank);sound('water');aquariumWater?.ripple(5.5,-1.6,.16);substrate?.model.disturb(5.5,-1.6,.8,2.2);notify('30% water changed. Dissolved waste is diluted; the filter stays alive.');save();}if(a==='plant')addPlant();if(a==='clean'){tank.algae=Math.max(0,tank.algae-.18);notify('Glass polished. A clearer window into a small, strange world.');save();}if(a==='dream')unlockDream();}
const css=ui.stylesFromCss(`button { background:#163531; color:#dbe6da; border:1px solid #3b554b; border-radius:9px; padding:10px 16px; font-size:14px; min-height:44px; } button:hover {background:#294c40;border-color:#aec48b;} button:selected {background:#cce49a;color:#17342a;border-color:#cce49a;} button:disabled {opacity:.4;} .small {padding:7px 11px;min-height:34px;font-size:12px;} .notebook-tab {padding:7px 4px;min-height:34px;font-size:12px;} .primary {background:#cce49a;color:#18362c;border-color:#cce49a;} .clear {background:#0d2724;border-color:#385247;} label {color:#dce6db;font-size:14px;} paragraph {color:#9bb1a4;font-size:14px;} .serif {font-family:serif;font-size:25px;} .shop {width:220px; min-height:80px;text-align:left;} .mobile {padding:9px 10px;font-size:12px;} `);ui.setStyles(css.styles);
function txt(s:string,x:number,y:number,size=14,color=C.ink,font='sans-serif',align:'start'|'center'|'end'='start'){draw.text(s,x*S,y*S,{size:size*S,color,font,align});}
function line(x:number,y:number,w:number){draw.line(x*S,y*S,(x+w)*S,y*S,C.line,1);}
function rect(x:number,y:number,w:number,h:number,color:string,r=0){if(r)draw.roundRect(x*S,y*S,w*S,h*S,r*S,color);else draw.rect(x*S,y*S,w*S,h*S,color);}
function button(id:string,label:string,x:number,y:number,w:number,style='',selectedFlag=false){if(notebook.open)return false;let clicked=false;ui.area({x:x*S,y:y*S,width:w*S,height:60*S},()=>{clicked=ui.id(id).style(style).button(label,{selected:selectedFlag});});return clicked;}
const tasks=[{title:'Dinner with the neighbours',detail:'Feed your fish for the first time',done:()=>tank.fed>0,reward:12},{title:'A little more wilderness',detail:'Grow your planting to 11 plants',done:()=>tank.plants>=11,reward:18},{title:'An excellent glass of water',detail:'Complete a 30% water change',done:()=>tank.changed>0,reward:10},{title:'Permission to be impossible',detail:'Awaken your first dream',done:()=>tank.dreams>0,reward:20}];
function hud(){const f=frame();S=ui.preferences().scale;width=f.width/S;height=f.height/S;compact=width<850;const w=width,h=height;
 // The aquarium stays visible behind a restrained instrument-like HUD.
 rect(0,0,w,78,'#091e1bea');line(24,77,w-48);txt('ODDWATER',compact?18:28,17,compact?22:27,C.lime,'serif');txt('A SLIGHTLY IMPOSSIBLE AQUARIUM',compact?18:29,49,compact?8:10,C.muted);
 if(!compact&&w>1050){txt('FRESHWATER  /  180 L',w/2,23,11,C.muted,'monospace','center');txt('The ordinary, beautifully strange.',w/2,42,15,C.ink,'serif','center');}
 if(!compact&&button('notebook','Notebook  J',260,20,112,'small',notebook.open)){notebook.open=!notebook.open;showHelp=false;}
 const balance=compact?(tank.wonder>=1e6?(tank.wonder/1e6).toFixed(1)+'m':tank.wonder>=10000?Math.floor(tank.wonder/1000)+'k':Math.floor(tank.wonder))+' W':Math.floor(tank.wonder)+'  Wonder';
 txt(balance,w-(compact?124:260),25,compact?14:17,C.gold,'serif','end');if(button('options','⚙',w-59,19,40,'small'))openMenu();if(button('help','?',w-105,19,40,'small',showHelp))showHelp=!showHelp;if(!compact&&button('sound',soundEnabled()?'Sound on':'Sound off',w-193,20,84,'small',soundEnabled()))toggleSound();
 if(!compact){leftPanel(25,107);rightPanel(w-240,107);}
 else {rect(14,91,w-28,43,'#102c2ae8',10);txt(Math.round(harmony(tank))+'% harmony',26,104,13,C.lime);txt(tank.temp.toFixed(1)+' °C',w/2,104,13,C.ink,'sans-serif','center');txt('Day '+(Math.floor(tank.hours/24)+1),w-28,104,13,C.muted,'sans-serif','end');}
 if(!compact){txt('THE REVERIE',w/2,101,12,C.lime,'monospace','center');txt('Drag to orbit  ·  Scroll to get closer  ·  Click a fish to meet it',w/2,122,11,C.muted,'sans-serif','center');}
 const by=h-(compact?145:122);rect(compact?10:25,by,w-(compact?20:50),compact?134:105,'#0c2422f2',14);
 if(!compact){txt('KEEPER’S TOOLS',45,by+14,10,C.muted,'monospace');txt(activeTool==='feed'?'Tap the water to sprinkle food.':'A little attention. An entire world.',w-44,by+14,11,C.muted,'sans-serif','end');}
 const labels=['Feed','Water change','Plant','Clean glass','Dream'];const ids=['feed','change','plant','clean','dream'];const gap=compact?5:10;const bw=compact?(w-40-gap*4)/5:124;const start=compact?20:45;for(let i=0;i<5;i++){if(button(ids[i],compact?['Feed','Water','Plant','Clean','Dream'][i]:labels[i],start+i*(bw+gap),by+(compact?12:36),bw,i===0?'primary':compact?'mobile':'',activeTool===ids[i]))doAction(ids[i]);}
 const sx=compact?20:w-294,sy=compact?by+73:by+41;txt(compact?'TIME':'TIME FLOWS',sx,sy-13,9,C.muted,'monospace');for(let i=0;i<4;i++){const val=[0,1,5,20][i];if(button('speed'+i,['Ⅱ','1×','5×','20×'][i],sx+i*57,sy,54,'small',speed===val))speed=val;}
 if(!compact){if(button('light',lightPreview==='auto'?'Light: Auto':lightPreview==='day'?'Daylight':'Moonlight',w-240,523,110,'small',!lightOn)){lightPreview=lightPreview==='auto'?'night':lightPreview==='night'?'day':'auto';}}
 if(compact){if(button('notebook-mobile','Notebook',112,143,96,'small',notebook.open)){notebook.open=!notebook.open;showHelp=false;view='tank';}if(button('zoom-in','+',19,143,42,'small'))distance=clamp(distance-2,10.2,31);if(button('zoom-out','−',65,143,42,'small'))distance=clamp(distance+2,10.2,31);if(button('mobile-stats',view==='stats'?'Close':'Tank notes',w-104,143,94,'small',view==='stats'))view=view==='stats'?'tank':'stats';if(view==='stats'){rect(14,187,w-28,Math.min(510,h-342),'#0d2b27f8',12); if(button('mobile-water','Water',27,199,75,'small',tab==='care'))tab='care'; if(button('mobile-journal','Journal',105,199,85,'small',tab==='journal'))tab='journal'; if(button('mobile-fish','Fish',195,199,65,'small',tab==='shop'))tab='shop'; if(tab==='care')rightPanel(28,253);else if(tab==='journal')mobileJournal(29,251);else mobileShop(29,251);}}
 if(time<toastUntil){const tw=Math.min(w-32,620),ny=by-(selected>=0?327:selectedResident?279:57);rect((w-tw)/2,ny,tw,42,'#1c3e32f5',9);if(compact&&toast.length>51){const cut=toast.lastIndexOf(' ',51);txt(toast.slice(0,cut),w/2,ny+7,11,C.ink,'sans-serif','center');txt(toast.slice(cut+1),w/2,ny+23,11,C.ink,'sans-serif','center');}else txt(toast,w/2,ny+13,compact?11:13,C.ink,'sans-serif','center');}
 if(selectedResident&&!notebook.open)residentCard(w/2-145,by-222,selectedResident);
 if(selected>=0&&tank.fish[selected]&&!notebook.open)fishCard(w/2-160,by-270,tank.fish[selected]);
 if(tab==='shop'&&!compact&&!notebook.open)shopPanel(w/2-266,166);
 if(showHelp)help(w,h);
 drawNotebook(tank,w,h,S,{act:notebookAction,find:findNeighbour});

}
function mobileJournal(x:number,y:number){txt('The keeper’s journal',x,y,21,C.lime,'serif');for(let i=0;i<tasks.length;i++){const task=tasks[i],yy=y+38+i*75,claimed=tank.claimed.includes(i);txt(task.title,x,yy,12,C.ink);txt(claimed?'✓ Remembered':task.detail,x,yy+21,10,C.muted);if(task.done()&&!claimed&&button('mobile-claim'+i,'Collect +'+task.reward,x+185,yy+15,100,'small')){tank.wonder+=task.reward;tank.claimed.push(i);save();}}}
function mobileShop(x:number,y:number){txt('Meet the neighbours',x,y,21,C.lime,'serif');for(let i=0;i<4;i++){const p=species[i],yy=y+40+i*75;txt(p.name,x,yy,16,C.ink,'serif');txt(p.group+' fish · '+p.cost+' Wonder',x,yy+24,11,C.muted);if(button('mobile-buy'+i,'Add group',x+177,yy+7,105,'small')){if(tank.fish.length+p.group>35)notify('The tank has reached its comfortable population limit.');else if(tank.wonder<p.cost)notify('This group needs '+p.cost+' Wonder.');else{tank.wonder-=p.cost;addFish(tank,i,p.group);for(let j=fishVisuals.length;j<tank.fish.length;j++)createFish(tank.fish[j]);save();notify('New neighbours arrive.');}}}}
function leftPanel(x:number,y:number){txt('FIELD NOTES',x,y,10,C.muted,'monospace');txt('A world in a glass.',x,y+23,24,C.ink,'serif');txt('Community tank · established filter',x,y+57,11,C.muted);line(x,y+87,196);
 txt('01   THE KEEPER’S JOURNAL',x,y+109,10,C.lime,'monospace');let row=y+140;for(let i=0;i<tasks.length;i++){const task=tasks[i],done=task.done(),claimed=tank.claimed.includes(i);txt(claimed?'✓':done?'○':'·',x,row,16,claimed?C.lime:C.muted);txt(task.title,x+23,row+1,12,C.ink);txt(claimed?'Remembered.':task.detail,x+23,row+22,10,C.muted);if(done&&!claimed){if(button('claim'+i,'Collect +'+task.reward,x+23,row+42,120,'small')){tank.wonder+=task.reward;tank.claimed.push(i);notify('A good keeper makes room for wonder. +'+task.reward);save();}}row+=done&&!claimed?90:67;}
 const yy=row+9;line(x,yy,196);txt('THE FISH ARE DREAMING OF…',x,yy+18,9,C.muted,'monospace');txt(['An orbiting pearl','A moon of their own','An upside-down tea party','A very peaceful afternoon'][tank.dreams],x,yy+39,15,C.gold,'serif');txt(tank.dreams<3?[35,55,80][tank.dreams]+' Wonder to awaken':'All 3 dreams discovered',x,yy+66,11,C.muted);
 if(button('catalog',tab==='shop'?'Close collection':'Meet the neighbours  →',x,yy+98,200,'small',tab==='shop'))tab=tab==='shop'?'care':'shop';}
function rightPanel(x:number,y:number){const q=harmony(tank);txt('LIVING WATER',x,y,10,C.muted,'monospace');txt(Math.round(q)+'%',x,y+24,38,q>75?C.lime:C.gold,'serif');txt(q>80?'Quietly thriving':q>60?'Needs attention':'Time for care',x+92,y+41,11,C.muted);rect(x,y+76,206,3,'#2a4237');rect(x,y+76,206*q/100,3,C.lime);
 const items=[['Temperature',tank.temp.toFixed(1)+' °C','24–26 °C'],['Acidity',tank.ph.toFixed(1)+' pH','6.5–7.2'],['Ammonia',tank.ammonia.toFixed(3)+' mg/L','near zero'],['Nitrite',tank.nitrite.toFixed(3)+' mg/L','near zero'],['Nitrate',tank.nitrate.toFixed(1)+' mg/L','below 25'],['Oxygen',tank.oxygen.toFixed(1)+' mg/L','above 6']];for(let i=0;i<items.length;i++){const yy=y+99+i*35;txt(items[i][0],x,yy,11,C.muted);txt(items[i][1],x+206,yy,12,C.ink,'monospace','end');}
 line(x,y+317,206);txt(tank.fish.length+' fish  ·  '+tank.plants+' plants',x,y+330,12,C.ink);txt(tank.ecology.colony.filter(n=>n.type<2).length+' shrimp · '+tank.ecology.colony.filter(n=>n.type===2||n.type===3).length+' snails · '+tank.ecology.colony.filter(n=>n.type>=4).length+' aquatic insects',x,y+349,10,C.muted);const hour=Math.floor(tank.hours%24),minute=Math.floor((tank.hours%1)*60);txt('DAY '+(Math.floor(tank.hours/24)+1)+'  /  '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'),x,y+369,10,C.muted,'monospace');txt('Filter flow '+Math.round((1-tank.filterDirt*.58)*100)+'%  ·  '+tank.lightHours+' h light',x,y+390,10,C.muted);}
function fishCard(x:number,y:number,f:Fish){
 rect(x,y,320,258,'#112f2bf5',12);const p=species[f.type]!;
 txt(p.name,x+18,y+13,21,C.lime,'serif');txt(p.latin,x+18,y+41,10,C.muted,'serif');
 txt(f.name+' · '+(f.growth<.95?'Juvenile · '+Math.round(f.growth*100)+'% grown':'Settled adult'),x+18,y+64,12,C.gold);
 txt('Health '+Math.round(f.health)+'% · '+(f.hunger<.25?'Well fed':f.hunger<.7?'Curious':'Hungry'),x+18,y+88,12,C.ink);
 txt('Comfort '+Math.round(comfort(tank,f))+'% · Stress '+Math.round(f.stress)+'%',x+18,y+110,11,C.muted);
 txt('Trust '+Math.round(f.bond)+'% · Prefers '+foods[p.food].name.toLowerCase(),x+18,y+132,11,C.muted);
 txt('Rename this neighbour',x+18,y+153,9,C.muted);
 ui.area({x:(x+18)*S,y:(y+168)*S,width:245*S,height:34*S},()=>{const name=ui.textField('Fish name '+f.id,f.name,{width:230*S,maxChars:18});if(name.trim()&&name!==f.name){f.name=name;save();}});
 if(button('rehome-fish',rehomeConfirmation===f.id?'Confirm rehoming':'Rehome with another keeper',x+18,y+210,270,'small')){if(rehomeConfirmation===f.id){const before=tank.fish.length;notify(rehomeFish(tank,f.id));if(tank.fish.length<before){removeFishVisual(f.id);selected=-1;}rehomeConfirmation=-1;save();}else rehomeConfirmation=f.id;}
 if(button('close-fish','×',x+275,y+10,35,'small')){selected=-1;rehomeConfirmation=-1;}
}
function residentCard(x:number,y:number,r:Resident){
 rect(x,y,290,208,'#112f2bf5',12);txt(r.name,x+18,y+14,22,C.lime,'serif');
 const n=r.state;txt((n.growth<.95?'Young · '+Math.round(n.growth*100)+'% grown':'Settled adult')+' · Energy '+Math.round(n.energy*100)+'%',x+18,y+45,11,C.gold);
 const words=r.detail.split(' ');let first='';while(words.length&&(first+' '+words[0]).length<42)first+=(first?' ':'')+words.shift();txt(first,x+18,y+72,11,C.ink);txt(words.join(' '),x+18,y+90,11,C.ink);
 txt(crewActivity(tank,n,isDay(tank)),x+18,y+115,12,C.lime);const note=noteFor(tank,n,isDay(tank));
 txt(note?(tank.ecology.notes.includes(note)?'Already in your field notes':'A new behavior to remember'):'Meals, nights, moults and young bring discoveries.',x+18,y+140,10,C.muted);
 if(button('record-behavior','Record behavior',x+18,y+162,208,'small'))notebookAction('field-note');
 if(button('close-resident','×',x+247,y+10,35,'small'))selectedResident=undefined;
}
function shopPanel(x:number,y:number){rect(x,y,532,356,'#0d2926fa',16);txt('Meet the neighbours',x+23,y+20,27,C.lime,'serif');txt('Compatible community fish. Add a whole social group.',x+23,y+61,12,C.muted);for(let i=0;i<4;i++){const p=species[i],cx=x+22+(i%2)*250,cy=y+94+Math.floor(i/2)*111;txt(p.name,cx,cy,18,C.ink,'serif');txt(p.group+' fish · '+p.cost+' Wonder',cx,cy+28,12,C.muted);if(button('buy'+i,'Welcome home',cx,cy+50,220,'small',false)){if(tank.fish.length+p.group>35)notify('This 180 L tank has reached its comfortable population limit.');else if(tank.wonder<p.cost)notify('Happy fish will help you earn '+p.cost+' Wonder.');else{tank.wonder-=p.cost;addFish(tank,i,p.group);for(let j=fishVisuals.length;j<tank.fish.length;j++)createFish(tank.fish[j]);notify('New neighbours arrive. Watch for a new school.');save();}}}}
function help(w:number,h:number){const bw=Math.min(w-28,560),x=(w-bw)/2,y=Math.max(92,(h-430)/2);rect(x,y,bw,400,'#15352ffa',18);txt('Welcome to Oddwater',x+23,y+22,30,C.lime,'serif');const lines=compact?['A freshwater tank with impossible dreams.','Feed sparingly; uneaten food becomes waste.','Rinse the sponge to keep the filter flowing.','Plants and water changes control nitrate.','Fish earn Wonder. Snails and shrimp graze algae.','Buy fish, plants, then awaken three dreams.','Notebook: care, nurseries and tiny habitats.','Tap a fish. Gear / F1 opens graphics and sound.']:['A living freshwater tank with a slightly impossible imagination.','Feed sparingly. Fish eat sinking pellets; leftovers become waste.','Choose flakes for the schools, sinking pellets for corys.','Plants absorb nitrate. A 30% water change dilutes waste.','Notebook (J): foods, equipment, fry and shrimp habitats.','Spend Wonder on plants, fish groups, and three surreal dreams.','Drag the water to orbit. Scroll to zoom. Click a fish to inspect.','F feed · W water · P plant · D dream · Space pause · H help','Autosave is on. Gear / F1: graphics, sound, controls and accessibility.'];for(let i=0;i<lines.length;i++)txt(lines[i],x+23,y+80+i*26,compact?10:12,i===0?C.ink:C.muted);if(button('help-sound',soundEnabled()?'Sound on':'Sound off',x+23,y+335,110,'small',soundEnabled()))toggleSound();if(button('help-close','Back to the water',x+145,y+335,bw-168,'primary'))showHelp=false;}
function setCamera(){const f=frame(),aspect=f.width/f.height;camera.aspect=aspect;camera.updateProjectionMatrix();const wideFactor=aspect<1.2?1.2/aspect:1;const d=distance*wideFactor;camera.position.set(Math.sin(yaw)*d,2.5+Math.sin(pitch)*d,Math.cos(yaw)*Math.cos(pitch)*d);camera.lookAt(0,2.45,0);}
function pickFish(x:number,y:number){rehomeConfirmation=-1;let index=-1,best=34*S;for(let i=0;i<tank.fish.length;i++){const f=tank.fish[i],v=new Vector3(f.x,f.y,f.z);v.project(camera);const dx=(v.x*.5+.5)*width*S-x,dy=(-v.y*.5+.5)*height*S-y;const d=Math.sqrt(dx*dx+dy*dy);if(d<best){best=d;index=i;}}selected=index;selectedResident=undefined;const resident=residents?.pick(x,y,width*S,height*S,camera);if(resident){const p=resident.root.position.clone().project(camera);if(Math.hypot((p.x*.5+.5)*width*S-x,(-p.y*.5+.5)*height*S-y)<best){selected=-1;selectedResident=resident;}}if(selected>=0){if(observe(tank,'fish-'+tank.fish[selected]!.type)){notify('A new field-guide observation. +3 Wonder.');save();}}else if(selectedResident&&observe(tank,selectedResident.name)){notify('A new field-guide observation. +3 Wonder.');save();}if(index<0&&!selectedResident&&y/(height*S)>.55){const gx=clamp((x/(width*S)-.5)*18,-6.6,6.6);substrate?.model.disturb(gx,1.8,.7,1.1);}}
function overDetail(px:number,py:number){
 const x=px/S,y=py/S,by=height-(compact?145:122);
 if(selected>=0&&x>=width/2-160&&x<=width/2+160&&y>=by-270&&y<=by-12)return true;
 if(selectedResident&&x>=width/2-145&&x<=width/2+145&&y>=by-222&&y<=by-14)return true;
 if(tab==='shop'&&!compact&&x>=width/2-266&&x<=width/2+266&&y>=166&&y<=522)return true;
 return false;
}
onPointerButton(e=>{if(e.button!==0)return;if(e.pressed){if(ui.pointerOver()||showHelp||notebook.open||overDetail(e.x,e.y))return;dragging=true;downX=dragX=e.x;downY=dragY=e.y;moved=false;}else if(dragging){dragging=false;if(!moved){if(activeTool==='feed'){const x=clamp((e.x/(width*S)-.5)*15,-6,6);if(feed(tank,x,1)){aquariumWater?.ripple(x,1,.08);sound('feed');notify('A small sprinkle. The school is on its way.');save();}else notify('There is already plenty of food in the water.');activeTool='observe';}else pickFish(e.x,e.y);}}});
onPointerMove((x,y)=>{if(!dragging)return;const dx=x-dragX,dy=y-dragY;if(Math.abs(x-downX)+Math.abs(y-downY)>7)moved=true;if(moved){yaw=clamp(yaw-dx*.003,-1.1,1.1);pitch=clamp(pitch+dy*.002,.02,.65);}dragX=x;dragY=y;});
onWheel((_x,y)=>{if(!ui.pointerOver())distance=clamp(distance+y*.75,10.2,31);});
onAction(e=>{if(!e.pressed)return;if(e.action==='options')openMenu();else if(e.action==='target_feed')notebookAction('target-feed');else if(e.action==='notebook'){notebook.open=!notebook.open;showHelp=false;}else if(e.action==='pause')speed=speed===0?1:0;else if(e.action==='help'){showHelp=!showHelp;notebook.open=false;}else doAction(e.action);});
setReady(false,{label:'Loading the living aquarium',seconds:120});
onStart(async()=>{setBusy('Preparing the living aquarium',{seconds:120});setFixedRate(30);await prepareFishModels(frame().quality);void prepareSound().catch(error=>console.error('Aquarium audio: '+String(error)));buildTank();buildPlants();for(const f of tank.fish)createFish(f);for(let i=0;i<tank.dreams;i++)dreamObject(i);for(let i=0;i<50;i++)pelletVisuals.push(mesh(smallSphere,pelletMat,0,-10,0,.035,.027,.035));for(let i=9;i<tank.plants;i++)plant((Math.random()-.5)*11,(Math.random()-.5)*4,false);aquariumWater=new AquariumWater();aquariumWater.setQuality(frame().quality);residents=new Invertebrates(substrate!,tank);habitatGarden=new HabitatGarden(substrate!);habitatGarden.update(tank);setCamera();setBusy(null);setReady(true);});
onFixedUpdate(dt=>{time+=dt;saveClock+=dt;if(speed>0){const wasReady=tank.nursery?.ready,broodReady=tank.ecology.brood?.ready;advance(tank,dt,speed);if(tank.nursery?.ready&&!wasReady){notify('The nursery has hatched. Open Notebook to welcome two juveniles.');sound('dream');save();}if(tank.ecology.brood?.ready&&!broodReady){notify('The shrimp brood is ready. Visit Habitat / Colony.');sound('dream');save();}swim(tank,dt*Math.min(speed,3),time);substrate?.update(dt);residents?.update(dt,time,tank);}if(saveClock>12){save();saveClock=0;}});
onRender(()=>{lightOn=lightPreview==='auto'?isDay(tank):lightPreview==='day';sun.intensity=lightOn?2.8:.3;glow.color.set(lightOn?0xbbeeca:0x739fdb);glow.intensity=lightOn?8+tank.aerator:5;updateGraphics();setCamera();animateFish(time,speed===0);aquariumWater?.update(time,camera,lightOn,tank.aerator);if(filterBody){filterBody.scale.set(.65+tank.filter*.07,1.6+tank.filter*.22,.65+tank.filter*.07);filterBody.position.y=.95+tank.filter*.11;}
 for(let i=0;i<pelletVisuals.length;i++){const p=tank.pellets[i],m=pelletVisuals[i];m.visible=!!p;if(p)m.position.set(p.x,p.y,p.z);if(p){m.scale.setScalar(p.kind==='greens'?.07:p.kind==='sinking'?.034:.027);m.material=pelletMat;}}
 for(let i=0;i<plants.length;i++){const maturity=i<14||i>=32?.8+tank.plantGrowth*.35:.4;plants[i].scale.setScalar(maturity);plants[i].rotation.z=Math.sin(time*.6+i*.7)*.025;plants[i].rotation.x=Math.sin(time*.45+i)*.025;}
 habitatGarden?.update(tank);
 nurseryEggs.visible=!!tank.nursery;nurseryEggs.scale.setScalar(tank.nursery?.ready?1.3:1);
 const watched=selected>=0?tank.fish[selected]:undefined;selectionHalo.visible=!!watched||!!selectedResident;if(watched)selectionHalo.position.set(watched.x,watched.y-.18,watched.z);else if(selectedResident)selectionHalo.position.copy(selectedResident.root.position);
 for(let i=0;i<dreamObjects.length;i++){const d=dreamObjects[i];d.rotation.y=time*.18;d.position.y=(i===0?3.2:i===1?3.9:4.2)+Math.sin(time*.7+i)*.14;}
 hud();});
onSuspend(save);onQuit(save);
