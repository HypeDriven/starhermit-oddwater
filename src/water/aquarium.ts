// Aquarium adaptation of StarHermit Engine's ocean-gpu reference effects:
// its four-cascade GPU FFT, wave-focused caustics and planar reflection.
// Finite tank optics and source ripples replace the open-ocean shoreline.
import {frame} from 'starhermit:engine';
import type {QualityTier} from 'starhermit:engine';
import {BoxGeometry,PlaneGeometry,SphereGeometry,Mesh,InstancedMesh,ShaderMaterial,Group,DoubleSide,BackSide,Vector3,Vector4,Matrix4,Quaternion,DataTexture,FloatType,RGBAFormat,renderer,scene} from 'starhermit:scene';
import type {PerspectiveCamera,MaterialHooks,Texture} from 'starhermit:scene';
import {OceanSim,defaultOceanParams,oceanSampleWgsl,N} from './ocean-sim.js';
import {WaveCaustics,CAUSTICS_WGSL} from './caustics.js';
import {PlanarReflection} from './reflection.js';
export const waterTime={value:0};
const sunDirection=new Vector3(-3,11,6).normalize();
const white=new DataTexture(new Float32Array([1,1,1,1]),1,1,RGBAFormat,FloatType);white.needsUpdate=true;
const zero=new DataTexture(new Float32Array(N*N*4*4),N,N*4,RGBAFormat,FloatType);zero.needsUpdate=true;
const causticUniform={value:white as Texture};
const sunlight={value:1};
// Material light hooks attach this to gravel, wood, rocks, leaves and fish.
export const causticLight=CAUSTICS_WGSL+`
fn light(l: Light) -> Light {
 var o=l;let depth=max(5.87-l.world.y,0.0);
 let entry=l.world.xz+uniforms.waterSun.xz*depth/max(uniforms.waterSun.y,0.1);
 let focused=clamp(wave_caustic(entry,depth,0.5),0.2,3.5);
 o.direct=l.direct*mix(1.0,focused,0.52*uniforms.daylight);
 return o;
}`;
export const causticUniforms={caustics:causticUniform,waterSun:{value:sunDirection},daylight:sunlight};
// Compose caustics with another light hook without duplicating its entry point.
export function submergedHooks(hooks:MaterialHooks={}):MaterialHooks{
 const light=hooks.light;
 return {...hooks,uniforms:{...hooks.uniforms,...causticUniforms},light:light?causticLight.replace('fn light(l: Light)','fn caustic_light(l: Light)')+'\n'+light.replace('return o;','return caustic_light(o);'):causticLight};
}
const common=`
fn ripple(p: vec2f) -> f32 {
 var h=sin(p.x*2.3+p.y*1.1+uniforms.time*1.4)*0.012+sin(p.y*4.2-p.x*0.7-uniforms.time*1.8)*0.007;
 let d=length(p-vec2f(6.35,-2.1));h=h+sin(d*18.0-uniforms.time*7.0)*exp(-d*0.7)*0.025;
 for(var i=0;i<8;i++){
  let r=uniforms.ripples[i];let age=uniforms.time-r.z;let dist=length(p-r.xy);
  let ring=dist-age*1.5;let envelope=exp(-ring*ring*12.0)*exp(-max(age,0.0)*0.8);
  if(age>=0.0&&age<8.0){h=h+sin(ring*18.0)*envelope*r.w;}
 }
 return h;
}
`;
const surfaceVertex=oceanSampleWgsl('displacement',4)+common+`
fn vertex(v: Vertex) -> Vertex {
 var o=v;let p=v.position.xz;
 let d=ocean_displacement(p);let wave=ripple(p);
 o.position.y=d.y*uniforms.fft+wave;
 let sx=(ripple(p+vec2f(0.025,0.0))-ripple(p-vec2f(0.025,0.0)))/0.05;
 let sz=(ripple(p+vec2f(0.0,0.025))-ripple(p-vec2f(0.0,0.025)))/0.05;
 o.normal=normalize(vec3f(-sx,1.0,-sz));o.v0=vec4f(o.normal,0.0);return o;
}`;
const surfaceFragment=`
fn fragment(f: Fragment) -> vec4f {
 let uv=screen_uv(f.coord);let V=normalize(camera_position()-f.world);var n=normalize(f.v0.xyz);
 if(dot(n,V)<0.0){n=-n;}
 let fresnel=0.02037+0.97963*pow(1.0-clamp(dot(n,V),0.0,1.0),5.0);
 let sceneD=textureSampleLevel(depth,depth_sampler,uv,0.0).r;
 let thick=clamp((sceneD-view_depth(f.world))/max(abs(dot(V,uniforms.forward)),0.2),0.0,8.0);
 let bend=n.xz*0.014*clamp(thick,0.0,2.0);
 let behind=textureSampleLevel(behind,behind_sampler,clamp(uv+bend,vec2f(0.002),vec2f(0.998)),0.0).rgb;
 let absorb=exp(-vec3f(0.075,0.023,0.013)*thick);
 let transmission=behind*absorb+vec3f(0.025,0.13,0.11)*(1.0-absorb);
 let rp=uniforms.reflectionMatrix*vec4f(f.world,1.0);
 let ruv=vec2f(rp.x/rp.w,1.0-rp.y/rp.w)+n.xz*0.018;
 let reflected=textureSampleLevel(reflection,reflection_sampler,clamp(ruv,vec2f(0.001),vec2f(0.999)),0.0);
 let room=mix(vec3f(0.12,0.25,0.22),reflected.rgb,reflected.a*uniforms.reflectOn);
 let H=normalize(V+uniforms.sun);
 let glint=pow(max(dot(n,H),0.0),320.0)*2.5*uniforms.daylight;
 let rim=smoothstep(0.85,1.0,pow(max(abs(f.world.x)/7.0,abs(f.world.z)/3.0),8.0));
 let color=mix(transmission,room,fresnel)+vec3f(0.85,1.0,0.85)*(glint+rim*0.035);
 return vec4f(color,0.96);
}`;
const bubbleVertex=`
fn vertex(v: Vertex) -> Vertex {var o=v;o.v0=vec4f(v.normal,v.position.y);return o;}
`;
const bubbleFragment=`
fn fragment(f: Fragment) -> vec4f {
 let V=normalize(camera_position()-f.world);let n=normalize(f.normal);
 let facing=clamp(abs(dot(n,V)),0.0,1.0);let edge=pow(1.0-facing,3.0);
 let H=normalize(V+normalize(vec3f(-0.25,1.0,0.65)));
 let highlight=pow(max(dot(n,H),0.0),180.0);
 let back=pow(max(dot(n,normalize(vec3f(0.7,-0.3,-1.0))),0.0),70.0);
 let rainbow=vec3f(0.56,0.9,1.0)+vec3f(0.24,0.12,0.06)*sin(facing*16.0+f.world.y*2.0);
 let c=rainbow*edge*0.55+vec3f(1.4,1.55,1.45)*highlight+vec3f(0.4,0.7,0.75)*back;
 return vec4f(c,clamp(edge*0.60+highlight*0.85+back*0.2,0.015,0.85));
}`;
// A bounded water volume: integrates only the camera ray's portion inside the tank.
// Scene depth terminates the ray at fish/rocks, preserving their silhouettes.
const volumeFragment=`
fn fragment(f: Fragment) -> vec4f {
 let cam=camera_position();let dir=normalize(f.world-cam);let inv=1.0/(dir+vec3f(0.000001));
 let a=(vec3f(-7.0,0.14,-3.0)-cam)*inv;let b=(vec3f(7.0,5.87,3.0)-cam)*inv;
 let nearP=min(a,b);let farP=max(a,b);
 let enter=max(max(nearP.x,nearP.y),nearP.z);let exit=min(min(farP.x,farP.y),farP.z);
 let uv=screen_uv(f.coord);let d=textureSampleLevel(depth,depth_sampler,uv,0.0).r;
 let opaque=d/max(dot(dir,uniforms.forward),0.05);let start=max(enter,0.0);let end=min(exit,opaque);
 let length=max(end-start,0.0);if(length<=0.0){discard;}
 let trans=exp(-vec3f(0.035,0.014,0.009)*length);
 var shafts=0.0;
 for(var i=0;i<24;i++){
  if(f32(i)>=uniforms.steps){break;}
  let q=cam+dir*(start+(f32(i)+0.5)*length/uniforms.steps);
  let depth=max(5.87-q.y,0.0);let u=q.xz+uniforms.sun.xz*depth/max(uniforms.sun.y,0.1);
  let ray=pow(max(0.0,sin(u.x*2.8+sin(u.y*3.2+uniforms.time*0.6))*sin(u.y*3.7+uniforms.time*0.4)),9.0);
  shafts=shafts+ray*exp(-depth*0.16)/uniforms.steps;
 }
 let alpha=clamp((1.0-(trans.r+trans.g+trans.b)/3.0)*0.75+shafts*0.065*uniforms.daylight,0.0,0.13);
 let bend=vec2f(sin(f.world.y*3.1+f.world.x*1.4+uniforms.time*0.65),cos(f.world.y*2.7-f.world.z*2.2+uniforms.time*0.5))*0.00045*min(length,5.0);
 let original=textureSampleLevel(behind,behind_sampler,clamp(uv+bend,vec2f(0.001),vec2f(0.999)),0.0).rgb;
 let transmitted=original*trans+vec3f(0.035,0.16,0.13)*(1.0-trans);
 let color=transmitted+shafts*vec3f(0.12,0.18,0.10)*uniforms.daylight;
 return vec4f(color,0.76+alpha);
}`;
export class AquariumWater{
 readonly group=new Group();readonly surface:Mesh;readonly bubbles:InstancedMesh;readonly volume:Mesh;
 private sim:OceanSim|undefined;private caustics:WaveCaustics|undefined;private reflection:PlanarReflection|undefined;
 private readonly forward=new Vector3();private readonly ripples=Array.from({length:8},()=>new Vector4(0,0,-100,0));private rippleIndex=0;
 private readonly material:ShaderMaterial;private readonly volumeMaterial:ShaderMaterial;
 private readonly matrix=new Matrix4();private readonly rotation=new Quaternion();private readonly position=new Vector3();private readonly scale=new Vector3();private lastTime=0;
 private readonly mirrorMatrix=new Matrix4();private quality:QualityTier='low';private pulse=0;
 constructor(){
  this.material=new ShaderMaterial({uniforms:{time:waterTime,ripples:{value:this.ripples},displacement:{value:zero},fft:{value:0},behind:{value:renderer.sceneColor??white},depth:{value:renderer.sceneDepth??white},reflection:{value:white},reflectionMatrix:{value:this.mirrorMatrix},reflectOn:{value:0},sun:{value:sunDirection},daylight:sunlight,forward:{value:this.forward}},vertexShader:surfaceVertex,fragmentShader:surfaceFragment,transparent:true,side:DoubleSide,depthWrite:false});
  const geometry=new PlaneGeometry(14,6,112,48);geometry.rotateX(-Math.PI/2);
  this.surface=new Mesh(geometry,this.material);this.surface.position.y=5.87;this.surface.renderOrder=20;this.group.add(this.surface);
  const bubblesMat=new ShaderMaterial({vertexShader:bubbleVertex,fragmentShader:bubbleFragment,transparent:true,depthWrite:false,side:DoubleSide});
  this.bubbles=new InstancedMesh(new SphereGeometry(1,14,10),bubblesMat,240);this.bubbles.frustumCulled=false;this.bubbles.renderOrder=30;this.group.add(this.bubbles);
  this.volumeMaterial=new ShaderMaterial({uniforms:{behind:{value:renderer.sceneColor??white},depth:{value:renderer.sceneDepth??white},forward:{value:this.forward},sun:{value:sunDirection},time:waterTime,steps:{value:12},daylight:sunlight},fragmentShader:volumeFragment,side:BackSide,transparent:true,depthWrite:false,depthTest:false});
  this.volume=new Mesh(new BoxGeometry(14,5.73,6),this.volumeMaterial);this.volume.position.y=3.005;this.volume.renderOrder=25;this.volume.frustumCulled=false;this.group.add(this.volume);
  scene.add(this.group);
 }
 ripple(x:number,z:number,strength=.06){this.ripples[this.rippleIndex]!.set(x,z,waterTime.value,strength);this.rippleIndex=(this.rippleIndex+1)%8;this.pulse=1;}
 setQuality(quality:QualityTier){
  this.quality=quality;this.bubbles.count={low:40,balanced:85,high:150,ultra:240}[quality];
  this.volumeMaterial.uniforms.steps!.value={low:4,balanced:8,high:16,ultra:24}[quality];
  this.volume.visible=quality!=='low';
  if((quality==='high'||quality==='ultra')&&!this.sim){
   const p=defaultOceanParams();p.windSpeed=2.2;p.fetchKm=.3;p.waveScale=.28;p.swellScale=0;p.capillaryFade=.012;p.choppiness=.25;
   this.sim=new OceanSim(p,7117);this.caustics=new WaveCaustics(this.sim.slope[2]!);this.reflection=new PlanarReflection(quality==='ultra'?.65:.35);
   causticUniform.value=this.caustics.texture;
  }
  this.material.uniforms.fft!.value=quality==='low'||quality==='balanced'?0:1;
  this.material.uniforms.reflectOn!.value=quality==='low'||quality==='balanced'?0:1;
 }
 update(time:number,camera:PerspectiveCamera,daylight:boolean,airLevel=0){
  const dt=Math.max(0,Math.min(.1,time-this.lastTime));this.lastTime=time;waterTime.value=time;sunlight.value=daylight?1:.12;camera.getWorldDirection(this.forward);
  this.pulse=Math.max(0,this.pulse-dt*.6);
  this.bubbles.count=Math.round(({low:40,balanced:85,high:150,ultra:240}[this.quality])*(.65+Math.min(2,airLevel)*.175));
  const count=this.bubbles.count;
  for(let i=0;i<count;i++){
   const micro=i%4!==0;const speed=micro?.38+(i%9)*.032:.72+(i%7)*.05;
   const age=(time*speed+i*.197)%5.1;const y=.75+age;
   const r=(micro?.018:.045)+(i%5)*.006;const spread=.035+age*.018;
   this.position.set(6.4+Math.sin(time*2.6+i*2.4)*spread+Math.sin(age*8+i)*.018,y,-2.12+Math.cos(time*2+i*4.9)*spread);
   const wobble=Math.sin(time*5+i)*.09;this.scale.set(r*(1+wobble),r*(1-wobble),r);
   this.matrix.compose(this.position,this.rotation,this.scale);this.bubbles.setMatrixAt(i,this.matrix);
   if(age>4.96&&i%8===0&&frame().frame%10===0)this.ripple(this.position.x,this.position.z,.009);
  }
  const advanced=this.quality==='high'||this.quality==='ultra';
  if(advanced&&this.sim&&this.caustics&&this.reflection){
   const stride=this.quality==='ultra'?2:4;
   if(frame().frame%stride===0||frame().frame===1){this.sim.update(dt*stride);this.caustics.update(sunDirection);this.material.uniforms.displacement!.value=this.sim.displacement;}
   if(frame().frame%(this.quality==='ultra'?2:6)===0||frame().frame===1){
    this.reflection.setSize(frame().width,frame().height);
    this.group.visible=false;this.reflection.render(scene,camera);this.group.visible=true;
    this.material.uniforms.reflection!.value=this.reflection.target.texture;
    this.mirrorMatrix.copy(this.reflection.textureMatrix);
   }
  }
 }
}
