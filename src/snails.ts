// Snails ported from SimPond's life/shells.rs: shells grown by David Raup's coiling model (1966),
// painted by one shell program from shell coordinates carried as vertex attributes, over a soft
// body (foot, head, snout, tentacles, eyes) that creeps with pedal waves and withdraws to rest.
//
// The coiling model: a closed aperture outline sweeps round the coiling axis. Going back from the
// aperture by θ (θ ≤ 0) it shrinks by W^(θ/2π), turns by θ, keeps its inner edge at the share D of
// its outer edge's distance from the axis and slides along the axis by T times its distance from
// it; S is the aperture's height over its width. The wall has thickness, a rolled lip joins the
// outside to the inside, and the apex closes by shrinking the first 1.5% of the tube.
//
// Shell attributes: custom = (turn θ/2π, round φ/2π, wall 1 outside .. 0 inside, 0);
// uv = (log growth, distance round the outline). Body attributes: custom = (part: 0 foot, 1 head,
// 2 tentacle, 3 eye; along the body or tentacle 0..1; side -1..1; local diameter).
import {Group,Mesh,BufferGeometry,Float32BufferAttribute,MeshStandardMaterial,DoubleSide,Vector3,Vector4,Matrix4,Color} from 'starhermit:scene';
import {submergedHooks} from './water/aquarium.js';
import {snailScattering,shellScattering} from './tissue.js';

export type SnailKind='nerite'|'ramshorn';
export interface SnailContext {ground:(x:number,z:number)=>number;}
export interface SnailIntent {target?:{x:number;z:number}|undefined;mode:'graze'|'rest'|'glass'|'feed';speed:number;}

/** A shell's form, sculpture and colours (Raup's W, D, T, S and the rest), as in SimPond. */
interface ShellParams {
 w:number;d:number;t:number;s:number;turns:number;shoulder:number;taper:number;canal:number;tilt:number;lean:number;
 ribs:number;ribH:number;cords:number;cordH:number;knobs:number;sharp:number;wall:number;lip:number;carry:number;
 color:number;pattern:number;body:number;flames:number;flameN:number;bands:number;bandN:number;mottle:number;lines:number;lineN:number;nacre:number;
}
const BASE:ShellParams={w:2.5,d:.1,t:1.5,s:1.2,turns:5,shoulder:0,taper:0,canal:0,tilt:0,lean:0,ribs:0,ribH:0,cords:0,cordH:0,knobs:0,sharp:2,wall:.08,lip:.3,carry:.35,
 color:0x8a6e48,pattern:0x4a3420,body:0x5a5444,flames:0,flameN:10,bands:0,bandN:3,mottle:0,lines:.3,lineN:40,nacre:0};
const SHELLS:Record<SnailKind,ShellParams>={
 // Zebra nerite: SimPond's river nerite (a low spire, an enormous last whorl, a D-shaped aperture)
 // in olive-gold with dense black zigzag flames along the growth lines.
 nerite:{...BASE,w:9,d:.02,t:.55,s:1.05,turns:2.6,shoulder:.25,tilt:-.25,lean:.35,wall:.1,lip:.2,carry:.15,
  color:0xb89a3a,pattern:0x16120c,body:0x8f887c,flames:.95,flameN:13,mottle:.08,lines:.25,lineN:40},
 // Great ramshorn (Planorbarius corneus): planispiral, the whorls side by side, red-brown.
 ramshorn:{...BASE,w:2.1,d:.36,t:0,s:1.15,turns:4.5,lean:.1,wall:.07,lip:.2,carry:0,
  color:0x6e3a22,pattern:0x2e1a10,body:0x5c2a26,bands:.25,bandN:2,lines:.5,lineN:70},
};
/** Shell length in tank units (1 unit ≈ 7 cm), a little generous so they read in the tank. */
const LENGTH:Record<SnailKind,number>={nerite:.3,ramshorn:.36};

const TAU=Math.PI*2;
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const crest=(x:number,k:number)=>Math.pow(Math.max(0,.5+.5*Math.cos(x)),k);
const wrap=(a:number)=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
type V=[number,number,number];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(a:V):V=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};

/** Mesh resolution (SimPond's HI detail): points round the aperture, rings per turn and per unit of tube length. */
const DETAIL={around:24,maxAround:66,perTurn:14,step:.34,perRib:3,lip:4,innerTurns:.85};

class Geo {pos:number[]=[];nrm:number[]=[];uv:number[]=[];cus:number[]=[];idx:number[]=[];
 get count(){return this.pos.length/3;}
 bbox(){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<this.pos.length;i++){const k=i%3;lo[k]=Math.min(lo[k]!,this.pos[i]!);hi[k]=Math.max(hi[k]!,this.pos[i]!);}return {lo,hi};}
 /** Face normals summed per vertex; `weld` also joins vertices that share a position (seams, poles). */
 normals(weld:boolean){
  const n=this.count,acc=new Float64Array(n*3),p=this.pos;
  for(let t=0;t<this.idx.length;t+=3){const a=this.idx[t]!*3,b=this.idx[t+1]!*3,c=this.idx[t+2]!*3;
   const e1:V=[p[c]!-p[b]!,p[c+1]!-p[b+1]!,p[c+2]!-p[b+2]!],e2:V=[p[a]!-p[b]!,p[a+1]!-p[b+1]!,p[a+2]!-p[b+2]!],f=cross(e1,e2);
   for(const o of [a,b,c]){acc[o]+=f[0];acc[o+1]+=f[1];acc[o+2]+=f[2];}}
  if(weld){const groups=new Map<string,number[]>();for(let i=0;i<n;i++){const key=Math.round(p[i*3]!*1e4)+','+Math.round(p[i*3+1]!*1e4)+','+Math.round(p[i*3+2]!*1e4)+','+this.cus[i*4];let g=groups.get(key);if(!g)groups.set(key,g=[]);g.push(i);}
   for(const g of groups.values()){if(g.length<2)continue;let x=0,y=0,z=0;for(const i of g){x+=acc[i*3]!;y+=acc[i*3+1]!;z+=acc[i*3+2]!;}for(const i of g){acc[i*3]=x;acc[i*3+1]=y;acc[i*3+2]=z;}}}
  this.nrm=[];for(let i=0;i<n;i++){const v=norm([acc[i*3]!,acc[i*3+1]!,acc[i*3+2]!]);this.nrm.push(...v);}
 }
 add(g:Geo){const base=this.count;this.pos.push(...g.pos);this.nrm.push(...g.nrm);this.uv.push(...g.uv);this.cus.push(...g.cus);for(const i of g.idx)this.idx.push(i+base);}
 geometry(){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(this.pos,3));g.setAttribute('normal',new Float32BufferAttribute(this.nrm,3));g.setAttribute('uv',new Float32BufferAttribute(this.uv,2));g.setAttribute('custom',new Float32BufferAttribute(this.cus,4));g.setIndex(this.idx);g.computeBoundingSphere();return g;}
}

