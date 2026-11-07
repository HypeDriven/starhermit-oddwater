// Wave-driven caustics: a port of Ultra Water's src/water/Caustics.js (MIT,
// Copyright (c) 2026 Humpalumps; the notice is in
// crates/starhermit-water/src/lib.rs). A grid over the 12 m cascade's period
// is refracted through its slopes onto planes at three depths, and every
// landed triangle adds (undisturbed area / landed area) to that depth's
// channel (additive blending): intensity relative to flat water, mean 1, so
// it multiplies the direct sun on the sea bed (the terrain's light hook,
// CAUSTICS_WGSL). Tiles every 12 m (repeat-wrapped, mipmapped).
//
// Differences, forced by the engine today:
//   - no MSAA targets: the JS draws 4x MSAA so fold slivers far thinner than
//     a texel add by coverage. Here they are point-sampled, so the sharpest
//     fold lines can break into dots; the mip lookups soften it.
//   - one RGBA16F target (512^2, 2.7 MiB with mips) in place of the JS's
//     R16F 512^2 and RG16F 256^2: R16F/RG16F take no mipmaps, and a game
//     holds at most 16 render targets (the sim takes 11). Red is 1.5 m,
//     green 4 m, blue 10 m; the deep slices land at the near resolution.
import {
  CustomBlending,
  DoubleSide,
  Group,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RenderTarget,
  RepeatWrapping,
  ShaderMaterial,
  Vector3,
  Vector4,
  Color,
  renderer,
  type Texture,
} from "starhermit:scene";
import { CASCADE_LENGTHS, N } from "./ocean-sim.js";

const L = CASCADE_LENGTHS[2];
const ETA = 1 / 1.33;
const MAX_RATIO = 16; // firefly clamp
const RES = [512];
const SLICES = [
  { depth: 1.5, target: 0, channel: 0, cells: 128, margin: 6 },
  { depth: 4, target: 0, channel: 1, cells: 64, margin: 7 },
  { depth: 10, target: 0, channel: 2, cells: 32, margin: 8 },
];
const f = (x: number) => x.toPrecision(9);
const [D0, D1, D2] = SLICES.map((s) => f(s.depth));

const VERTEX = /* wgsl */ `
// GLSL refract (the shader compiler has no builtin)
fn refract_v(i: vec3f, n: vec3f, eta: f32) -> vec3f {
  let c = dot(n, i);
  let k = 1.0 - eta * eta * (1.0 - c * c);
  if (k < 0.0) { return vec3f(0.0); }
  return eta * i - (eta * c + sqrt(k)) * n;
}
// cubic B-spline from 4 bilinear taps (GPU Gems 2, ch. 20)
fn slope_bspline(uv: vec2f, lod: f32) -> vec2f {
  let size = vec2f(textureDimensions(slope, i32(lod)));
  let st = uv * size - 0.5;
  let i = floor(st);
  let fr = st - i;
  let f2 = fr * fr;
  let f3 = f2 * fr;
  let w0 = (1.0 - 3.0 * fr + 3.0 * f2 - f3) / 6.0;
  let w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  let w2 = (1.0 + 3.0 * fr + 3.0 * f2 - 3.0 * f3) / 6.0;
  let w3 = f3 / 6.0;
  let g0 = w0 + w1;
  let g1 = w2 + w3;
  let h0 = (i - 0.5 + w1 / g0) / size;
  let h1 = (i + 1.5 + w3 / g1) / size;
  return g0.y * (g0.x * textureSampleLevel(slope, slope_sampler, h0, lod).xy + g1.x * textureSampleLevel(slope, slope_sampler, vec2f(h1.x, h0.y), lod).xy)
       + g1.y * (g0.x * textureSampleLevel(slope, slope_sampler, vec2f(h0.x, h1.y), lod).xy + g1.x * textureSampleLevel(slope, slope_sampler, h1, lod).xy);
}
fn vertex(v: Vertex) -> Vertex {
  var o = v;
  let p = uniforms.params;  // depth, cells, lod, margin
  let t = (v.position.xy + 0.5 * p.y + 0.5) / p.y;
  let s = slope_bspline(t, p.z);
  let r = refract_v(-uniforms.sun, normalize(vec3f(-s.x, 1.0, -s.y)), ${f(ETA)});
  let rf = refract_v(-uniforms.sun, vec3f(0.0, 1.0, 0.0), ${f(ETA)});
  var d = (r.xz / max(-r.y, 0.05) - rf.xz / -rf.y) * (p.x / ${f(L)});
  d = clamp(d, vec2f(-p.w), vec2f(p.w));
  o.v0 = vec4f(t * uniforms.res, 0.0, 0.0);
  // rows from the top: v = t.y lands where a lookup at v = t.y reads
  let q = t + d;
  o.clip = vec4f(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
  return o;
}`;

