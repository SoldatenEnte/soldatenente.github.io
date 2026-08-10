import init, { create_rects, mesh_unit_quad } from "./pkg/bouncing_rects.js";
import { ArtisanApp } from "./engine/App.js";
import { WebGPURenderer } from "./engine/Renderer.js";

// Must match SHADER_TYPE in src/lib.rs.
const SHADER_TYPE = 21.0;

// ---------------------------------------------------------------------------
// The whole demo.
//
// Per instance the GPU keeps 32 bytes: position (3), velocity (3), half-width,
// half-height. That layout is fixed by the engine's GPU-sim pipeline, so the
// compute struct and the vertex attributes below are two views of the same
// bytes and must stay in step.
//
// Nothing is uploaded per rect, ever. The compute shader seeds each rect from
// its own instance index the first frame it runs, and the vertex shader derives
// the colour from the same index — so a million rects cost one dispatch and one
// draw call.
//
// The visible world is y in [-1, 1] and x in [-aspect, aspect] (see FOV/CAM_DIST
// in src/lib.rs), which is why the walls are just the bounds uniform.
// ---------------------------------------------------------------------------

const RectComputeWGSL = `
  struct Rect {
      pos_x: f32, pos_y: f32, pos_z: f32,
      vel_x: f32, vel_y: f32, vel_z: f32,
      half_w: f32,
      half_h: f32,
  };
  @group(0) @binding(0) var<storage, read_write> rects: array<Rect>;

  struct SimParams {
      speed: f32, size: f32, bounds_x: f32, bounds_y: f32,
      time: f32, dt: f32, row_stride: f32, pad2: f32,
  };
  @group(0) @binding(1) var<uniform> params: SimParams;

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

  @compute @workgroup_size(64)
  fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
      // Flat index across a possibly-2D dispatch; see SIM_WORKGROUP_SIZE in
      // Renderer3D.js. With a single row this is just id.x.
      let index = id.x + id.y * u32(params.row_stride);
      if (index >= arrayLength(&rects)) { return; }
      var r = rects[index];

      // The host fills the buffer with half_w == 1.0 on allocation, and a real
      // rect is never that wide (a full screen height), so exactly 1.0 means
      // "never simulated" and we seed from the index.
      if (abs(r.half_w - 1.0) < 1e-6) {
          r.half_w = (0.004 + hash_f32(index * 3u + 1u) * 0.018) * params.size;
          r.half_h = (0.004 + hash_f32(index * 5u + 7u) * 0.018) * params.size;

          r.pos_x = (hash_f32(index * 11u + 29u) * 2.0 - 1.0) * (params.bounds_x - r.half_w);
          r.pos_y = (hash_f32(index * 13u + 37u) * 2.0 - 1.0) * (params.bounds_y - r.half_h);
          // A stable per-rect depth purely so overlapping rects have a fixed
          // draw order under the depth test instead of flickering.
          r.pos_z = hash_f32(index * 17u + 71u) * 0.9 - 0.45;

          // One random direction, held forever except when a wall flips it.
          let angle = hash_f32(index * 19u + 53u) * 6.2831853;
          let speed = 0.02 + hash_f32(index * 23u + 97u) * 0.10;
          r.vel_x = cos(angle) * speed;
          r.vel_y = sin(angle) * speed;
          r.vel_z = 0.0;
      }

      let dt = min(params.dt, 0.05) * params.speed;
      var p = vec2<f32>(r.pos_x, r.pos_y) + vec2<f32>(r.vel_x, r.vel_y) * dt;
      var v = vec2<f32>(r.vel_x, r.vel_y);

      // Reflect off the walls. Clamping the position as well as flipping the
      // velocity is what keeps a rect from sticking to a wall it is still
      // outside of on the next frame — which is exactly what happens on a
      // window resize, when the wall moves onto the rect rather than the other
      // way round.
      let lim = vec2<f32>(params.bounds_x - r.half_w, params.bounds_y - r.half_h);
      if (p.x >  lim.x) { p.x =  lim.x; v.x = -abs(v.x); }
      if (p.x < -lim.x) { p.x = -lim.x; v.x =  abs(v.x); }
      if (p.y >  lim.y) { p.y =  lim.y; v.y = -abs(v.y); }
      if (p.y < -lim.y) { p.y = -lim.y; v.y =  abs(v.y); }

      r.pos_x = p.x; r.pos_y = p.y;
      r.vel_x = v.x; r.vel_y = v.y;
      rects[index] = r;
  }
`;