/** The coiling model for one parameter set. */
class Coil {
 rc=1;readonly k:number;readonly th0:number;
 constructor(readonly p:ShellParams){
  const d=clamp(p.d,-.95,.9);this.k=Math.log(Math.max(p.w,1.01))/TAU;this.th0=-Math.max(p.turns,.2)*TAU;
  // The outline's inner and outer edges (radially, as shaped and tilted): the centre's distance from the axis makes inner over outer D.
  let lo=Infinity,hi=-Infinity;for(let i=0;i<256;i++){const a=this.outline(i/256*TAU)[0];lo=Math.min(lo,a);hi=Math.max(hi,a);}
  this.rc=(d*hi-lo)/(1-d);
 }
 size(th:number){return Math.exp(this.k*th);}
 /** The aperture outline at φ (0 outermost, π/2 toward the apex): (radial, axial), half width 1. */
 outline(phi:number):[number,number]{
  const p=this.p,s=Math.sin(phi),c=Math.cos(phi);
  // A superellipse whose top-outer quadrant squares off with the shoulder.
  const e=c>0&&s>0?2/(2+7*p.shoulder):1;
  let a=Math.sign(c)*Math.pow(Math.abs(c),e),b=Math.sign(s)*Math.pow(Math.abs(s),e)*p.s;
  a*=1+.45*p.taper*s;
  if(p.canal>0){const g=Math.exp(-((wrap(phi-1.5*Math.PI+.25)/.32)**2));b-=p.canal*p.s*1.1*g;a+=(-.25-a)*g*Math.min(.75*p.canal,.85);}
  const ts=Math.sin(p.tilt),tc=Math.cos(p.tilt);return [a*tc-b*ts,a*ts+b*tc];
 }
 /** Radial relief at (θ, φ); `fr` and `fc` fade ribs and cords the mesh cannot resolve. */
 relief(th:number,phi:number,fr:number,fc:number){
  const p=this.p;let r=0;
  if(p.ribs>0){const rib=crest(th*p.ribs,p.sharp);r+=p.ribH*rib*fr;if(p.knobs>0)r+=p.knobs*rib*rib*Math.exp(-((wrap(phi-.3*Math.PI)/.45)**2))*fr;}
  if(p.cords>0)r+=p.cordH*crest((phi-Math.PI)*p.cords,p.sharp)*fc;
  return r;
 }
 /** The apex closes: the first 1.5% of the tube shrinks to its centreline. */
 closure(th:number){const u=clamp((th-this.th0)/(-this.th0)/.015,0,1);return Math.sqrt(1-(1-u)*(1-u));}
 /** A point of the outline (a, b) on the tube at θ. */
 place(th:number,a:number,b:number):V{
  const s=this.size(th),ls=Math.sin(this.p.lean),lc=Math.cos(this.p.lean),r=this.rc+a,y=-this.p.t*this.rc+b*lc,tau=b*ls,sn=Math.sin(th),cs=Math.cos(th);
  return [(r*cs-tau*sn)*s,y*s,(r*sn+tau*cs)*s];
 }
 /** Ring angles from apex to aperture: dense enough to coil smoothly and keep the tube's segments near square. */
 rings(){
  const p=this.p,M=2048,dth=-this.th0/M;
  const density=(th:number)=>{const s=this.size(th);let d=Math.max(DETAIL.perTurn/TAU,s*(this.rc+1.2)/DETAIL.step);if(p.ribs>0)d=Math.max(d,p.ribs*DETAIL.perRib/TAU*smooth(.12,.35,s*(this.rc+1)));return d;};
  const cum=new Float64Array(M+1);for(let i=0;i<M;i++)cum[i+1]=cum[i]!+density(this.th0+(i+.5)*dth)*dth;
  const n=Math.max(4,Math.ceil(cum[M]!)),out:number[]=[];let j=0;
  for(let i=0;i<=n;i++){const c=cum[M]!*i/n;while(j<M-1&&cum[j+1]!<c)j++;const f=clamp((c-cum[j]!)/Math.max(cum[j+1]!-cum[j]!,1e-9),0,1);out.push(this.th0+(j+f)*dth);}
  out[n]=0;return out;
 }
}

/** The shell's tube in the coiling frame (axis +Y, apex at the origin, the aperture at θ = 0 on +X):
 * outside from apex to aperture, the rolled lip, then the inside back into the shell, as one grid. */
