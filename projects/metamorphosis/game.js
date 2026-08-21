import init, {
  create_lattice,
  set_churn,
  take_migrations,
  corner_counts,
  mesh_cube,
  initThreadPool,
} from "./pkg/metamorphosis.js";
import { ArtisanApp } from "./engine/App.js";
import { WebGPURenderer } from "./engine/Renderer.js";

const CUBE_SCALE = 0.15;

/// Must match CORNER_COL in src/lib.rs — these are the same eight archetypes,
/// labelled here for the panel and tinted there for the scene.
const CORNERS = [
  { sig: "{ }", col: [0.30, 0.34, 0.42] },
  { sig: "E", col: [0.98, 0.42, 0.18] },
  { sig: "F", col: [0.24, 0.72, 0.95] },
  { sig: "E F", col: [0.96, 0.85, 0.32] },
  { sig: "S", col: [0.72, 0.32, 0.95] },
  { sig: "E S", col: [0.99, 0.30, 0.55] },
  { sig: "F S", col: [0.30, 0.92, 0.78] },
  { sig: "E F S", col: [0.96, 0.96, 0.98] },
];

/// Smaller stride = more of the world migrates per tick. See `Churn` in
/// src/lib.rs; 0 freezes structural change entirely, which is the control
/// case — same scene, same draw calls, no archetype moves.
const CHURN_LEVELS = [
  { name: "Off", stride: 0 },
  { name: "Low", stride: 900 },
  { name: "Mid", stride: 260 },
  { name: "High", stride: 70 },
  { name: "Max", stride: 18 },
];

