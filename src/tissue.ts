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
