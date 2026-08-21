import init, {
  create_swarm_cpu,
  create_swarm_gpu,
  mesh_cube,
  initThreadPool,
  artisan_rayon_threads,
} from "./pkg/murmuration.js";
import { ArtisanApp } from "./engine/App.js";
import { WebGPURenderer } from "./engine/Renderer.js";

const CUBE_SCALE = 0.11;
const BOUNDS = 34.0;
const SHADER_TYPE = 7.0;

// ---------------------------------------------------------------------------
// GPU mode shaders.
//
// The compute pass below is a line-for-line port of `flow_field` in src/lib.rs.
// Same constants, same terms, same integration — so flipping modes changes who
// is doing the work, not what you are looking at.
// ---------------------------------------------------------------------------

const FlowComputeWGSL = `
  struct Particle {
      pos_x: f32, pos_y: f32, pos_z: f32,
      vel_x: f32, vel_y: f32, vel_z: f32,
      scale: f32,
      agility: f32,
  };
  @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

  struct SimParams {
      speed: f32, size: f32, gravity: f32, noise_scale: f32,
      time: f32, dt: f32, row_stride: f32, pad2: f32,
  };
  @group(0) @binding(1) var<uniform> params: SimParams;

  const BOUNDS: f32 = ${BOUNDS};
  const FLOW_SPEED: f32 = 7.0;

  fn hash_u32(x_in: u32) -> u32 {
      var a = x_in;
      a = (a ^ 61u) ^ (a >> 16u);
      a = a + (a << 3u);
      a = a ^ (a >> 4u);
      a = a * 0x27d4eb2du;
      a = a ^ (a >> 15u);
      return a;
  }
  fn hash_f32(x_in: u32) -> f32 {
      return f32(hash_u32(x_in)) / 4294967295.0;
  }

  // Must match spawn_start_pos() in the render shader exactly.
  fn start_pos(index: u32) -> vec3<f32> {
      let theta = hash_f32(index * 3u + 1u) * 6.2831853;
      let cos_phi = hash_f32(index * 7u + 13u) * 2.0 - 1.0;
      let sin_phi = sqrt(max(1.0 - cos_phi * cos_phi, 0.0));
      let dist = pow(hash_f32(index * 11u + 29u), 0.55) * BOUNDS * 0.75;
      return vec3<f32>(
          sin_phi * cos(theta) * dist,
          cos_phi * dist * 0.65,
          sin_phi * sin(theta) * dist
      );
  }

  fn flow_field(p: vec3<f32>, t: f32) -> vec3<f32> {
      let S: f32 = 0.09;
      var v = vec3<f32>(
          sin(p.y * S + t * 0.31) + cos(p.z * S * 1.3 - t * 0.21),
          sin(p.z * S * 1.1 + t * 0.27) + cos(p.x * S * 0.9 + t * 0.19),
          sin(p.x * S * 1.2 - t * 0.23) + cos(p.y * S * 1.05 + t * 0.25)
      );

      v.x += -p.z * 0.05;
      v.z +=  p.x * 0.05;

      let r = length(p);
      let over = max(r / BOUNDS - 0.6, 0.0);
      if (over > 0.0 && r > 0.001) {
          v -= (p / r) * (over * over * 3.0);
      }
      return v;
  }

  @compute @workgroup_size(64)
  fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
      // Flat index across a possibly-2D dispatch; see SIM_WORKGROUP_SIZE in
      // Renderer3D.js. With a single row this is just id.x.
      let index = id.x + id.y * u32(params.row_stride);
      if (index >= arrayLength(&particles)) { return; }
      var p = particles[index];

      // The host fills this buffer with scale == 1.0 on allocation. We stamp
      // params.size in every frame, so a scale of exactly 1.0 means "this
      // particle has never been simulated" and we seed it from the hash.
      if (abs(p.scale - 1.0) < 1e-6) {
          let sp = start_pos(index);
          p.pos_x = sp.x; p.pos_y = sp.y; p.pos_z = sp.z;
          p.vel_x = 0.0;  p.vel_y = 0.0;  p.vel_z = 0.0;
          p.agility = 0.7 + hash_f32(index * 17u + 71u) * 0.6;
      }

      let pos = vec3<f32>(p.pos_x, p.pos_y, p.pos_z);
      // NB: "target" is a reserved keyword in WGSL — do not rename this back.
      // (And no backticks in this file's WGSL comments: it is a JS template
      // literal, so a stray backtick ends the shader mid-string.)
      let desired = flow_field(pos, params.time) * (FLOW_SPEED * p.agility);

      let dt = min(params.dt, 0.05);
      let blend = 1.0 - exp(-dt * 2.5);
      var vel = vec3<f32>(p.vel_x, p.vel_y, p.vel_z);
      vel += (desired - vel) * blend;

      let new_pos = pos + vel * dt;
      p.pos_x = new_pos.x; p.pos_y = new_pos.y; p.pos_z = new_pos.z;
      p.vel_x = vel.x;     p.vel_y = vel.y;     p.vel_z = vel.z;
      p.scale = params.size;

      particles[index] = p;
  }
`;