const RectRenderWGSL = `
  // Only the first member is read, but the struct has to mirror what the
  // renderer writes into sceneBuffer3D for the offsets to line up.
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
  };

  // NO TONEMAP HERE, DELIBERATELY.
  //
  // ACES is a scene-referred to display-referred operator: it maps HDR light
  // onto a display. Murmuration needs it because its cubes are lit — real light
  // intensities land well above 1.0 and have to be rolled off. These rects have
  // no lighting at all; the HSL pick below is already a display colour. Running
  // it through ACES anyway is not colour management, it is a chroma-destroying
  // curve with a built-in 1/0.6 = 1.67x lift, and it was measured doing exactly
  // that: chroma 0.61 -> 0.38 -> 0.30, luma up 1.1x. Bright and washed out.
  //
  // The sRGB decode/encode round trip goes with it. It only earns its keep when
  // there is a linear-light stage in between to be correct about, and here
  // there isn't one — decode immediately followed by encode is a no-op with
  // rounding.
  //
  // So the palette below is the only lever on how the demo looks, which is the
  // honest situation for flat unlit colour.

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

  @vertex
  fn vs_main(
      @location(0) vertex_pos:    vec3<f32>,
      @location(1) vertex_normal: vec3<f32>,
      @location(2) vertex_uv:     vec2<f32>,
      @location(6) vertex_color:  vec4<f32>,
      @location(3) inst_pos:    vec3<f32>,
      @location(4) inst_vel:    vec3<f32>,
      @location(5) inst_half_w: f32,
      @location(7) inst_half_h: f32,
      @builtin(instance_index) instance_idx: u32,
  ) -> VertexOutput {
      let world = vec3<f32>(
          inst_pos.x + vertex_pos.x * inst_half_w,
          inst_pos.y + vertex_pos.y * inst_half_h,
          inst_pos.z
      );

      // Colour straight off the index: no storage, no upload, stable for the
      // life of the rect.
      //
      // Neon needs high saturation AND high lightness together — the #00ff88
      // corner. Capping both avoids it but costs all the contrast, because
      // against a black background contrast comes from having genuinely bright
      // rects to play against the dark ones.
      //
      // So lightness runs wide and well into the bright end, and saturation is
      // tapered as lightness climbs instead. Dark rects get to be deep and
      // fully saturated, bright rects land softer — neither end reaches the
      // neon corner, and the spread between them is the contrast.
      let hue = hash_f32(instance_idx * 29u + 131u);
      let tl = hash_f32(instance_idx * 37u + 191u);
      let lit = 0.24 + tl * 0.36;
      let sat_cap = 0.90 - tl * 0.26;
      let sat = sat_cap - hash_f32(instance_idx * 31u + 149u) * 0.22;
      let rgb = hsl_to_rgb(hue, sat, lit);

      var out: VertexOutput;
      out.position = scene.view_proj * vec4<f32>(world, 1.0);
      out.color = vec4<f32>(rgb, 1.0);
      return out;
  }

  @fragment
  fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
      return in.color;
  }
`;

// ---------------------------------------------------------------------------