const FRAGMENT = /* wgsl */ `
fn fragment(f: Fragment) -> vec4f {
  // raster space is the landed space at one texel per pixel: the ratio is the
  // undisturbed area (in texels) per pixel
  let a = dpdx(f.v0.xy);
  let b = dpdy(f.v0.xy);
  return vec4f(uniforms.mask * min(abs(a.x * b.y - a.y * b.x), ${f(MAX_RATIO)}), 0.0);
}`;

/** wave_caustic(entryXZ, depth, lod) -> direct-sun multiplier, mean ~1, for a
 * hook with the `caustics` texture. entryXZ is where
 * the flat-water refracted sun ray through the point crosses the surface;
 * lod extra mip blur in near texels. */
export const CAUSTICS_WGSL = /* wgsl */ `
// GLSL refract (the shader compiler has no builtin)
fn refract_v(i: vec3f, n: vec3f, eta: f32) -> vec3f {
  let c = dot(n, i);
  let k = 1.0 - eta * eta * (1.0 - c * c);
  if (k < 0.0) { return vec3f(0.0); }
  return eta * i - (eta * c + sqrt(k)) * n;
}
const CAUSTIC_TEXELS_PER_M: f32 = ${f(RES[0]! / L)};
fn wave_caustic(entryXZ: vec2f, depth: f32, lod: f32) -> f32 {
  let uv = entryXZ * ${f(1 / L)};
  var v = textureSampleLevel(caustics, caustics_sampler, uv, lod).r;
  if (depth > ${D0}) {
    // past the deepest slice one mip blurrier per doubling of depth
    let d = textureSampleLevel(caustics, caustics_sampler, uv, lod + log2(max(depth / ${D2}, 1.0))).gb;
    if (depth < ${D1}) { v = mix(v, d.x, (depth - ${D0}) / (${D1} - ${D0})); }
    else { v = mix(d.x, d.y, clamp((depth - ${D1}) / (${D2} - ${D1}), 0.0, 1.0)); }
  }
  return mix(1.0, v, clamp(depth / ${D0}, 0.0, 1.0));
}
`;

const savedColor = new Color();
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

export class WaveCaustics {
  readonly targets: RenderTarget[];
  private readonly groups: Group[];
  private readonly materials: ShaderMaterial[] = [];
  private readonly sun = new Vector3();
  private flat = false;

  constructor(private readonly slope: Texture) {
    this.targets = RES.map(
      (res) =>
        new RenderTarget(res, res, {
          type: HalfFloatType,
          minFilter: LinearMipmapLinearFilter,
          magFilter: LinearFilter,
          wrapS: RepeatWrapping,
          wrapT: RepeatWrapping,
          generateMipmaps: true,
          depthBuffer: false,
        }),
    );
    this.groups = RES.map(() => new Group());
    for (const { depth, target, channel, cells, margin } of SLICES) {
      const material = new ShaderMaterial({
        uniforms: {
          slope: { value: slope },
          sun: { value: this.sun },
          res: { value: RES[target]! },
          // depth, cells, slope lod, margin
          params: { value: new Vector4(depth, cells, Math.max(0, Math.log2(N / cells)), (margin - 1) / cells) },
          mask: { value: new Vector3().setComponent(channel, 1) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: DoubleSide, // folds past the focus land flipped
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneFactor,
      });
      this.materials.push(material);
      const span = cells + 2 * margin;
      const mesh = new Mesh(new PlaneGeometry(span, span, span, span), material);
      mesh.frustumCulled = false;
      this.groups[target]!.add(mesh);
    }
    this.update(new Vector3(0, -1, 0)); // start at a flat 1.0
  }

  get texture(): Texture {
    return this.targets[0]!.texture;
  }

  compile() {
    for (const m of this.materials) m.compile();
  }

  /** Once a frame after sim.update(); sunDir points towards the sun. */
  update(sunDir: Vector3) {
    const up = sunDir.y > 0;
    if (!up && this.flat) return;
    this.flat = !up;
    this.sun.copy(sunDir).normalize();
    for (const m of this.materials) m.uniforms.slope!.value = this.slope;
    renderer.getClearColor(savedColor);
    const savedAlpha = renderer.getClearAlpha();
    renderer.setClearColor(up ? 0x000000 : 0xffffff, 1);
    const previous = renderer.getRenderTarget();
    this.targets.forEach((t, i) => {
      this.groups[i]!.visible = up;
      renderer.setRenderTarget(t);
      renderer.render(this.groups[i]!, camera);
    });
    renderer.setRenderTarget(previous);
    renderer.setClearColor(savedColor, savedAlpha);
  }
}