function tube(coil:Coil):Geo{
 const p=coil.p;let around=DETAIL.around;if(p.cords>0)around=Math.max(around,Math.min(Math.ceil(p.cords*2.6),DETAIL.maxAround));
 const fc=clamp((around/Math.max(p.cords,1e-3)-1.8)/.8,0,1);
 const phis=Array.from({length:around+1},(_,j)=>j/around*TAU),pts=phis.map(f=>coil.outline(f));
 const arc=[0];for(let j=1;j<pts.length;j++)arc.push(arc[j-1]!+Math.hypot(pts[j]![0]-pts[j-1]![0],pts[j]![1]-pts[j-1]![1]));
 const total=Math.max(arc[around]!,1e-6),ths=coil.rings(),n=ths.length;
 const ribFade=(i:number)=>{if(p.ribs<=0)return 0;const step=i+1<n?ths[i+1]!-ths[i]!:ths[i]!-ths[i-1]!;return clamp((TAU/p.ribs/Math.max(step,1e-5)-2.2)/1.2,0,1);};
 const rings:{th:number;base:number;rel:number;fr:number;wall:number}[]=ths.map((th,i)=>({th,base:coil.closure(th),rel:coil.closure(th),fr:ribFade(i),wall:1}));
 // The lip: from outside (α = 0) over the rim to inside (α = π), rolled forward and out.
 const wall=p.wall,fr0=ribFade(n-1),reach=(.5*wall+.4*p.lip*wall)/(coil.rc+1);
 for(let q=1;q<DETAIL.lip;q++){const al=Math.PI*q/DETAIL.lip,sa=Math.sin(al),ca=Math.cos(al),out=1,inn=1-wall;
  rings.push({th:reach*sa,base:(out+inn)*.5+(out-inn)*.5*ca+p.lip*wall*sa,rel:.75+.25*ca,fr:fr0,wall:.5+.5*ca});}
 // The inside ends a turn or so in (it is dark there); every other ring is plenty.
 const stop=p.turns<1.3?coil.th0:-DETAIL.innerTurns*TAU;
 for(let i=n-1;i>=0;i--){const th=ths[i]!;if(th<stop)break;if(i%2===1&&i!==n-1)continue;const k=coil.closure(th);rings.push({th,base:k*(1-wall),rel:k*.5,fr:ribFade(i),wall:0});}
 const g=new Geo();
 for(const r of rings)for(let j=0;j<=around;j++){const [a,b]=pts[j]!,phi=phis[j]!,m=r.base+r.rel*coil.relief(r.th,phi,r.fr,fc);g.pos.push(...coil.place(r.th,a*m,b*m));g.uv.push(r.th*coil.k,arc[j]!/total);g.cus.push(r.th/TAU,phi/TAU,r.wall,0);}
 const w=around+1;
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<around;j++){const a=r*w+j,b=a+1,c=(r+1)*w+j+1,d=(r+1)*w+j;g.idx.push(a,b,c,a,c,d);}
 g.normals(false);
 // The outline's seam: both copies of each ring's first point share one normal.
 for(let r=0;r<rings.length;r++){const i0=r*w*3,i1=(r*w+around)*3,v=norm([g.nrm[i0]!+g.nrm[i1]!,g.nrm[i0+1]!+g.nrm[i1+1]!,g.nrm[i0+2]!+g.nrm[i1+2]!]);for(const i of [i0,i1])for(let k=0;k<3;k++)g.nrm[i+k]=v[k]!;}
 // The apex ring is a point: borrow the next ring's normals.
 for(let j=0;j<w*3;j++)g.nrm[j]=g.nrm[j+w*3]!;
 // Outward on the outside: compare the aperture ring's normals with the way out of the tube.
 const last=(n-1)*w,centre=coil.place(0,0,0);let sign=0;
 for(let j=0;j<around;j++){const i=(last+j)*3;sign+=dot([g.pos[i]!-centre[0],g.pos[i+1]!-centre[1],g.pos[i+2]!-centre[2]],[g.nrm[i]!,g.nrm[i+1]!,g.nrm[i+2]!]);}
 if(sign<0){for(let t=0;t<g.idx.length;t+=3){const x=g.idx[t+1]!;g.idx[t+1]=g.idx[t+2]!;g.idx[t+2]=x;}for(let i=0;i<g.nrm.length;i++)g.nrm[i]=-g.nrm[i]!;}
 return g;
}

// ---- soft body ------------------------------------------------------------------------------