const rgbCss = (c) =>
  `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

class RollingAverage {
  constructor(n = 40) {
    this.n = n;
    this.reset();
  }
  reset() {
    this.buf = [];
    this.i = 0;
  }
  add(v) {
    if (!Number.isFinite(v)) return;
    this.buf[this.i % this.n] = v;
    this.i++;
  }
  get() {
    if (!this.buf.length) return 0;
    return this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
  }
}

function quatMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

async function start() {
  const wasm = await init();
  const isMobile = matchMedia("(pointer: coarse), (max-width: 700px)").matches;
  // The eight placement systems are each a par_for_each. Without a rayon pool
  // they collapse to one core; needs COOP/COEP for SharedArrayBuffer, which the
  // dev server sends. Failing softly beats failing to start.
  try {
    await initThreadPool(navigator.hardwareConcurrency);
  } catch (e) {
    console.warn("[metamorphosis] thread pool unavailable, running serial:", e);
  }

  const canvas = document.getElementById("gameCanvas");
  const params = new URLSearchParams(location.search);
  const msaa = parseInt(params.get("msaa") || "4", 10);

  const renderer = new WebGPURenderer(canvas, { msaa });
  await renderer.init();
  renderer.setClearColor(0.0, 0.0, 0.0, 1.0);
  // Same reasoning as murmuration: cubes crossing the near plane get clipped
  // open into interior slivers. Fading them out before they reach it keeps the
  // orbit usable at close distances.
  const CUBE_RADIUS = CUBE_SCALE * Math.sqrt(3) * 0.5;
  renderer.renderer3D.setNearFade(2.0, Math.max(0.4, (0.1 + CUBE_RADIUS) * 2));

  const cubeData = mesh_cube(1.0);
  const cubeMeshId = renderer.assets.createMesh(cubeData.vertices, cubeData.indices);

  const touchDefault = isMobile ? "40000" : "200000";
  let count = parseInt(params.get("count") || touchDefault, 10);
  if (!Number.isFinite(count) || count < 8) count = Number(touchDefault);
  let churnIdx = Math.min(
    CHURN_LEVELS.length - 1,
    Math.max(0, parseInt(params.get("churn") ?? "2", 10)),
  );
  const uiParam = (params.get("ui") || "").toLowerCase();
  const startChromeHidden = ["0", "off", "false", "hide", "hidden", "none"].includes(uiParam);

  let engine = null;
  let app = null;
  let camEntity = -1;
  let spawnMs = 0;

  const avgCpu = new RollingAverage();
  const avgGpu = new RollingAverage();
  const avgFrame = new RollingAverage();

  // Declared up here rather than beside the loop: buildScene resets them, and
  // it runs before the loop section is reached.
  let migAccum = 0;
  let migRate = 0;

  const el = (id) => document.getElementById(id);

  // -- archetype table ------------------------------------------------------
  // Built once; only the numbers and bar widths change per frame.
  const tableEl = el("arch-table");
  const rowEls = CORNERS.map((c) => {
    const row = document.createElement("div");
    row.className = "arow";
    row.innerHTML =
      `<span class="sw" style="background:${rgbCss(c.col)}"></span>` +
      `<span class="sig">${c.sig}</span>` +
      `<span class="bar"><i style="background:${rgbCss(c.col)}"></i></span>` +
      `<span class="num">—</span>`;
    tableEl.appendChild(row);
    return { bar: row.querySelector("i"), num: row.querySelector(".num") };
  });

  function buildScene() {
    el("loading").style.display = "flex";
    el("loading").innerText = `Creating ${count.toLocaleString()} cubes…`;

    // A timer rather than rAF: rAF never fires in a background tab, so a
    // rebuild triggered just before switching away would hang forever.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const t0 = performance.now();
          engine = create_lattice(
            count,
            cubeMeshId,
            CUBE_SCALE,
            CHURN_LEVELS[churnIdx].stride,
          );
          spawnMs = performance.now() - t0;

          app = new ArtisanApp(engine, wasm.memory).registerStandardSchemas();
          // This demo owns no keys beyond its own hotkeys, so let F/H and the
          // browser's own shortcuts through. Re-done per rebuild: a fresh
          // InputManager comes with every new engine.
          app.input.setBlockHotkeys(false);

          const cams = app.world.query(["Camera3D", "Transform"]);
          camEntity = cams.length && cams[0].len ? cams[0].entities[0] : -1;

          avgCpu.reset();
          avgGpu.reset();
          avgFrame.reset();
          migAccum = 0;
          migRate = 0;

          el("loading").style.display = "none";
          window.__metamorphosis = {
            engine, app, renderer,
            get count() { return count; },
            get churn() { return CHURN_LEVELS[churnIdx]; },
            counts: () => corner_counts(engine),
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
  // A slow orbit around the lattice centre, always facing it. The lattice is a
  // cube and its structure only reads from an angle where all three axes are
  // foreshortened differently, so the default pitch is deliberately off-axis
  // rather than level.
  let yaw = 0.7;
  let pitch = 0.38;
  let dist = 76;
  let autoOrbit = true;
  let dragging = false;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    autoOrbit = false;
    canvas.setPointerCapture(e.pointerId);
  });
  const endDrag = (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw -= e.movementX * 0.005;
    pitch = Math.max(-1.35, Math.min(1.35, pitch + e.movementY * 0.004));
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      dist = Math.max(6, Math.min(220, dist * (1 + Math.sign(e.deltaY) * 0.09)));
    },
    { passive: false },
  );

  function updateCamera(dt) {
    if (camEntity < 0) return;
    if (autoOrbit) yaw += dt * 0.13;

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const eye = [
      dist * cp * Math.sin(yaw),
      dist * sp,
      dist * cp * Math.cos(yaw),
    ];
    // Camera looks down -Z in its own space, so yaw about Y then pitch about X
    // aims it back at the origin without any basis construction.
    const q = quatMul(
      [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
      [Math.sin(-pitch / 2), 0, 0, Math.cos(-pitch / 2)],
    );

    const views = app.world.query(["Camera3D", "Transform"]);
    if (!views.length || !views[0].len) return;
    const tr = views[0].arrays["Transform"];
    tr[0] = eye[0]; tr[1] = eye[1]; tr[2] = eye[2];
    tr[3] = q[0]; tr[4] = q[1]; tr[5] = q[2]; tr[6] = q[3];
    // Written through a TypedArray straight into WASM memory, so Rust has not
    // seen the change yet — this is the bridge contract from architektur.html.
    app.world.wasm.wasm_mark_changed(camEntity, app.world.schemas["Transform"].id);

    views[0].arrays["Camera3D"][1] = canvas.width / Math.max(canvas.height, 1);
  }

  // -- ui -------------------------------------------------------------------
  function syncButtons() {
    for (const b of document.querySelectorAll("[data-count]")) {
      b.classList.toggle("active", parseInt(b.dataset.count, 10) === count);
    }
    for (const b of document.querySelectorAll("[data-churn]")) {
      b.classList.toggle("active", parseInt(b.dataset.churn, 10) === churnIdx);
    }
  }

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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  el("fullscreen").addEventListener("click", toggleFullscreen);
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") toggleFullscreen();
    if (e.key === "o" || e.key === "O") autoOrbit = !autoOrbit;
    if (e.key === "h" || e.key === "H") {
      // From fully hidden, H restores the chrome and opens the panel in one
      // press rather than making the user hit it twice with nothing visible
      // happening in between.
      if (chromeHidden) {
        chromeHidden = false;
        setPanel(true);
      } else {
        setPanel(panel.hidden);
      }
    }
  });

  // The panel is open by default here, unlike murmuration: the archetype table
  // is not decoration over the scene, it is half of what the demo is showing.
  setPanel(!startChromeHidden && !isMobile);

  if (isMobile) {
    document.body.classList.add("touch");
    hint.innerText = "drag to orbit - tap stats for details";
  }

  for (const b of document.querySelectorAll("[data-count]")) {
    b.addEventListener("click", async () => {
      count = parseInt(b.dataset.count, 10);
      await buildScene();
    });
  }
  // No rebuild: churn only changes how many rows move per tick, not what the
  // world contains, so it can be swung from Off to Max mid-flight — which is
  // the whole comparison. Same scene, same draw calls, only the structural
  // change load differs.
  for (const b of document.querySelectorAll("[data-churn]")) {
    b.addEventListener("click", () => {
      churnIdx = parseInt(b.dataset.churn, 10);
      set_churn(engine, CHURN_LEVELS[churnIdx].stride);
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
    // One bad frame must not kill the rAF chain — see the same guard in
    // murmuration. The finally block re-arms unconditionally.
    try {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frames++;

      if (renderer.deviceLost) {
        hint.style.display = "block";
        hint.innerText = `GPU device lost (${renderer.deviceLost.reason}) — reload to restart`;
        return;
      }

      updateCamera(dt);

      const t0 = performance.now();
      engine.tick(dt);
      const cpuMs = performance.now() - t0;

      renderer.render3D(app.world, dt);

      migAccum += take_migrations(engine);
      avgCpu.add(cpuMs);
      avgGpu.add(renderer.renderer3D.lastStats.gpuExecutionTimeMs);
      avgFrame.add(dt * 1000);

      if (now - fpsLast >= 500) {
        const secs = (now - fpsLast) / 1000;
        fps = frames / secs;
        migRate = migAccum / secs;
        frames = 0;
        migAccum = 0;
        fpsLast = now;
      }

      if (!panel.hidden) {
        el("v-count").innerText = count.toLocaleString();
        el("v-fps").innerText = fps.toFixed(0);
        el("v-mig").innerText = `${Math.round(migRate).toLocaleString()}/s`;
        el("v-frame").innerText = `${avgFrame.get().toFixed(1)} ms`;
        el("v-cpu").innerText = `${avgCpu.get().toFixed(2)} ms`;
        el("v-gpu").innerText = `${avgGpu.get().toFixed(2)} ms`;

        const counts = corner_counts(engine);
        let max = 1;
        for (const c of counts) if (c > max) max = c;
        for (let i = 0; i < 8; i++) {
          rowEls[i].bar.style.width = `${(100 * counts[i]) / max}%`;
          rowEls[i].num.innerText = counts[i].toLocaleString();
        }
      }
    } catch (err) {
      console.error("[metamorphosis] frame error (continuing):", err);
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
  loading.innerText = insecureWebGPU
    ? "WebGPU is blocked because this LAN page uses HTTP. Open it through HTTPS, or mark this development origin as secure in Chrome flags."
    : `Failed to start: ${e.message}`;
  console.error(e);
});