// Two ways to build each cube, selected by `?faces=`:
//
//   6 — the honest cube: all six faces, 12 triangles, three of which are always
//       back-facing and get thrown away by `cullMode: "back"` *after* the
//       rasteriser has already set them up.
//   3 — only the three faces pointing at the camera, 6 triangles. For an opaque
//       convex solid the other three are occluded by these, so the rendered
//       image is identical, pixel for pixel — this is not an approximation or
//       an LOD, it is declining to pay for geometry that was never visible.
//
// The 3-face path cannot simply mirror a baked mesh: mirroring an odd number of
// axes reverses winding, and the back-face cull would then eat the whole cube.
// Instead each quad is built from scratch around its axis with a deliberately
// right-handed tangent basis, so winding is correct for all eight sign
// combinations without the pipeline needing to know anything about it.
const VS_GEOMETRY = {
  6: `
      let r_pos  = rotate_vector(vertex_pos, q);
      let r_norm = rotate_vector(vertex_normal, q);
`,
  3: `
      // Which side of each local axis the camera is on. Done in the cube's own
      // frame (hence the conjugate rotation), because that is the frame the
      // faces are defined in.
      let q_conj = vec4<f32>(-q.xyz, q.w);
      let to_cam_local = rotate_vector(scene.camera_pos.xyz - inst_pos, q_conj);

      // 12 vertices = 3 faces x 4 corners; the index buffer fans each quad.
      let slot   = vert_idx / 4u;
      let corner = vert_idx % 4u;

      // dot() rather than to_cam_local[slot]: same value, no dynamic vector
      // indexing.
      let face_n = axis_vec(slot);
      let sgn = select(-1.0, 1.0, dot(to_cam_local, face_n) >= 0.0);

      // cross(u, v) == n by construction, which is what keeps the winding
      // consistent no matter which of the eight corners the camera sits in.
      let n = face_n * sgn;
      let u = axis_vec((slot + 1u) % 3u) * sgn;
      let v = axis_vec((slot + 2u) % 3u);
      let cu = select(-1.0, 1.0, corner == 1u || corner == 2u);
      let cv = select(-1.0, 1.0, corner == 2u || corner == 3u);

      // Half-extent 0.5 to match mesh_cube(1.0), which the CPU path draws.
      let r_pos  = rotate_vector((u * cu + v * cv + n) * 0.5, q);
      let r_norm = rotate_vector(n, q);
`,
};