/** An ellipsoid (three.js sphere layout) tagged for the body hook; `shape` may deform each point. */
function blob(c:V,r:V,seg:number,part:number,diameter:number,along:(z:number)=>number,shape?:(p:V)=>V):Geo{
 const g=new Geo(),hs=Math.max(4,Math.round(seg*.7));
 for(let iy=0;iy<=hs;iy++)for(let ix=0;ix<=seg;ix++){const th=iy/hs*Math.PI,ph=ix/seg*TAU;let q:V=[-r[0]*Math.cos(ph)*Math.sin(th)+c[0],r[1]*Math.cos(th)+c[1],r[2]*Math.sin(ph)*Math.sin(th)+c[2]];if(shape)q=shape(q);g.pos.push(...q);g.uv.push(ix/seg,iy/hs);g.cus.push(part,along(q[2]),0,diameter);}
 for(let iy=0;iy<hs;iy++)for(let ix=0;ix<seg;ix++){const a=iy*(seg+1)+ix+1,b=iy*(seg+1)+ix,c=(iy+1)*(seg+1)+ix,d=(iy+1)*(seg+1)+ix+1;if(iy!==0)g.idx.push(a,b,d);if(iy!==hs-1)g.idx.push(b,c,d);}
 return g;
}
/** A tapering tentacle from `a` to `b` in `rings` sections, closed by a rounded tip. */
function tentacle(a:V,b:V,r0:number,r1:number,side:number):Geo{
 const g=new Geo(),sides=6,rings=7,dir=norm([b[0]-a[0],b[1]-a[1],b[2]-a[2]]),len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
 const u=norm(Math.abs(dir[1])<.9?cross(dir,[0,1,0]):cross(dir,[1,0,0])),w=cross(dir,u);
 for(let i=0;i<=rings+1;i++){
  // The last ring is the tip's point, a little past the end.
  const t=i<=rings?i/rings:1,rad=i<=rings?r0+(r1-r0)*t:0,ext=i<=rings?0:r1*.9;
  for(let j=0;j<=sides;j++){const an=j/sides*TAU,cx=Math.cos(an)*rad,cy=Math.sin(an)*rad;
   g.pos.push(a[0]+dir[0]*(len*t+ext)+u[0]*cx+w[0]*cy,a[1]+dir[1]*(len*t+ext)+u[1]*cx+w[1]*cy,a[2]+dir[2]*(len*t+ext)+u[2]*cx+w[2]*cy);g.uv.push(j/sides,t);g.cus.push(2,t,side,Math.max(rad,r1)*2);}}
 for(let i=0;i<=rings;i++)for(let j=0;j<sides;j++){const p=i*(sides+1)+j,q=p+sides+1;g.idx.push(p,q,p+1,p+1,q,q+1);}
 return g;
}

interface Built {footW:number;shell:BufferGeometry;body:BufferGeometry;footY:number;zc:number;head:number;tail:number;wallScale:number;}
const built=new Map<SnailKind,Built>();
/** A species' meshes in model space (+Z forward, +Y up, shell length 1, the aperture's foot at y = 0). */
function build(kind:SnailKind):Built{
 const cached=built.get(kind);if(cached)return cached;
 const p=SHELLS[kind],coil=new Coil(p);
 // The aperture's centre, its plane's normal (facing out of the opening) and the way back to the apex.
 let ca=0,cb=0;for(let i=0;i<64;i++){const [a,b]=coil.outline(i/64*TAU);ca+=a/64;cb+=b/64;}
 const ap=coil.place(0,ca,cb),normal:V=[0,-Math.sin(p.lean),Math.cos(p.lean)],na=-dot(ap,normal);
 let back:V=[-ap[0]-normal[0]*na,-ap[1]-normal[1]*na,-ap[2]-normal[2]*na];if(Math.hypot(...back)<1e-3)back=[-1,0,0];back=norm(back);
 // Model: the aperture faces down onto the foot, the apex points back, then the spire is raised.
 const ey:V=[-normal[0],-normal[1],-normal[2]],ez:V=[-back[0],-back[1],-back[2]],ex=norm(cross(ey,ez)),cs=Math.cos(p.carry),sn=Math.sin(p.carry);
 const ey2:V=[ey[0]*cs-ez[0]*sn,ey[1]*cs-ez[1]*sn,ey[2]*cs-ez[2]*sn],ez2:V=[ey[0]*sn+ez[0]*cs,ey[1]*sn+ez[1]*cs,ey[2]*sn+ez[2]*cs];
 const g=tube(coil);
 for(let i=0;i<g.count;i++){const q:V=[g.pos[i*3]!-ap[0],g.pos[i*3+1]!-ap[1],g.pos[i*3+2]!-ap[2]],n:V=[g.nrm[i*3]!,g.nrm[i*3+1]!,g.nrm[i*3+2]!];
  g.pos[i*3]=dot(ex,q);g.pos[i*3+1]=dot(ey2,q);g.pos[i*3+2]=dot(ez2,q);g.nrm[i*3]=dot(ex,n);g.nrm[i*3+1]=dot(ey2,n);g.nrm[i*3+2]=dot(ez2,n);}
 const box=g.bbox(),len=Math.max(box.hi[0]!-box.lo[0]!,box.hi[1]!-box.lo[1]!,box.hi[2]!-box.lo[2]!,1e-6);
 for(let i=0;i<g.pos.length;i++)g.pos[i]=g.pos[i]!/len;
 // The aperture ring's extent, for the foot.
 const rl=[Infinity,Infinity,Infinity],rh=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<g.count;i++)if(Math.abs(g.cus[i*4]!)<.02&&g.cus[i*4+2]!>.99)for(let k=0;k<3;k++){rl[k]=Math.min(rl[k]!,g.pos[i*3+k]!);rh[k]=Math.max(rh[k]!,g.pos[i*3+k]!);}
 for(let i=0;i<g.count;i++)g.pos[i*3+1]=g.pos[i*3+1]!-rl[1]!;
 const w=Math.max(rh[0]!-rl[0]!,.15),l=Math.max(rh[2]!-rl[2]!,.2),zc=(rl[2]!+rh[2]!)*.5;
 // The soft body: a broad, flat-soled foot reaching back past the shell, a head with a snout,
 // tentacles and eyes. Nerites: short, stout tentacles with eyes on bumps at their outer bases;
 // ramshorns: long, thread-like tentacles with eyes at their inner bases.
 const nerite=kind==='nerite',fl=Math.max(l*.7,.34),fz=zc+fl*.04,hz=zc+fl*1.0,tail=fz-fl,head=hz+.16;
 const along=(z:number)=>clamp((z-tail)/(head-tail),0,1);
 const fw=w*(nerite?.4:.36),fh=.07;
 const body=new Geo();
 body.add(blob([0,-.02,fz],[fw,fh,fl],22,0,.12,along,q=>{
  const u=(q[2]-fz)/fl;
  // The tail tapers; the front stays broad and blunt; the sole is flat.
  const taper=1-.4*smooth(.1,1,-u)+.06*smooth(.2,.9,u);
  // The lower half of the ellipsoid pressed flat: a broad sole with a rounded rim.
  const y=q[1]<-.02?-.02+(q[1]+.02)*.45:q[1];
  return [q[0]*taper,y,q[2]];
 }));
 body.add(blob([0,.02,hz],[w*.22,.07,.12],14,1,.13,along));
 body.add(blob([0,-.012,hz+.09],[w*(nerite?.18:.13),.042,.09],12,1,.07,along));
 for(const side of [-1,1]){
  if(nerite){
   body.add(tentacle([side*w*.1,.045,hz+.05],[side*w*.38,.06,hz+.29],.02,.009,side));
   body.add(blob([side*(w*.1+.045),.07,hz+.03],[.022,.022,.022],8,3,.04,along));
  }else{
   body.add(tentacle([side*w*.08,.05,hz+.04],[side*w*.36,.1,hz+.4],.014,.005,side));
   body.add(blob([side*(w*.08-.02),.074,hz+.03],[.016,.016,.016],8,3,.03,along));
  }
 }
 body.normals(true);
 const footY=body.bbox().lo[1]!;
 const b:Built={footW:fw,shell:g.geometry(),body:body.geometry(),footY,zc,head,tail,wallScale:p.wall/len};
 built.set(kind,b);return b;
}

