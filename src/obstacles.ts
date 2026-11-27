// Solid hardscape shared by the scene (main.ts builds the meshes from these numbers) and the fish
// simulation (fish steer around and are kept out of them). Pure data and math: no engine imports.

/** A noisy rock: an ellipsoid with radii `r`, turned by Euler XYZ angles `rot`. */
export interface Rock {x:number;y:number;z:number;r:[number,number,number];rot:[number,number,number];color:number}
/** A driftwood branch: a capsule from a to b with end radii ra and rb. */
export interface Branch {a:[number,number,number];b:[number,number,number];ra:number;rb:number}
/** An axis-aligned box (the sponge filter). */
export interface Box {x:number;y:number;z:number;hx:number;hy:number;hz:number}

const hash=(n:number)=>{const v=Math.sin(n*12.9898+4.1414)*43758.5453;return v-Math.floor(v);};
/** The rock mesh's noise pushes its surface out to about this share of the radii. */
export const ROCK_NOISE=1.165;
export const rocks:Rock[]=Array.from({length:8},(_,i)=>({
 x:Math.sin(i*5.2)*2+.8,y:.35+hash(i)*.25,z:Math.cos(i*3.7)*1.1-.6,
 r:[.5+hash(i+10)*.5,.4+hash(i+20)*.6,.5+hash(i+30)*.4],rot:[.3*i,.4*i,.2*i],color:[0x545e50,0x6b7460,0x414e45][i%3]!,
}));
const trunk:[number,number,number][]=[[-4,.1,-.3],[-3.5,.8,-.5],[-2.4,1.5,-.5],[-1.1,2.1,-.7],[.2,2.7,-.8],[1.1,3.1,-1.2],[2.2,3.4,-1.5]];
export const branches:Branch[]=[
 ...trunk.slice(1).map((b,k)=>({a:trunk[k]!,b,ra:.28-(k+1)*.025,rb:.25-(k+1)*.026})),
 {a:[-1,2.2,-.7],b:[-.2,3.4,-1],ra:.11,rb:.025},
 {a:[-2.5,1.4,-.5],b:[-3.2,2.7,-1.4],ra:.12,rb:.03},
 {a:[-3.4,.8,-.5],b:[-4.7,.15,1.1],ra:.16,rb:.04},
 {a:[.3,2.7,-.8],b:[2.6,.2,-1],ra:.13,rb:.07},
];
/** The sponge filter for upgrade level `filter` (it grows with upgrades), and its lift tube. */
export function filterBox(filter:number):Box{return {x:6.45,y:.95+filter*.11,z:-2.15,hx:(.65+filter*.07)/2,hy:(1.6+filter*.22)/2,hz:(.65+filter*.07)/2};}
export const liftTube:Branch={a:[6.45,1,-2.15],b:[6.45,5.5,-2.15],ra:.055,rb:.055};

type V=[number,number,number];
/** Rotation matrix rows for Euler XYZ (three.js order: R = Rx·Ry·Rz). */
function rotation([a,b,c]:V){const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
 return [[cb*cc,-cb*sc,sb],[ca*sc+sa*sb*cc,ca*cc-sa*sb*sc,-sa*cb],[sa*sc-ca*sb*cc,sa*cc+ca*sb*sc,ca*cb]];}
const rockFrames=rocks.map(r=>rotation(r.rot));

/** How far point p is inside a solid (negative: outside by that much, roughly) and the outward
 * direction, for a sphere of radius `pad` around p. Undefined when clear of everything. */
export interface Contact{depth:number;nx:number;ny:number;nz:number}
export function contact(px:number,py:number,pz:number,pad:number,filter:number):Contact|undefined{
 let best:Contact|undefined;
 const keep=(depth:number,nx:number,ny:number,nz:number)=>{if(depth>0&&(!best||depth>best.depth)){const l=Math.hypot(nx,ny,nz)||1;best={depth,nx:nx/l,ny:ny/l,nz:nz/l};}};
 for(let i=0;i<rocks.length;i++){
  const r=rocks[i]!,m=rockFrames[i]!,dx=px-r.x,dy=py-r.y,dz=pz-r.z;
  if(dx*dx+dy*dy+dz*dz>(1.4+pad)**2)continue;
  // Into the rock's frame (Rᵀ·d), scaled to a unit sphere by the padded radii.
  const lx=m[0]![0]!*dx+m[1]![0]!*dy+m[2]![0]!*dz,ly=m[0]![1]!*dx+m[1]![1]!*dy+m[2]![1]!*dz,lz=m[0]![2]!*dx+m[1]![2]!*dy+m[2]![2]!*dz;
  const ax=r.r[0]*ROCK_NOISE+pad,ay=r.r[1]*ROCK_NOISE+pad,az=r.r[2]*ROCK_NOISE+pad;
  const k=Math.hypot(lx/ax,ly/ay,lz/az);if(k>=1)continue;
  // The ellipsoid's gradient, back to world space; depth along it in world units.
  const gx=lx/(ax*ax),gy=ly/(ay*ay),gz=lz/(az*az);
  const wx=m[0]![0]!*gx+m[0]![1]!*gy+m[0]![2]!*gz,wy=m[1]![0]!*gx+m[1]![1]!*gy+m[1]![2]!*gz,wz=m[2]![0]!*gx+m[2]![1]!*gy+m[2]![2]!*gz;
  keep((1-k)*Math.min(ax,ay,az),k<1e-4?0:wx,k<1e-4?1:wy,k<1e-4?0:wz);
 }
 for(const b of [...branches,liftTube]){
  const ex=b.b[0]-b.a[0],ey=b.b[1]-b.a[1],ez=b.b[2]-b.a[2],len2=ex*ex+ey*ey+ez*ez;
  const t=Math.max(0,Math.min(1,((px-b.a[0])*ex+(py-b.a[1])*ey+(pz-b.a[2])*ez)/len2));
  const cx=b.a[0]+ex*t,cy=b.a[1]+ey*t,cz=b.a[2]+ez*t,dx=px-cx,dy=py-cy,dz=pz-cz,d=Math.hypot(dx,dy,dz);
  const rad=b.ra+(b.rb-b.ra)*t+pad;if(d<rad)keep(rad-d,d>1e-4?dx:0,d>1e-4?dy:1,d>1e-4?dz:0);
 }
 const f=filterBox(filter),qx=Math.abs(px-f.x)-f.hx-pad,qy=Math.abs(py-f.y)-f.hy-pad,qz=Math.abs(pz-f.z)-f.hz-pad;
 if(qx<0&&qy<0&&qz<0){if(qx>=qy&&qx>=qz)keep(-qx,Math.sign(px-f.x),0,0);else if(qy>=qz)keep(-qy,0,Math.sign(py-f.y),0);else keep(-qz,0,0,Math.sign(pz-f.z));}
 return best;
}