const makeFlowRenderWGSL = (faces) => `
  // Mirrors the layout the renderer writes into sceneBuffer3D. The trailing
  // two vectors are the first DirectionalLight; reading the real lights here
  // instead of hardcoding constants is what keeps GPU mode looking like CPU
  // mode, and makes the ambient control affect both.
  struct Scene {
      view_proj:      mat4x4<f32>,
      inv_view_proj:  mat4x4<f32>,
      camera_pos:     vec4<f32>,
      ambient:        vec4<f32>,
      ambient_ground: vec4<f32>,
      ambient_solid:  vec4<f32>,
      exposure:       vec4<f32>,
      dir0_dir:       vec4<f32>,
      dir0_color:     vec4<f32>,
  };
  @group(0) @binding(0) var<uniform> scene: Scene;

  struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) emissive: vec3<f32>,
  };

  const BOUNDS: f32 = ${BOUNDS};
  // Keep in sync with the StandardMaterial emissive in src/lib.rs.
  const EMISSIVE: f32 = 0.3;

  // The engine's standard shader (Shaders3D.js: StandardFS) decodes sRGB base
  // colour to linear, lights and tonemaps in linear, then re-encodes to sRGB.
  // Skipping any of those steps is exactly why this path looked like flat
  // neon next to CPU mode: without the ACES curve, saturated colours never
  // roll off, and without the sRGB round trip everything reads brighter and
  // harsher than the "same" numbers do on the CPU path.
  fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
      return select(
          pow((c + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4)),
          c / 12.92,
          c <= vec3<f32>(0.04045)
      );
  }
  fn linearToSrgb(c: vec3<f32>) -> vec3<f32> {
      return select(
          1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055),
          c * 12.92,
          c <= vec3<f32>(0.0031308)
      );
  }
  fn RRTAndODTFit(v: vec3<f32>) -> vec3<f32> {
      let a = v * (v + 0.0245786) - 0.000090537;
      let b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
  }
  fn acesFilmic(color: vec3<f32>) -> vec3<f32> {
      let m1 = mat3x3<f32>(
          vec3<f32>(0.59719, 0.07600, 0.02840),
          vec3<f32>(0.35458, 0.90834, 0.13383),
          vec3<f32>(0.04823, 0.01566, 0.83777)
      );
      let m2 = mat3x3<f32>(
          vec3<f32>(1.60475, -0.10208, -0.00327),
          vec3<f32>(-0.53108, 1.10813, -0.07276),
          vec3<f32>(-0.07367, -0.00605, 1.07602)
      );
      var c = color / 0.6;
      c = m1 * c;
      c = RRTAndODTFit(c);
      c = m2 * c;
      return saturate(c);
  }

  fn hash_u32(x_in: u32) -> u32 {
      var a = x_in;
      a = (a ^ 61u) ^ (a >> 16u);
      a = a + (a << 3u);
      a = a ^ (a >> 4u);
      a = a * 0x27d4eb2du;
      a = a ^ (a >> 15u);
      return a;
  }
  fn hash_f32(x_in: u32) -> f32 {
      return f32(hash_u32(x_in)) / 4294967295.0;
  }

  fn start_pos(index: u32) -> vec3<f32> {
      let theta = hash_f32(index * 3u + 1u) * 6.2831853;
      let cos_phi = hash_f32(index * 7u + 13u) * 2.0 - 1.0;
      let sin_phi = sqrt(max(1.0 - cos_phi * cos_phi, 0.0));
      let dist = pow(hash_f32(index * 11u + 29u), 0.55) * BOUNDS * 0.75;
      return vec3<f32>(
          sin_phi * cos(theta) * dist,
          cos_phi * dist * 0.65,
          sin_phi * sin(theta) * dist
      );
  }

  fn hsl_to_rgb(h: f32, s: f32, l: f32) -> vec3<f32> {
      let c = (1.0 - abs(2.0 * l - 1.0)) * s;
      let hp = fract(h) * 6.0;
      let x = c * (1.0 - abs(hp % 2.0 - 1.0));
      var rgb = vec3<f32>(0.0);
      if      (hp < 1.0) { rgb = vec3<f32>(c, x, 0.0); }
      else if (hp < 2.0) { rgb = vec3<f32>(x, c, 0.0); }
      else if (hp < 3.0) { rgb = vec3<f32>(0.0, c, x); }
      else if (hp < 4.0) { rgb = vec3<f32>(0.0, x, c); }
      else if (hp < 5.0) { rgb = vec3<f32>(x, 0.0, c); }
      else               { rgb = vec3<f32>(c, 0.0, x); }
      return rgb + (l - c * 0.5);
  }

  fn rotate_vector(v: vec3<f32>, q: vec4<f32>) -> vec3<f32> {
      return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }

  // Unit vector along axis 0/1/2. Branchless so it stays uniform-friendly.
  fn axis_vec(i: u32) -> vec3<f32> {
      return vec3<f32>(f32(i == 0u), f32(i == 1u), f32(i == 2u));
  }

  @vertex
  fn vs_main(
      @location(0) vertex_pos: vec3<f32>,
      @location(1) vertex_normal: vec3<f32>,
      @location(2) vertex_uv:     vec2<f32>,
      @location(6) vertex_color:  vec4<f32>,
      @location(3) inst_pos: vec3<f32>,
      @location(4) inst_vel: vec3<f32>,
      @location(5) inst_scale: f32,
      @location(7) inst_agility: f32,
      @builtin(vertex_index) vert_idx: u32,
      // NOT @builtin(instance_index). Under frustum culling the engine compacts
      // the visible instances, so the builtin becomes a position in the visible
      // list and changes every time the camera moves — which would make every
      // cube's colour and rotation flicker as the swarm was culled. Location 8
      // carries the original simulation index through compaction, and is the
      // identity permutation when culling is off, so this one declaration is
      // correct in both modes.
      @location(8) instance_idx: u32,
  ) -> VertexOutput {
      // Fixed per-instance orientation from the hash — same intent as the
      // random-but-never-updated rotation the CPU path bakes in at spawn.
      let a = hash_f32(instance_idx * 5u + 3u) * 2.0 - 1.0;
      let b = hash_f32(instance_idx * 9u + 19u) * 2.0 - 1.0;
      let c = hash_f32(instance_idx * 13u + 37u) * 2.0 - 1.0;
      let d = hash_f32(instance_idx * 23u + 53u) * 2.0 - 1.0;
      let q = normalize(vec4<f32>(a, b, c, d));
${VS_GEOMETRY[faces]}
      // Mirror of near_fade_scale() in Shaders3D.js — the CPU path gets this
      // from the engine's standard shader, so the GPU path has to apply the
      // identical shrink or the two modes clip differently.
      let fade_full = scene.exposure.z;
      let fade_zero = scene.exposure.w;
      var fade = 1.0;
      if (fade_full > fade_zero) {
          fade = smoothstep(fade_zero, fade_full, distance(inst_pos, scene.camera_pos.xyz));
      }
      let world_pos = inst_pos + r_pos * (inst_scale * fade);

      var out: VertexOutput;
      out.position = scene.view_proj * vec4<f32>(world_pos, 1.0);
      out.normal = normalize(r_norm);

      // Colour from the STARTING position, never from the current one. As the
      // flow folds the swarm, the frozen colours marble like dye in water.
      let sp = start_pos(instance_idx);
      let dist = length(sp);
      let hue = fract(atan2(sp.z, sp.x) / 6.2831853 + 0.5 + sp.y * 0.006);
      let lift = 0.45 + (dist / BOUNDS) * 0.3;
      // The CPU path's StandardMaterial base_color is decoded sRGB->linear in
      // its vertex shader (Shaders3D.js line ~71) before any lighting touches
      // it; do the same here so the two paths start from the same albedo.
      // Emissive, on the CPU side, is "base_color_rgb * 0.3" computed from the
      // *undecoded* colour (src/lib.rs never applies pow(2.2) to it) and passed
      // through as-is — matched here rather than re-deriving it from albedo.
      let base = hsl_to_rgb(hue, 0.72, lift);
      out.color = vec4<f32>(pow(base, vec3<f32>(2.2)), 1.0);
      out.emissive = base * EMISSIVE;
      return out;
  }

  const INV_PI: f32 = 0.31830988618;

  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
      let exposure = scene.exposure.x;
      let albedo = in.color.rgb;

      // Lambertian diffuse from the scene's real AmbientLight and first
      // DirectionalLight, decoded from sRGB the same way the standard shader
      // does (StandardFS in Shaders3D.js) — light colours are stored as sRGB
      // too, not linear.
      let ambient_light = srgbToLinear(scene.ambient_solid.rgb) * scene.ambient_solid.a;
      var lo = albedo * INV_PI * ambient_light;

      let l = normalize(-scene.dir0_dir.xyz);
      let ndotl = max(dot(normalize(in.normal), l), 0.0);
      let dir_col = srgbToLinear(scene.dir0_color.rgb) * scene.dir0_dir.w;
      lo += albedo * INV_PI * dir_col * ndotl;

      // Emissive is added post-lighting and pre-exposure, matching
      // "Lo += emissive_contrib" on the CPU path.
      lo += in.emissive;

      let exposed = lo * exposure;
      let mapped = acesFilmic(exposed);
      let corrected = linearToSrgb(mapped);
      return vec4<f32>(corrected, 1.0);
  }
`;

// ---------------------------------------------------------------------------

class RollingAverage {
  constructor(size = 30) {
    this.size = size;
    this.samples = [];
  }
  add(v) {
    this.samples.push(v);
    if (this.samples.length > this.size) this.samples.shift();
  }
  get() {
    if (!this.samples.length) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }
  reset() {
    this.samples.length = 0;
  }
}