// ---- materials ------------------------------------------------------------------------------

/** Shell: the colour pattern (flames, spiral bands, mottle, growth lines, a glossy, paler inside)
 * painted from the shell coordinates; the species' values are uniforms. */
const SHELL_VERTEX=`
fn vertex(v: Vertex) -> Vertex {
 var o=v;
 let m=model_matrix();
 let scale=min(length(m[0].xyz),min(length(m[1].xyz),length(m[2].xyz)));
 o.v0=v.custom;
 // The wall's local thickness: its share of the tube's half width, which grows as exp(log growth).
 o.v1=vec4f(uniforms.shellWall*exp(v.uv.x)*scale,0.0,0.0,0.0);
 return o;
}`;
const SHELL_SURFACE=`
fn shl_pcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
fn shl_unit(h: u32) -> f32 { return f32(h >> 8u) / 16777216.0; }
fn shl_q(x: f32) -> u32 { return u32(i32(clamp(floor(x * 256.0), -2.0e9, 2.0e9))); }
fn sh_hash(p: vec2f) -> f32 { return shl_unit(shl_pcg(shl_q(p.x) ^ shl_pcg(shl_q(p.y)))); }
fn sh_noise(p: vec2f) -> f32 {
 let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
 return mix(mix(sh_hash(i), sh_hash(i + vec2f(1.0, 0.0)), u.x), mix(sh_hash(i + vec2f(0.0, 1.0)), sh_hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}
// A stripe pattern faded to its mean where a period shrinks below a couple of pixels.
fn sh_stripes(x: f32, lo: f32, hi: f32, mean: f32) -> f32 {
 let w = fwidth(x);
 let s = smoothstep(lo, hi, 0.5 + 0.5 * cos(6.2831853 * x));
 return mix(s, mean, smoothstep(0.2, 0.5, w));
}
fn surface(s: Surface) -> Surface {
 var o = s;
 let wall = s.v0.z;
 let g = s.uv.x; let round = s.uv.y;
 let p1 = uniforms.shellPaint1; let p2 = uniforms.shellPaint2; let p3 = uniforms.shellPaint3;
 let seed = p3.w;
 // Flames: stripes along the growth lines, wavering and zigzagging round the whorl; spaced by
 // log growth, so they widen as the shell grew.
 let wob = sh_noise(vec2f(g * 2.5 + seed * 17.0, round * 6.0)) - 0.5;
 let zig = abs(fract(round * 9.0 + seed * 3.0) - 0.5);
 let fl = sh_stripes(g * p2.x + wob * 1.1 + zig * 0.9, 0.3, 0.75, 0.42);
 // Spiral bands round the whorl, fixed in place as it grows.
 let bd = sh_stripes(round * p2.z + 0.25 + wob * 0.12, 0.45, 0.85, 0.3);
 // Mottle: blotches that scale with growth.
 let mt = smoothstep(0.52, 0.78, sh_noise(vec2f(g * 7.0, round * 16.0) + vec2f(seed * 31.0, seed * 7.0)));
 let k = clamp(max(max(p1.w * fl, p2.y * bd), p2.w * mt), 0.0, 1.0);
 var c = mix(s.base_color.rgb, p1.rgb, k);
 // Fine growth lines, a little darker, irregularly spaced.
 let gl = sh_stripes(g * p3.y + sh_noise(vec2f(g * 4.0, round * 3.0)) * 0.6, 0.8, 1.0, 0.2);
 c = c * (1.0 - p3.x * 0.4 * gl) * (0.88 + 0.24 * seed);
 // Inside: paler and glossy; nacre shimmers through thin-film colours with the viewing angle.
 let inner = 1.0 - smoothstep(0.15, 0.65, wall);
 let view = normalize(camera_position() - s.world);
 let ndv = abs(dot(normalize(s.normal), view));
 let film = 0.5 + 0.5 * cos(6.2831853 * (vec3f(0.0, 0.33, 0.67) + ndv * 1.3 + sh_noise(vec2f(g * 3.0, round * 5.0)) * 0.7));
 var ci = mix(s.base_color.rgb, vec3f(0.86, 0.82, 0.74), 0.42);
 ci = mix(ci, vec3f(0.88, 0.88, 0.92) * mix(vec3f(1.0), film * 1.25, 0.35 + 0.2 * (1.0 - ndv)), p3.z);
 c = mix(c, ci, inner);
 // Back faces: deep in the coil, the dark past the inner wall.
 c = select(select(ci * 0.45, ci, wall < 0.5), c, s.front);
 o.base_color = vec4f(c, s.base_color.a);
 o.roughness = mix(0.5, mix(0.3, 0.16, p3.z), inner);
 // The light hook's optical path.
 o.v0 = vec4f(s.v1.x, 0.0, 0.0, 0.0);
 return o;
}`;
/** Body: pedal waves running forward along the sole, the head scanning and rasping, tentacles
 * waving, the front of the body bending into turns, and the whole body withdrawing into the shell. */
