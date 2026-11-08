// Thin-sheet transmission + wrapped subsurface diffusion in the engine's light hook.
// Uses actual incident sun color/direction, tissue thickness and shadowing.
// MeshPhysicalMaterial's transmission/SSS fields are not rendered in engine 1.38.
export const leafScattering = `
fn light(l: Light) -> Light {
 var o=l;
 let ndl=dot(normalize(l.normal),normalize(l.sun_direction));
 let thickness=0.12+0.58*exp(-abs(l.uv.x-0.5)*12.0);
 let transmission=exp(-vec3f(2.9,0.85,3.8)*thickness);
 let back=pow(max(-ndl,0.0),0.7);
 let wrap=clamp((ndl+0.5)/1.5,0.0,1.0)*0.13;
 let tissue=l.base_color.rgb*transmission;
 o.direct=l.direct+l.sun_color*tissue*(back*0.58+wrap)*(0.35+0.65*l.shadow);
 return o;
}`;
export const fishScattering = `
fn light(l: Light) -> Light {
 var o=l;
 let ndl=dot(normalize(l.normal),normalize(l.sun_direction));
 let tail=1.0-smoothstep(-0.30,0.05,l.v0.x);
 let fin=clamp(abs(l.v0.y)*3.5+tail,0.0,1.0);
 let thickness=mix(0.85,0.13,fin);
 let transmission=exp(-vec3f(0.75,1.65,2.0)*thickness);
 let back=pow(max(-ndl,0.0),0.8);
 let wrap=clamp((ndl+0.35)/1.35,0.0,1.0)*0.08;
 o.direct=l.direct+l.sun_color*l.base_color.rgb*transmission*(back*mix(0.12,0.46,fin)+wrap)*(0.4+0.6*l.shadow);
 return o;
}`;

// Primitive thickness in tank units, including the resident's growth scale.
// Spheres have unit radius; rods and shell spirals supply their local diameter.
export const invertebrateThickness = `
fn vertex(v: Vertex) -> Vertex {
 var o=v;
 let m=model_matrix();
 let scale=min(length(m[0].xyz),min(length(m[1].xyz),length(m[2].xyz)));
 let diameter=select(2.0,v.custom.x,v.custom.x>0.0);
 o.v0=vec4f(diameter*scale,0.0,0.0,0.0);
 return o;
}`;
function invertebrateScattering(absorption:[number,number,number],strength:number){return `
fn light(l: Light) -> Light {
 var o=l;
 let n=normalize(l.normal);
 let sun=normalize(l.sun_direction);
 let view=normalize(camera_position()-l.world);
 let ndl=dot(n,sun);
 // Shorter paths at grazing angles reveal thin tissue around the silhouette.
 let thickness=max(l.v0.x,0.001)*mix(0.35,1.0,abs(ndl));
 let transmission=exp(-vec3f(${absorption.map(n=>n.toFixed(2)).join(',')})*thickness);
 let back=pow(max(-ndl,0.0),0.75);
 let forward=pow(max(dot(-sun,view),0.0),5.0);
 let wrap=max(clamp((ndl+0.45)/1.45,0.0,1.0)-max(ndl,0.0),0.0);
 let tissue=l.base_color.rgb*transmission;
 o.direct=l.direct+l.sun_color*tissue*(back*(0.25+forward*0.35)+wrap*0.3)*${strength.toFixed(2)}*(0.2+0.8*l.shadow);
 return o;
}`;}
export const cherryScattering=invertebrateScattering([2.2,13,18],.95);
export const amanoScattering=invertebrateScattering([4,6.8,8.5],.85);
export const snailScattering=invertebrateScattering([5.2,3.5,8],.75);
export const shellScattering=invertebrateScattering([16,22,34],.12);