/// Quaternion for the camera basis [right, up, -forward] (engine cameras look
/// down -Z). Pure matrix->quaternion conversion, no axis derivation — the
/// caller is responsible for right/up already being an orthonormal,
/// continuity-preserving frame. Splitting this out is what makes the
/// continuity-based orientation below possible: everything upstream can
/// change how right/up are derived without touching this math.
function basisToQuat(right, up, forward, roll = 0) {
  let [rx, ry, rz] = right;
  let [ux, uy, uz] = up;
  const [fx, fy, fz] = forward;

  if (roll !== 0) {
    const c = Math.cos(roll), s = Math.sin(roll);
    const nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s;
    ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s;
    rx = nrx; ry = nry; rz = nrz;
  }

  const zx = -fx, zy = -fy, zz = -fz;
  const m00 = rx, m01 = ux, m02 = zx;
  const m10 = ry, m11 = uy, m12 = zy;
  const m20 = rz, m21 = uz, m22 = zz;

  const trace = m00 + m11 + m22;
  let x, y, z, w;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1.0) * 2;
    w = 0.25 * s;
    x = (m21 - m12) / s;
    y = (m02 - m20) / s;
    z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  return [x, y, z, w];
}

async function start() {
  const wasm = await init();
  // The CPU path's simulation is a par_for_each over every entity, so without a
  // rayon pool it runs on exactly one core no matter how many the machine has.
  // Needs cross-origin isolation (COOP/COEP) for SharedArrayBuffer; the dev
  // server sends both. Wrapped because a host that does not send those headers
  // should fall back to single-threaded rather than fail to start the demo.
  try {
    await initThreadPool(navigator.hardwareConcurrency);
  } catch (e) {
    console.warn("[murmuration] thread pool unavailable, running serial:", e);
  }

  // Read once, after the pool has resolved: this is what rayon will actually
  // use, which is not necessarily what was asked for.
  const rayonThreads = artisan_rayon_threads();

  const canvas = document.getElementById("gameCanvas");
  // `?msaa=1|2|4` — the sample count has to be decided before the renderer
  // builds its pipelines, so it is a URL parameter rather than a live control.
  const bootParams = new URLSearchParams(location.search);
  const msaa = parseInt(bootParams.get("msaa") || "4", 10);
  // `?faces=6` restores the all-six-faces cube. Only useful for comparing
  // against the 3-face path — the images are identical, the cost is not.
  const faces = bootParams.get("faces") === "6" ? 6 : 3;
  const renderer = new WebGPURenderer(canvas, { msaa });
  await renderer.init();
  renderer.setClearColor(0.0, 0.0, 0.0, 1.0);
  renderer.registerGPUSimShader(
    SHADER_TYPE,
    FlowComputeWGSL,
    makeFlowRenderWGSL(faces),
  );

  // Ride mode puts the camera inside the swarm, and the camera is itself a
  // particle in the same flow field — so it does not merely pass by the dense
  // filaments the field folds the cubes into, it gets advected into them along
  // with everything else. During one of those passes hundreds of cubes sit
  // within a near plane's distance at once, each one clipped open into an
  // interior sliver. Fading them out before they get there is what makes an
  // in-swarm camera viable at all.
  //
  // NEAR (0.1, from the Camera3D in src/lib.rs) plus the cube's bounding
  // radius is the distance at which clipping starts; vanishing well outside
  // that leaves room for the shrink itself to stay clear of the plane.
  const CUBE_RADIUS = CUBE_SCALE * Math.sqrt(3) * 0.5;
  renderer.renderer3D.setNearFade(2.0, Math.max(0.4, (0.1 + CUBE_RADIUS) * 2));

  const cubeData = mesh_cube(1.0);
  const cubeMeshId = renderer.assets.createMesh(cubeData.vertices, cubeData.indices);

  // Vertex *buffer* for the 3-face path, whose contents are never read: the
  // shader builds every corner from `@builtin(vertex_index)` alone. It still
  // has to exist and match the pipeline's 48-byte stride, because the vertex
  // layout is shared with the CPU path's real cube. 12 vertices = 3 faces x 4
  // corners; the index buffer fans each quad as (0,1,2)(2,3,0).
  const hullIndices = new Uint32Array(18);
  for (let f = 0; f < 3; f++) {
    const b = f * 4;
    hullIndices.set([b, b + 1, b + 2, b + 2, b + 3, b], f * 6);
  }
  const hullMeshId = renderer.assets.createMesh(
    new Float32Array(12 * 12),
    hullIndices,
  );
  // The CPU path draws real cubes through the engine's standard shader, which
  // knows nothing about face selection — so only the GPU path gets the hull.
  const gpuMeshId = faces === 3 ? hullMeshId : cubeMeshId;

  const params = new URLSearchParams(location.search);
  const touchDefaultCount = matchMedia("(pointer: coarse)").matches ? "25000" : "250000";
  let count = parseInt(params.get("count") || touchDefaultCount, 10);
  if (!Number.isFinite(count) || count < 1) count = Number(touchDefaultCount);
  let mode = params.get("mode") === "gpu" ? "gpu" : "cpu";
  // Off by default: it is a genuine rendering optimisation rather than a change
  // to the scene, but the demo's headline number is "how many cubes can this
  // engine put on screen", and answering that while quietly not drawing most of
  // them would be measuring the wrong thing. The toggle is there to show what
  // it costs and what it saves, on purpose.
  let cullEnabled = params.get("cull") === "1";
  // ?cam=orbit|ride — initial camera mode.
  const camParam = params.get("cam");
  // ?ui=0 (also off/false/hide/none) — start with no chrome at all, for
  // recording or a clean look. H still toggles it back, so this is a starting
  // state rather than a mode you can get stuck in.
  const uiParam = (params.get("ui") || "").toLowerCase();
  const startChromeHidden = ["0", "off", "false", "hide", "hidden", "none"].includes(
    uiParam,
  );

  let engine = null;
  let app = null;
  let camEntity = -1;
  let spawnMs = 0;

  const avgCpu = new RollingAverage();
  const avgUpload = new RollingAverage();
  const avgGpu = new RollingAverage();
  const avgFrame = new RollingAverage();

  const el = (id) => document.getElementById(id);

  // 32 bytes per particle in the GPU-sim storage buffer; a storage binding
  // has a hard ceiling (renderer.device.limits.maxStorageBufferBindingSize).
  // Asking for one byte past it fails buffer creation with nothing on screen
  // to explain why, so clamp and say so instead — same fix as bouncing_rects.
  const GPU_MAX_COUNT = Math.floor(
    renderer.device.limits.maxStorageBufferBindingSize / 32,
  );

  function buildScene() {
    let note = "";
    if (mode === "gpu" && count > GPU_MAX_COUNT) {
      note = ` — capped from ${count.toLocaleString()} (this GPU allows ${GPU_MAX_COUNT.toLocaleString()})`;
      count = GPU_MAX_COUNT;
    } else if (count >= 2000000) {
      note =
        mode === "cpu"
          ? " — CPU mode at this count may hang the tab for several seconds while spawning, and the tick itself will likely drop well under interactive framerate"
          : " — large GPU allocation, may be slow to spawn or fail outright depending on your GPU";
    }
    el("count-note").innerText = note;

    el("loading").style.display = "block";
    el("loading").innerText =
      mode === "cpu"
        ? `Spawning ${count.toLocaleString()} entities…`
        : `Allocating ${count.toLocaleString()} particles…`;

    // Let the browser paint the loading line before we block the main thread.
    // Deliberately a timer and not rAF: rAF never fires in a background tab, so
    // a scene rebuild would hang forever if the user switched away mid-load.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
        // Drop any GPU-sim buffers belonging to the previous scene; the state
        // map is keyed by entity id and those ids get reused.
        for (const state of renderer.renderer3D.gpuSimStates.values()) {
          state.particleBuffer?.destroy();
          state.paramBuffer?.destroy();
        }
        renderer.renderer3D.gpuSimStates.clear();
        // The new engine's Time starts at zero and camClock is reset below, so
        // the GPU sim clock has to restart too — otherwise the GPU swarm runs
        // the same flow field at a completely different phase than the CPU
        // swarm and than the camera riding it.
        renderer.renderer3D.resetSimTime();
        // Re-applied per build: the culling resources are per-simulation and
        // were just thrown away with the old scene's GPU state above.
        renderer.renderer3D.setFrustumCulling(cullEnabled && mode === "gpu");

        const t0 = performance.now();
        engine =
          mode === "cpu"
            ? create_swarm_cpu(count, cubeMeshId, CUBE_SCALE)
            : create_swarm_gpu(count, gpuMeshId, CUBE_SCALE);
        spawnMs = performance.now() - t0;

        app = new ArtisanApp(engine, wasm.memory).registerStandardSchemas();
        // InputManager defaults to swallowing almost every keydown (including
        // F11) via preventDefault, on the assumption a game wants to own the
        // keyboard. This demo doesn't capture WASD or anything else the OS/
        // browser would otherwise handle, so let real hotkeys through. A new
        // InputManager is created on every rebuild, so this has to be redone
        // each time rather than once at startup.
        app.input.setBlockHotkeys(false);

        const cams = app.world.query(["Camera3D", "Transform"]);
        camEntity = cams.length && cams[0].len ? cams[0].entities[0] : -1;

        // Restart the camera so switching CPU/GPU shows the same view from the
        // same place — otherwise the two modes look different when they aren't.
        camClock = 0;
        ridePos = [22, 5, 9];
        rideVel = [0, 0, 0];
        resetCameraFrame();

        avgCpu.reset();
        avgUpload.reset();
        avgGpu.reset();
        avgFrame.reset();

        el("loading").style.display = "none";
        // Handy for profiling from the console.
        window.__murmuration = {
          engine, app, renderer, updateCamera,
          get mode() { return mode; },
          get camMode() { return camMode; },
          get count() { return count; },
          get camClock() { return camClock; },
        };
          syncButtons();
          resolve();
        } catch (error) {
          el("loading").style.display = "none";
          reject(error);
        }
      }, 32);
    });
  }

  // -- camera ---------------------------------------------------------------
  // A single smooth oval orbit around the swarm's centre, always facing the
  // centre. No cuts, no direction changes — one continuous, predictable motion
  // so the eye has one thing to track instead of re-orienting every few
  // seconds. The tradeoff versus a flythrough is deliberate: legible over
  // impressive.
  //
  // Two modes:
  //   orbit — a fixed overview of the swarm. The old moving orbit was so slow
  //           that it read as broken; the static composition looks better.
  //   ride  — the camera IS a particle: it moves through the exact same flow
  //           field the cubes do, so it drifts, banks and folds with the
  //           swarm instead of flying through it. No WASD: the ride is always
  //           happening, the same way it's always happening for every cube.
  // In both modes, dragging looks around — but the look offset composes onto
  // the camera's own current heading rather than world axes, the way turning
  // your head inside a moving cockpit doesn't change where the ship is going.
  let camClock = 0;
  let camMode = camParam === "orbit" || camParam === "ride" ? camParam : "ride";
  let dragging = false;
  // Consumed once per frame in updateCamera, then zeroed — not an absolute
  // angle. See the continuity-frame note below for why.
  let pendingYaw = 0;
  let pendingPitch = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    pendingYaw -= e.movementX * 0.005;
    pendingPitch -= e.movementY * 0.004;
  });

  // Live ambient tuning with [ and ]. The CPU path lights through the engine's
  // standard shader while the GPU path has its own fragment shader, so the two
  // need to be matched by eye rather than by using the same number.
  window.addEventListener("keydown", (e) => {
    if (e.key !== "[" && e.key !== "]") return;
    const views = app.world.query(["AmbientLight"]);
    if (!views.length || !views[0].len) return;
    const amb = views[0].arrays["AmbientLight"];
    amb[3] = Math.max(0, amb[3] * (e.key === "]" ? 1.15 : 0.87));
    const note = el("hint");
    note.innerText = `ambient intensity: ${amb[3].toFixed(0)}`;
  });

  // Browsers reserve F11 for their own chrome — a page cannot hook that
  // specific key, so "enabling" fullscreen means offering the Fullscreen API
  // on a key the page IS allowed to see. Bound to F.
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") toggleFullscreen();
  });
  // There's no F key on a phone — the on-screen button (shown only on touch,
  // via the body.touch class below) is the only way in. iOS Safari has no
  // Fullscreen API at all; requestFullscreen silently rejects there, so this
  // button quietly does nothing on iPhone rather than pretending to work.
  el("fullscreen").addEventListener("click", toggleFullscreen);

  // Coarse pointer = finger, not mouse — see the matching CSS media query.
  // Used to show touch-only controls and swap keyboard-hint text for
  // finger-hint text; it does not change any control logic itself, since
  // pointer events already unify mouse and touch input.
  const isTouch = matchMedia("(pointer: coarse)").matches;
  if (isTouch) {
    document.body.classList.add("touch");
    el("hint").innerText = "drag to look around - ⛶ fullscreen";
  }

  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  function norm3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

  /// Rotate v around unit axis by angle (Rodrigues). Generic on purpose: this
  /// code got a camera basis sign wrong twice already by hand-deriving cross
  /// products for a specific case, so the general formula is used everywhere
  /// a vector needs rotating, and correctness is checked numerically rather
  /// than by eye.
  function rotateAroundAxis(v, axis, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const d = dot3(v, axis);
    const cr = cross3(axis, v);
    return [
      v[0] * c + cr[0] * s + axis[0] * d * (1 - c),
      v[1] * c + cr[1] * s + axis[1] * d * (1 - c),
      v[2] * c + cr[2] * s + axis[2] * d * (1 - c),
    ];
  }

  // -- continuity-preserving camera frame --------------------------------
  //
  // The previous approach recomputed "right" from world-up every single
  // frame: right = cross(forward, worldUp). That's the standard formula, and
  // it's exactly what broke: whenever forward points nearly straight up or
  // down, worldUp and forward go parallel, the cross product collapses
  // toward zero, and the code falls back to an arbitrary axis — which flips
  // discontinuously as forward crosses that pole. Ride mode aims at the
  // world centre from a position whose height varies constantly, so it
  // swings through near-vertical often, and every pass through it looked
  // like a sudden disorienting snap.
  //
  // The fix is to never rebuild the frame from world-up after the first
  // frame. Instead curRight/curFwd are carried from the previous frame and
  // updated only by small, continuous rotations — drag input, then a gentle
  // auto-aim toward the target direction — so there is no recomputation step
  // that can ever discontinuously flip. This is the standard fix for gimbal-
  // /pole-flip in free cameras (a poor-man's parallel transport), not a
  // workaround specific to this scene.
  let camFrameReady = false;
  let curFwd = [0, 0, -1];
  let curRight = [1, 0, 0];
  // 1/s smoothing rate the view eases toward the target heading. This is a
  // proportional (exponential) ease, not a constant-speed chase: the further
  // off-target, the faster it moves, and it decelerates naturally as it
  // arrives instead of moving at full speed right up to a hard stop. That
  // matters here because the target itself (look-at-swarm-centre) can jump by
  // a large angle in a single frame whenever the ride particle passes near
  // the origin — with a constant-speed chase that jump reads as a snap right
  // as the correction kicks in; eased, the same jump reads as a slow drift
  // that's essentially invisible. Low on purpose — this should never be the
  // most noticeable thing happening on screen.
  const AIM_EASE_RATE = 0.35;

  function resetCameraFrame() {
    camFrameReady = false;
    pendingYaw = 0;
    pendingPitch = 0;
  }

  function stepCameraFrame(targetFwd, dt) {
    if (!camFrameReady) {
      curFwd = targetFwd.slice();
      const seed = Math.abs(curFwd[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      curRight = norm3(cross3(curFwd, seed));
      camFrameReady = true;
    }

    // Drag: yaw around the current up, then pitch around the yawed right —
    // both derived from the frame we already have, never from world axes.
    if (pendingYaw !== 0 || pendingPitch !== 0) {
      const up = cross3(curRight, curFwd);
      curFwd = norm3(rotateAroundAxis(curFwd, up, pendingYaw));
      curRight = norm3(rotateAroundAxis(curRight, up, pendingYaw));
      curFwd = norm3(rotateAroundAxis(curFwd, curRight, pendingPitch));
      pendingYaw = 0;
      pendingPitch = 0;
    }

    // Auto-aim: ease a fraction of the remaining angle toward the target each
    // frame (exponential smoothing), so both letting go of the mouse and the
    // target itself jumping around (see AIM_EASE_RATE) settle out as a slow
    // drift rather than a snap.
    const cosA = Math.max(-1, Math.min(1, dot3(curFwd, targetFwd)));
    const angle = Math.acos(cosA);
    if (angle > 1e-5) {
      const axis = norm3(cross3(curFwd, targetFwd));
      const step = angle * (1 - Math.exp(-AIM_EASE_RATE * dt));
      curFwd = norm3(rotateAroundAxis(curFwd, axis, step));
      curRight = norm3(rotateAroundAxis(curRight, axis, step));
    }

    // Drift correction: keep right exactly orthogonal to forward.
    curRight = norm3(sub3(curRight, scale3(curFwd, dot3(curRight, curFwd))));
    const curUp = cross3(curRight, curFwd);
    return basisToQuat(curRight, curUp, curFwd, 0);
  }

  // -- fixed overview ---------------------------------------------------------
  const FIXED_EYE = [42, 15, 30];

  function orbitEye() {
    return FIXED_EYE;
  }

  // -- ride mode ----------------------------------------------------------
  // A single virtual particle, stepped with the exact field and integration
  // src/lib.rs runs for every real cube (mirrored again here rather than
  // shared, the same way the GPU compute shader mirrors it — the swarm's
  // actual entities live in Rust memory or a GPU buffer, neither of which is
  // cheap or uniform to read a single position back out of every frame, and
  // this camera needs to behave identically in both modes anyway).
  const RIDE_FLOW_SPEED = 7.0;
  function rideFlowField(x, y, z, t) {
    const S = 0.09;
    let vx = Math.sin(y * S + t * 0.31) + Math.cos(z * S * 1.3 - t * 0.21);
    let vy = Math.sin(z * S * 1.1 + t * 0.27) + Math.cos(x * S * 0.9 + t * 0.19);
    let vz = Math.sin(x * S * 1.2 - t * 0.23) + Math.cos(y * S * 1.05 + t * 0.25);
    vx += -z * 0.05;
    vz += x * 0.05;
    const r = Math.hypot(x, y, z);
    const over = Math.max(r / BOUNDS - 0.6, 0);
    if (over > 0 && r > 0.001) {
      const pull = over * over * 3.0;
      vx -= (x / r) * pull;
      vy -= (y / r) * pull;
      vz -= (z / r) * pull;
    }
    return [vx, vy, vz];
  }
  let ridePos = [22, 5, 9];
  let rideVel = [0, 0, 0];
  let rideFwd = [0, 0, -1];

  function stepRide(dt) {
    const target = rideFlowField(ridePos[0], ridePos[1], ridePos[2], camClock);
    const blend = 1 - Math.exp(-dt * 2.5);
    for (let i = 0; i < 3; i++) {
      rideVel[i] += (target[i] * RIDE_FLOW_SPEED - rideVel[i]) * blend;
    }
    for (let i = 0; i < 3; i++) ridePos[i] += rideVel[i] * dt;
    const sl = Math.hypot(rideVel[0], rideVel[1], rideVel[2]);
    if (sl > 0.05) rideFwd = [rideVel[0] / sl, rideVel[1] / sl, rideVel[2] / sl];
  }

  function updateCamera(dt) {
    if (camEntity < 0) return;
    camClock += dt;
    stepRide(dt); // always running, so switching modes never pops

    let eye, baseFwd;
    if (camMode === "orbit") {
      eye = orbitEye(camClock);
      const dx = -eye[0], dy = -eye[1], dz = -eye[2];
      const dl = Math.hypot(dx, dy, dz) || 1;
      baseFwd = [dx / dl, dy / dl, dz / dl];
    } else {
      eye = ridePos;
      // Looking along the ride's own velocity mostly points into open space
      // between cubes — neighbours in a smooth flow field drift together, so
      // there's rarely much *in front of* a particle moving with the flow.
      // Facing the swarm's centre of volume instead keeps the dense core in
      // frame no matter where the ride currently is, while the position still
      // moves organically with the field rather than sitting on a fixed path.
      const dx = -eye[0], dy = -eye[1], dz = -eye[2];
      const dl = Math.hypot(dx, dy, dz) || 1;
      baseFwd = dl > 1e-3 ? [dx / dl, dy / dl, dz / dl] : rideFwd;
    }

    const q = stepCameraFrame(baseFwd, dt);

    const views = app.world.query(["Camera3D", "Transform"]);
    if (!views.length || !views[0].len) return;
    const tr = views[0].arrays["Transform"];
    tr[0] = eye[0]; tr[1] = eye[1]; tr[2] = eye[2];
    tr[3] = q[0]; tr[4] = q[1]; tr[5] = q[2]; tr[6] = q[3];
    app.world.wasm.wasm_mark_changed(camEntity, app.world.schemas["Transform"].id);

    const cam = views[0].arrays["Camera3D"];
    cam[1] = canvas.width / Math.max(canvas.height, 1); // aspect
  }

  // -- ui -------------------------------------------------------------------
  function syncButtons() {
    for (const b of document.querySelectorAll("[data-count]")) {
      b.classList.toggle("active", parseInt(b.dataset.count, 10) === count);
    }
    for (const b of document.querySelectorAll("[data-mode]")) {
      b.classList.toggle("active", b.dataset.mode === mode);
    }
    for (const b of document.querySelectorAll("[data-cam]")) {
      b.classList.toggle("active", b.dataset.cam === camMode);
    }
    for (const b of document.querySelectorAll("[data-cull]")) {
      b.classList.toggle("active", (b.dataset.cull === "on") === cullEnabled);
    }
    el("row-cpu-label").innerText =
      mode === "cpu" ? "ECS tick (simulate all)" : "ECS tick (1 entity)";
  }

  // The panel is off by default — the swarm should be the only thing on screen
  // when the page loads. `H` or the pill brings it back.
  //
  // "Chrome hidden" (?ui=0) is a stronger state than "panel closed": it also
  // drops the pill and the hint line, so nothing at all overlays the render.
  // H lifts it, so a recording session can still get the controls back without
  // editing the URL.
  const panel = el("ui");
  const toggle = el("toggle");
  const hint = el("hint");
  let chromeHidden = startChromeHidden;
  function setPanel(open) {
    panel.hidden = !open;
    toggle.style.display = open || chromeHidden ? "none" : "block";
    hint.style.display = chromeHidden ? "none" : "block";
  }
  toggle.addEventListener("click", () => setPanel(true));
  el("close").addEventListener("click", () => setPanel(false));
  window.addEventListener("keydown", (e) => {
    if (e.key !== "h" && e.key !== "H") return;
    // From fully hidden, H restores the chrome and opens the panel in one
    // press rather than making the user hit it twice with nothing visible
    // happening in between.
    if (chromeHidden) {
      chromeHidden = false;
      setPanel(true);
    } else {
      setPanel(panel.hidden);
    }
  });
  setPanel(false);

  for (const b of document.querySelectorAll("[data-count]")) {
    b.addEventListener("click", async () => {
      count = parseInt(b.dataset.count, 10);
      await buildScene();
    });
  }
  for (const b of document.querySelectorAll("[data-mode]")) {
    b.addEventListener("click", async () => {
      mode = b.dataset.mode;
      await buildScene();
    });
  }
  // No scene rebuild: culling only changes which instances get submitted, not
  // what the simulation contains, so it can be flipped mid-flight and the swarm
  // carries on undisturbed. That is also what makes it easy to see it is
  // lossless — toggle it while watching and the image does not change, only the
  // GPU time does.
  for (const b of document.querySelectorAll("[data-cull]")) {
    b.addEventListener("click", () => {
      cullEnabled = b.dataset.cull === "on";
      renderer.renderer3D.setFrustumCulling(cullEnabled);
      syncButtons();
    });
  }
  for (const b of document.querySelectorAll("[data-cam]")) {
    b.addEventListener("click", () => {
      camMode = b.dataset.cam;
      // Ride and orbit look at completely different targets (the flow-field
      // heading vs. the ellipse's centre-facing direction). Without this, the
      // slow continuous ease from stepCameraFrame — deliberately gentle so a
      // wandering ride target never snaps — would also govern this switch,
      // so the view could take several seconds to catch up to a mode the
      // user explicitly just picked. A manual mode switch is a discrete,
      // deliberate action, unlike the continuous per-frame target drift, so
      // it gets the instant re-aim: the same "first frame" snap buildScene
      // already gets via camFrameReady starting false.
      resetCameraFrame();
      syncButtons();
    });
  }

  await buildScene();

  // -- loop -----------------------------------------------------------------
  let last = performance.now();
  let fpsLast = last;
  let frames = 0;
  let fps = 0;

  const loop = (now) => {
    // Everything that can throw lives inside this try. Without it, one bad
    // frame — a resize mid-transition, a transient WebGPU validation error,
    // anything — throws out of the rAF callback and the chain below never
    // re-arms: no more requestAnimationFrame(loop) call ever happens, so the
    // canvas freezes on whatever it last drew and nothing (fullscreen exit
    // included, since that's also driven by this same loop noticing state)
    // can bring it back short of reloading the page. The finally block is
    // what actually fixes that: it re-arms the next frame unconditionally,
    // so a bad frame costs one dropped frame instead of the whole demo.
    try {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frames++;
      if (now - fpsLast >= 500) {
        fps = (frames * 1000) / (now - fpsLast);
        frames = 0;
        fpsLast = now;
      }

      // A lost device cannot be rendered with again, and the loop below would
      // otherwise keep spinning silently forever against a dead surface. Say
      // what happened instead of leaving a frozen canvas on screen.
      if (renderer.deviceLost) {
        const note = el("hint");
        // Shown even under ?ui=0: a dead canvas with no explanation is worse
        // than a line of text intruding on a recording.
        note.style.display = "block";
        note.innerText = `GPU device lost (${renderer.deviceLost.reason}) — reload to restart`;
        return;
      }

      updateCamera(dt);

      const t0 = performance.now();
      engine.tick(dt);
      const cpuMs = performance.now() - t0;

      // Same dt the ECS tick just ran with, so the GPU swarm integrates on the
      // identical timestep rather than on a separately-measured one.
      renderer.render3D(app.world, dt);

      const stats = renderer.renderer3D.lastStats;
      avgCpu.add(cpuMs);
      avgUpload.add(stats.writeBufferTimeMs);
      avgGpu.add(stats.gpuExecutionTimeMs);
      avgFrame.add(dt * 1000);

      if (!panel.hidden) {
        el("v-count").innerText = count.toLocaleString();
        el("v-fps").innerText = fps.toFixed(0);
        el("v-cpu").innerText = `${avgCpu.get().toFixed(2)} ms`;
        el("v-gpu").innerText = `${avgGpu.get().toFixed(2)} ms`;
        el("v-frame").innerText = `${avgFrame.get().toFixed(1)} ms`;
        // Reported by rayon itself rather than from hardwareConcurrency, so a
        // pool that failed to start reads 1 instead of claiming 20.
        el("v-threads").innerText =
          mode === "cpu" ? String(rayonThreads) : `${rayonThreads} (idle)`;
        // What actually reached the rasteriser. With culling off this is the
        // whole swarm; with it on, the gap between this and Entities is the
        // part of the swarm that was off-screen.
        const cs = renderer.renderer3D.lastCullStats;
        el("v-drawn").innerText =
          cullEnabled && mode === "gpu"
            ? `${cs.drawn.toLocaleString()} (${((100 * cs.drawn) / Math.max(count, 1)).toFixed(0)}%)`
            : count.toLocaleString();
      }
    } catch (err) {
      console.error("[murmuration] frame error (continuing):", err);
    } finally {
      requestAnimationFrame(loop);
    }
  };
  requestAnimationFrame(loop);
}

start().catch((e) => {
  const loading = document.getElementById("loading");
  const insecureWebGPU = !window.isSecureContext && !navigator.gpu;
  loading.style.display = "flex";
  loading.style.padding = "2rem";
  loading.style.textAlign = "center";
  loading.style.lineHeight = "1.5";
  loading.style.pointerEvents = "none";
  loading.innerText = insecureWebGPU
    ? "WebGPU is blocked because this LAN page uses HTTP. Open it through HTTPS, or mark this development origin as secure in Chrome flags."
    : `Failed to start: ${e.message}`;

  // Startup normally wires these controls later. Keep the panel available
  // when startup fails so a phone never presents visible but dead UI.
  const panel = document.getElementById("ui");
  const toggle = document.getElementById("toggle");
  toggle.addEventListener("click", () => {
    panel.hidden = false;
    toggle.style.display = "none";
  });
  document.getElementById("close").addEventListener("click", () => {
    panel.hidden = true;
    toggle.style.display = "block";
  });
  console.error(e);
});