const BODY_VERTEX=`
fn vertex(v: Vertex) -> Vertex {
 var o=v;
 let m=model_matrix();
 let scale=min(length(m[0].xyz),min(length(m[1].xyz),length(m[2].xyz)));
 let mo=uniforms.snailMotion; let po=uniforms.snailPose; let sh=uniforms.snailShape;
 let part=v.custom.x; let a=v.custom.y; let side=v.custom.z;
 var p=v.position;
 let t=mo.w; let go=po.y; let graze=po.x;
 // Pedal waves: low ridges travelling forward along the sole, stronger toward the front.
 let sole=1.0-smoothstep(sh.w+0.005,sh.w+0.025,p.y);
 if(part<0.5){
  p.y=p.y+sin(a*60.0-mo.x)*0.004*sole*(0.3+0.7*a)*(0.3+0.7*go);
  p.z=p.z+sin(a*60.0-mo.x+1.2)*0.003*sole*go;
 }
 // The front of the body: scanning side to side, rasping (the head dipping) while it grazes.
 let fore=smoothstep(sh.x,sh.y,p.z);
 let scan=sin(t*0.55+po.z)*0.6+sin(t*1.3+po.z*2.0)*0.4;
 p.x=p.x+(scan*(0.025+0.035*graze)+mo.z*0.18*fore)*fore*fore;
 p.y=p.y-graze*(0.5+0.5*sin(t*2.6+po.z))*0.025*fore*fore*step(0.5,part);
 // Tentacles: slow waving, quicker flicks near the tips.
 if(part>1.5&&part<2.5){
  let k=a*a;
  p.x=p.x+side*(sin(t*1.1+side*1.7+po.z)*0.035+sin(t*3.3+side)*0.008)*k;
  p.y=p.y+(sin(t*0.8+side*2.3+po.z)*0.03-graze*0.03)*k;
 }
 // Withdrawing: tentacles first, then head and foot draw in toward the aperture.
 let w=select(mo.y,clamp(mo.y*1.6,0.0,1.0),part>1.5&&part<2.5);
 let r=vec3f(0.0,0.06,sh.z);
 p=mix(p,r+(p-r)*0.12,w);
 o.position=p;
 o.v0=vec4f(part,a,v.custom.w*scale*mix(1.0,0.4,w),sole);
 o.v1=vec4f(v.position,0.0);
 return o;
}`;
const BODY_SURFACE=`
fn sn_hash(p: vec3f) -> f32 { return fract(sin(dot(p, vec3f(127.1, 311.7, 74.7))) * 43758.5453); }
fn sn_noise(p: vec3f) -> f32 {
 let i=floor(p); let f=fract(p); let u=f*f*(3.0-2.0*f);
 let a=mix(mix(sn_hash(i),sn_hash(i+vec3f(1.0,0.0,0.0)),u.x),mix(sn_hash(i+vec3f(0.0,1.0,0.0)),sn_hash(i+vec3f(1.0,1.0,0.0)),u.x),u.y);
 let b=mix(mix(sn_hash(i+vec3f(0.0,0.0,1.0)),sn_hash(i+vec3f(1.0,0.0,1.0)),u.x),mix(sn_hash(i+vec3f(0.0,1.0,1.0)),sn_hash(i+vec3f(1.0,1.0,1.0)),u.x),u.y);
 return mix(a,b,u.z);
}
fn surface(s: Surface) -> Surface {
 var o=s;
 let part=s.v0.x; let a=s.v0.y; let sole=s.v0.w; let q=s.v1.xyz;
 // Wet, finely granular skin: darker flecks over the body colour, paler on the sole.
 let fleck=smoothstep(0.55,0.8,sn_noise(q*95.0));
 let grain=sn_noise(q*40.0);
 var c=s.base_color.rgb*(0.82+0.3*grain)*(1.0-uniforms.snailSkin.x*fleck*(1.0-0.85*sole));
 c=mix(c,c*1.3+vec3f(0.025),sole*0.8);
 // The pedal waves show as narrow dark bands moving forward over the sole, faint at its rim.
 let wave=0.5+0.5*sin(a*60.0-uniforms.snailMotion.x);
 let rim=smoothstep(0.0,0.5,1.0-abs(s.v1.x)/max(uniforms.snailSkin.y,0.01));
 c=c*(1.0-sole*rim*0.38*smoothstep(0.6,0.95,wave)*(0.35+0.65*uniforms.snailPose.y));
 // Tentacle tips paler and translucent; eyes black and glossy.
 c=select(c,mix(c,c*1.4+vec3f(0.03),a*a),part>1.5&&part<2.5);
 let eye=part>2.5;
 c=select(c,vec3f(0.012,0.012,0.014),eye);
 o.base_color=vec4f(c,s.base_color.a);
 o.roughness=select(0.36,0.12,eye);
 o.v0=vec4f(s.v0.z,0.0,0.0,0.0);
 return o;
}`;
const linear=(hex:number)=>new Color(hex);

// ---- the animal -----------------------------------------------------------------------------