async function start() {
  const wasm = await init();

  const canvas = document.getElementById("gameCanvas");
  const bootParams = new URLSearchParams(location.search);
  const msaa = parseInt(bootParams.get("msaa") || "4", 10);
  const renderer = new WebGPURenderer(canvas, { msaa });
  await renderer.init();
  renderer.setClearColor(0.0, 0.0, 0.0, 1.0);
  renderer.registerGPUSimShader(SHADER_TYPE, RectComputeWGSL, RectRenderWGSL);

  const quad = mesh_unit_quad();
  const quadMeshId = renderer.assets.createMesh(quad.vertices, quad.indices);

  const params = new URLSearchParams(location.search);
  // Modest by default: the point is that you can see rects on black. Turn it up
  // from the panel — the cost of another zero is one float.
  let count = parseInt(params.get("count") || "10000", 10);
  // ?ui=0 (also off/false/hide/none) — start with no chrome at all, for
  // recording or a clean look. H still brings it back, so this is a starting
  // state rather than a mode you can get stuck in.
  const uiParam = (params.get("ui") || "").toLowerCase();
  const startChromeHidden = ["0", "off", "false", "hide", "hidden", "none"].includes(
    uiParam,
  );

  // 32 bytes of storage per rect, and a storage binding has a hard ceiling.
  // Asking for one byte past it makes the buffer fail to create and the scene
  // never appear, with nothing on screen to explain why — so clamp, and say so.
  const MAX_COUNT = Math.floor(renderer.device.limits.maxStorageBufferBindingSize / 32);

  const el = (id) => document.getElementById(id);

  let engine = null;
  let app = null;

  function buildScene() {
    const asked = count;
    if (!Number.isFinite(count) || count < 1) count = 10000;
    count = Math.min(Math.floor(count), MAX_COUNT);
    el("note").innerText =
      asked > count
        ? `Capped from ${asked.toLocaleString()} — this GPU allows ${MAX_COUNT.toLocaleString()}.`
        : "";

    el("loading").style.display = "block";
    el("loading").innerText = `Allocating ${count.toLocaleString()} rects…`;

    // Let the loading line paint before we allocate. A timer rather than rAF:
    // rAF never fires in a background tab, and a rebuild there would hang.
    return new Promise((resolve) => {
      setTimeout(() => {
        // The GPU-sim state map is keyed by entity id and ids get reused, so
        // the old scene's buffers have to go before the new one asks for its.
        for (const state of renderer.renderer3D.gpuSimStates.values()) {
          state.particleBuffer?.destroy();
          state.paramBuffer?.destroy();
        }
        renderer.renderer3D.gpuSimStates.clear();

        engine = create_rects(count, quadMeshId);
        app = new ArtisanApp(engine, wasm.memory).registerStandardSchemas();

        el("loading").style.display = "none";
        window.__rects = { engine, app, renderer, get count() { return count; } };
        syncButtons();
        resolve();
      }, 32);
    });
  }

  function syncButtons() {
    for (const b of document.querySelectorAll("[data-count]")) {
      b.classList.toggle("active", parseInt(b.dataset.count, 10) === count);
    }
    // Mirror the live count into the field, so it always shows what is actually
    // running — including after a preset click or a cap.
    el("count-input").value = String(count);
  }
  for (const b of document.querySelectorAll("[data-count]")) {
    b.addEventListener("click", async () => {
      count = parseInt(b.dataset.count, 10);
      await buildScene();
    });
  }

  async function spawnCustom() {
    const n = parseInt(el("count-input").value, 10);
    if (!Number.isFinite(n) || n < 1) {
      el("note").innerText = "Enter a whole number of rects.";
      return;
    }
    count = n;
    await buildScene();
  }
  el("count-go").addEventListener("click", spawnCustom);
  el("count-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") spawnCustom();
  });

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
    // Not while the count field has focus, or typing "h" into it closes the
    // panel out from under the thing being typed into.
    if (e.target === el("count-input")) return;
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  window.addEventListener("keydown", (e) => {
    if (e.target === el("count-input")) return;
    if (e.key === "f" || e.key === "F") toggleFullscreen();
  });
  // There's no F key on a phone — the on-screen button (shown only on touch,
  // via the body.touch class below) is the only way in. iOS Safari has no
  // Fullscreen API at all; requestFullscreen silently rejects there, so this
  // button quietly does nothing on iPhone rather than pretending to work.
  el("fullscreen").addEventListener("click", toggleFullscreen);

  // Coarse pointer = finger, not mouse — see the matching CSS media query.
  // Used to show touch-only controls and swap keyboard-hint text for
  // finger-hint text; it does not change any control logic.
  if (matchMedia("(pointer: coarse)").matches) {
    document.body.classList.add("touch");
    hint.innerText = "tap stats · ⛶ fullscreen";
  }

  await buildScene();

  let last = performance.now();
  let fpsLast = last;
  let frames = 0;
  let fps = 0;

  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frames++;
    if (now - fpsLast >= 500) {
      fps = (frames * 1000) / (now - fpsLast);
      frames = 0;
      fpsLast = now;
    }

    const aspect = canvas.width / Math.max(canvas.height, 1);
    const cams = app.world.query(["Camera3D", "Transform"]);
    if (cams.length && cams[0].len) cams[0].arrays["Camera3D"][1] = aspect;
    // bounds_x rides in the GPUDrivenSimulation.gravity slot, which the
    // renderer copies into the compute uniform every frame — so the walls track
    // the window without any resize handler.
    const sims = app.world.query(["GPUDrivenSimulation"]);
    if (sims.length && sims[0].len) sims[0].arrays["GPUDrivenSimulation"][5] = aspect;

    engine.tick(dt);
    renderer.render3D(app.world);

    if (!panel.hidden) {
      const stats = renderer.renderer3D.lastStats;
      el("v-count").innerText = count.toLocaleString();
      el("v-fps").innerText = fps.toFixed(0);
      el("v-frame").innerText = `${(dt * 1000).toFixed(1)} ms`;
      el("v-gpu").innerText = `${stats.gpuExecutionTimeMs.toFixed(2)} ms`;
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

start().catch((e) => {
  document.getElementById("loading").innerText = `Failed to start: ${e.message}`;
  console.error(e);
});