const GLASS_Z=2.985;
const tmpM=new Matrix4(),ax=new Vector3(),ay=new Vector3(),az=new Vector3();
const rand=(seed:number)=>{let s=seed*9301+49297;return ()=>{s=(s*9301+49297)%233280;return s/233280;};};
const wrapAngle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));

/** A living snail: build once per species, one material pair per animal (its own motion uniforms). */
export class Snail {
 private static readonly all=new Set<Snail>();
 private onGlass=false;private readonly offX:number;private readonly offZ:number;
 readonly root=new Group();
 /** The model frame (+Z forward, +Y up from the sole), lowered as the snail clamps down to rest. */
 private readonly model=new Group();
 private readonly shellMesh:Mesh;
 private readonly bodyMesh:Mesh;
 private readonly materials:MeshStandardMaterial[]=[];
 private readonly motion=new Vector4();
 private readonly pose=new Vector4();
 private readonly shape:Vector4;
 private readonly geo:Built;
 private readonly random:()=>number;
 /** Growth 0..1 (juveniles are smaller). */
 growth=1;
 /** Ground position (x, z); on the glass (gx, gy) with z the glass. */
 x=0;z=0;gx=-4.8;gy=1.6;
 placed=false;
 private yaw=0;private heading=0;private go=0;private graze=0;private withdraw=0;private turn=0;private phase=0;
 private wanderX=0;private wanderY=0;private timer=0;private pause=0;
 private readonly up=new Vector3(0,1,0);private y=0;
 constructor(readonly kind:SnailKind,seed=1){
  this.random=rand(seed);this.geo=build(kind);
  const p=SHELLS[kind];
  const shell=new MeshStandardMaterial({color:linear(p.color),roughness:.5,metalness:0,side:DoubleSide});
  const pc=linear(p.pattern);
  shell.hooks=submergedHooks({uniforms:{
   shellWall:{value:this.geo.wallScale},
   shellPaint1:{value:new Vector4(pc.r,pc.g,pc.b,p.flames)},
   shellPaint2:{value:new Vector4(p.flameN,p.bands,p.bandN,p.mottle)},
   shellPaint3:{value:new Vector4(p.lines,p.lineN,p.nacre,(seed*.618)%1)},
  },vertex:SHELL_VERTEX,surface:SHELL_SURFACE,light:shellScattering});
  const body=new MeshStandardMaterial({color:linear(p.body),roughness:.36,metalness:0});
  this.shape=new Vector4(this.geo.zc+.05,this.geo.head,this.geo.zc,this.geo.footY);
  body.hooks=submergedHooks({uniforms:{snailMotion:{value:this.motion},snailPose:{value:this.pose},snailShape:{value:this.shape},snailSkin:{value:new Vector4(kind==='nerite'?.35:.22,this.geo.footW,0,0)}},
   vertex:BODY_VERTEX,surface:BODY_SURFACE,light:snailScattering});
  this.materials.push(shell,body);
  this.shellMesh=new Mesh(this.geo.shell,shell);this.bodyMesh=new Mesh(this.geo.body,body);
  for(const m of [this.shellMesh,this.bodyMesh]){m.castShadow=true;m.receiveShadow=true;this.model.add(m);}
  // The body's hook moves its vertices beyond the geometry's bounds a little; keep it drawn.
  this.bodyMesh.frustumCulled=false;
  this.root.add(this.model);
  this.offX=Math.sin(seed*3.7)*.35;this.offZ=Math.cos(seed*2.3)*.3;Snail.all.add(this);
  this.pose.z=seed*1.7;this.yaw=seed*2.4;this.heading=seed*1.3;
 }
 /** Starts the snail at a ground point (or, on the glass, nearby). */
 place(x:number,z:number,glass=false){this.x=x;this.z=z;this.placed=true;if(glass){this.wanderX=this.gx;this.wanderY=this.gy;}else{this.wanderX=x;this.wanderY=z;}this.y=NaN;}
 private get length(){return LENGTH[this.kind]*(.45+.55*this.growth);}

 update(dt:number,time:number,ctx:SnailContext,intent:SnailIntent){
  dt=Math.min(dt,.1);
  const rnd=this.random,glass=intent.mode==='glass',len=this.length;
  if(!this.placed){this.place(this.x,this.z,glass);}
  // Behaviour: rest withdrawn; feed at a target; otherwise wander with pauses to rasp at biofilm.
  const resting=intent.mode==='rest';
  let wantGo=0,wantGraze=0;
  this.timer-=dt;
  if(!resting){
   if(glass){
    if(this.timer<=0||Math.hypot(this.wanderX-this.gx,this.wanderY-this.gy)<.08){
     // A new patch of glass a little way off, kept below the surface and above the gravel.
     const a=rnd()*TAU,d=.4+rnd()*1.4;this.wanderX=clamp(this.gx+Math.cos(a)*d,-6.6,6.6);this.wanderY=clamp(this.gy+Math.sin(a)*d*.7,.75,5.2);
     this.timer=20+rnd()*30;if(rnd()<.45)this.pause=3+rnd()*7;
    }
   }else{
    const t=intent.target,feed=intent.mode==='feed'&&t;
    // Each snail keeps to its own side of a shared target.
    const ox=feed?this.offX*.4:this.offX,oz=feed?this.offZ*.4:this.offZ;
    if(t&&Math.hypot(t.x+ox-this.x,t.z+oz-this.z)>(feed?.15:.5)){this.wanderX=t.x+ox;this.wanderY=t.z+oz;}
    else if(feed){this.wanderX=this.x;this.wanderY=this.z;this.pause=Math.max(this.pause,1);}
    else if(this.timer<=0||Math.hypot(this.wanderX-this.x,this.wanderY-this.z)<.06){
     const cx=t?t.x+ox:this.x,cz=t?t.z+oz:this.z,a=rnd()*TAU,d=.15+rnd()*.5;
     this.wanderX=clamp(cx+Math.cos(a)*d,-6.5,6.5);this.wanderY=clamp(cz+Math.sin(a)*d,-2.6,2.6);
     this.timer=15+rnd()*25;if(rnd()<.4)this.pause=3+rnd()*6;
    }
   }
   if(this.pause>0){this.pause-=dt;wantGraze=1;}else wantGo=1;
  }
  // Ease in and out: snails start and stop gently, and withdraw slowly.
  this.go+=(wantGo-this.go)*Math.min(1,dt*1.2);
  this.graze+=(wantGraze-this.graze)*Math.min(1,dt*1.5);
  this.withdraw+=((resting?1:0)-this.withdraw)*Math.min(1,dt*(resting?.35:.6));
  const speed=intent.speed*this.go*(1-this.withdraw)*(.6+.4*this.growth);
  // Steering: toward the wander point, turning at most half a radian a second.
  const tx=this.wanderX-(glass?this.gx:this.x),ty=this.wanderY-(glass?this.gy:this.z);
  const want=glass?Math.atan2(ty,tx):Math.atan2(tx,ty);
  const cur=glass?this.heading:this.yaw,dA=clamp(wrapAngle(want-cur),-.5*dt,.5*dt)*Math.min(1,this.go*1.5+.1);
  if(glass)this.heading+=dA;else this.yaw+=dA;
  this.turn+=((dt>0?dA/dt/.5:0)*(glass?-1:1)-this.turn)*Math.min(1,dt*2);
  this.phase+=dt*(1.2+7*this.go*(1-this.withdraw));
  this.motion.set(this.phase,this.withdraw,this.turn*this.go,time);
  this.pose.x=this.graze*(1-this.withdraw);this.pose.y=this.go;
  this.root.scale.setScalar(len);
  // The shell rocks a little with each surge of the foot and lags in turns.
  this.shellMesh.rotation.set(0,-this.turn*this.go*.08,Math.sin(this.phase*.5)*.02*this.go);
  this.model.position.y=this.geo.footY*.75*this.withdraw;
  this.onGlass=glass;
  if(glass){
   this.gx+=Math.cos(this.heading)*speed*dt;this.gy+=Math.sin(this.heading)*speed*dt;
   const floor=ctx.ground(this.gx,GLASS_Z-.1)+.45;
   if(this.gy<floor){this.gy=floor;if(Math.sin(this.heading)<0)this.heading=-this.heading;}
   if(Math.abs(this.gx)>6.6){this.gx=Math.sign(this.gx)*6.6;this.heading=Math.PI-this.heading;}
   if(this.gy>5.3){this.gy=5.3;this.heading=-this.heading;}
   // Foot to the glass, the shell toward the water.
   ay.set(0,0,-1);az.set(Math.cos(this.heading),Math.sin(this.heading),0);ax.crossVectors(ay,az);
   tmpM.makeBasis(ax,ay,az);this.root.quaternion.setFromRotationMatrix(tmpM);
   this.root.position.set(this.gx,this.gy,GLASS_Z+ay.z*(-this.geo.footY)*len);
   this.x=this.gx;this.z=GLASS_Z;
   return;
  }
  this.x+=Math.sin(this.yaw)*speed*dt;this.z+=Math.cos(this.yaw)*speed*dt;
  // Snails crawl over each other's shells in life; here they keep a shell's width apart.
  for(const o of Snail.all){if(o===this||o.onGlass)continue;const dx=this.x-o.x,dz=this.z-o.z,d=Math.hypot(dx,dz),min=(len+o.length)*.6;
   if(d<min&&d>1e-4){const push=(min-d)*Math.min(1,dt*2);this.x+=dx/d*push;this.z+=dz/d*push;if(d<min*.8){this.wanderX=this.x+dx/d*.4;this.wanderY=this.z+dz/d*.4;}}}
  if(Math.abs(this.x)>6.5){this.x=Math.sign(this.x)*6.5;this.yaw=-this.yaw;}
  if(Math.abs(this.z)>2.65){this.z=Math.sign(this.z)*2.65;this.yaw=Math.PI-this.yaw;}
  // The sole follows the gravel: the slope from heights round the foot, eased.
  const e=Math.max(.1,len*.45),h=ctx.ground(this.x,this.z);
  const nx=-(ctx.ground(this.x+e,this.z)-ctx.ground(this.x-e,this.z))/(2*e),nz=-(ctx.ground(this.x,this.z+e)-ctx.ground(this.x,this.z-e))/(2*e);
  ax.set(clamp(nx,-.8,.8),1,clamp(nz,-.8,.8)).normalize();
  const k=Number.isNaN(this.y)?1:Math.min(1,dt*1.5);
  this.up.lerp(ax,k).normalize();
  const ground=Math.max(h,(ctx.ground(this.x+e,this.z)+ctx.ground(this.x-e,this.z)+ctx.ground(this.x,this.z+e)+ctx.ground(this.x,this.z-e))*.25);
  this.y=Number.isNaN(this.y)?ground:this.y+(ground-this.y)*Math.min(1,dt*2);
  ay.copy(this.up);az.set(Math.sin(this.yaw),0,Math.cos(this.yaw));az.addScaledVector(ay,-az.dot(ay)).normalize();ax.crossVectors(ay,az);
  tmpM.makeBasis(ax,ay,az);this.root.quaternion.setFromRotationMatrix(tmpM);
  this.root.position.set(this.x,this.y,this.z).addScaledVector(this.up,-this.geo.footY*len);
 }
 dispose(){Snail.all.delete(this);for(const m of this.materials)m.dispose();}
}
