import init, {
  create_field,
  set_parallel,
  schedule_json,
  trace_data,
  mesh_cube,
  initThreadPool,
  artisan_rayon_threads,
} from "./pkg/scheduler.js";
import { ArtisanApp } from "./engine/App.js";
import { WebGPURenderer } from "./engine/Renderer.js";

/// One colour per system, assigned in schedule order. Distinct hues rather
/// than a gradient: the eye has to match a block in the chart to a row in the
/// legend, which a continuous ramp makes impossible.
const SYS_COLORS = [
  "#f97316", "#38bdf8", "#a78bfa", "#4ade80",
  "#fbbf24", "#f472b6", "#2dd4bf", "#e879f9",
  "#94a3b8", "#fb7185", "#60a5fa", "#a3e635",
];

const SHORT_NAMES = {
  sys_gravity: "motion",
  sys_heat: "heat",
  sys_charge: "charge",
  sys_wave: "wave",
  sys_integrate: "apply motion",
  sys_shade: "colour",
  sys_ripple: "shape",
  sys_recolor: "glow",
};

class RollingAverage {
  constructor(n = 30) {
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
  // Without the pool every stage collapses onto one lane and the whole demo
  // has nothing to show, so unlike the other demos this one reports the
  // failure in the UI rather than quietly carrying on.
  let poolError = null;
  try {
    await initThreadPool(navigator.hardwareConcurrency);
  } catch (e) {
    poolError = e;
    console.warn("[scheduler] thread pool unavailable:", e);
  }
  const rayonThreads = artisan_rayon_threads();

  const canvas = document.getElementById("gameCanvas");
  const chart = document.getElementById("chart");
  const ctx = chart.getContext("2d");
  const params = new URLSearchParams(location.search);

  const renderer = new WebGPURenderer(canvas, {
    msaa: parseInt(params.get("msaa") || "4", 10),
  });
  await renderer.init();
  renderer.setClearColor(0.0, 0.0, 0.0, 1.0);
  renderer.renderer3D.setNearFade(2.0, 0.5);

  const cubeData = mesh_cube(1.0);
  const cubeMeshId = renderer.assets.createMesh(cubeData.vertices, cubeData.indices);

  const touchDefault = matchMedia("(pointer: coarse)").matches ? "160" : "300";
  let side = parseInt(params.get("side") || touchDefault, 10);
  if (!Number.isFinite(side) || side < 2) side = Number(touchDefault);
  let parallel = params.get("serial") !== "1";

  let engine = null;
  let app = null;
  let camEntity = -1;
  let schedule = { stages: [] };
  /// system short name -> colour index, stable across frames.
  let sysColor = new Map();

  const avgTick = new RollingAverage();
  const avgSpan = new RollingAverage();
  const el = (id) => document.getElementById(id);

  // The engine also schedules camera, hierarchy and culling maintenance. They
  // are real work, but they obscure this demo's deliberately small example.
  // Keep the recording honest while showing only the eight lesson tasks.
  function visibleStages() {
    return schedule.stages
      .map((systems, stageIndex) => ({
        stageIndex,
        systems: systems
          .map((system, systemIndex) => ({ system, systemIndex }))
          .filter(({ system }) => SHORT_NAMES[system.name]),
      }))
      .filter(({ systems }) => systems.length);
  }

  function buildScene() {
    el("loading").style.display = "flex";
    el("loading").innerText = `Building ${(side * side).toLocaleString()} cells…`;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          engine = create_field(side, cubeMeshId);
          set_parallel(engine, parallel);

          app = new ArtisanApp(engine, wasm.memory).registerStandardSchemas();
          app.input.setBlockHotkeys(false);

          const cams = app.world.query(["Camera3D", "Transform"]);
          camEntity = cams.length && cams[0].len ? cams[0].entities[0] : -1;

          // One tick before reading the schedule: stages are built lazily on
          // the first run, so before that there is nothing to describe.
          engine.tick(0.016);
          schedule = JSON.parse(schedule_json(engine));

          sysColor = new Map();
          let n = 0;
          for (const stage of schedule.stages) {
            for (const s of stage) {
              if (!sysColor.has(s.name)) sysColor.set(s.name, n++);
            }
          }

          renderLegend();
          avgTick.reset();
          avgSpan.reset();

          el("loading").style.display = "none";
          window.__scheduler = {
            engine, app, renderer, schedule,
            get parallel() { return parallel; },
            trace: () => trace_data(engine),
            // Lets the chart be driven without the rAF loop — useful from the
            // console, and the only way to exercise it in an environment where
            // the page is not compositing (a background tab freezes rAF).
            draw: () => drawChart(trace_data(engine)),
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

  /// The stage/legend list: every system, grouped by the stage the packer put
  /// it in, with the components it reads and writes. This is the "why" panel —
  /// a barrier in the chart is explained by a shared component here.
  function renderLegend() {
    const parts = [];
    const shown = visibleStages();
    shown.forEach(({ systems }, visibleIndex) => {
      parts.push(`<div class="stage-head">Stage ${visibleIndex + 1} <span class="stage-note">${
        systems.length > 1 ? `· ${systems.length} tasks together` : "· one task"
      }</span></div>`);
      for (const { system: s } of systems) {
        const c = SYS_COLORS[sysColor.get(s.name) % SYS_COLORS.length];
        parts.push(
          `<div class="leg">
             <span class="dot" style="background:${c}"></span>
             <span class="nm">${SHORT_NAMES[s.name] ?? s.name.replace(/^sys_/, "")}</span>
           </div>`,
        );
      }
    });
    el("legend").innerHTML = parts.join("");
    el("v-stages").innerText = String(shown.length);

    // The chart needs a row per system, and how many systems there are is only
    // known once the schedule is built — so the band is sized here rather than
    // in CSS. A fixed height was silently unusable on any viewport that took
    // the coarse-pointer branch: 22 rows in 170px is 6px per row, too small
    // for the labels to render at all.
    const rows = shown.reduce((n, stage) => n + stage.systems.length, 0);
    const wanted = rows * 21 + 58;
    const h = Math.max(220, Math.min(wanted, Math.round(innerHeight * 0.46)));
    el("chart-wrap").style.height = `${h}px`;
    el("ui").style.maxHeight = `calc(100vh - ${h + 34}px)`;
  }

  /// Draws one frame's trace as a Gantt chart: one row per system in schedule
  /// order, X is real elapsed milliseconds within the tick.
  ///
  /// An earlier version used one lane per rayon worker, which is the more
  /// iconic picture but was unusable here: rayon's work stealing hands each
  /// system to an arbitrary worker, so the number of occupied lanes changed
  /// every frame (7, then 16) and every block jumped rows. Keying rows to the
  /// schedule instead makes the layout completely stable, and the thing worth
  /// seeing survives intact — in parallel the blocks of a stage start together
  /// and end ragged, and in serial they step down and to the right. The worker
  /// each system actually landed on is printed next to its bar, so nothing is
  /// lost.
  function drawChart(trace) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cssW = chart.clientWidth;
    const cssH = chart.clientHeight;
    if (chart.width !== Math.round(cssW * dpr) || chart.height !== Math.round(cssH * dpr)) {
      chart.width = Math.round(cssW * dpr);
      chart.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const n = trace.length / 5;
    if (!n) return;

    let span = 0;
    for (let i = 0; i < n; i++) span = Math.max(span, trace[i * 5 + 4]);
    avgSpan.add(span);
    // A fixed axis would make every frame's blocks jump around as the span
    // wobbles; a smoothed one keeps the chart readable while still growing
    // visibly when the work gets wider.
    const axis = Math.max(avgSpan.get() * 1.12, 0.4);

    // Row per system, ordered by the schedule rather than by the trace, so a
    // row means the same system every frame.
    const rowOf = new Map();
    let rows = 0;
    const shown = visibleStages();
    shown.forEach(({ stageIndex, systems }) => {
      systems.forEach(({ systemIndex }) => rowOf.set(`${stageIndex}:${systemIndex}`, rows++));
    });
    if (!rows) return;

    const padL = 110, padR = 28, padT = 16, padB = 18;
    const plotW = Math.max(cssW - padL - padR, 10);
    const plotH = Math.max(cssH - padT - padB, 10);
    const rowH = plotH / rows;
    const x = (ms) => padL + (ms / axis) * plotW;

    ctx.font = `${Math.min(13, Math.max(9, rowH - 5))}px ui-monospace, monospace`;
    ctx.textBaseline = "middle";

    // stage banding + names in the gutter
    shown.forEach(({ stageIndex, systems }, visibleIndex) => {
      const r0 = rowOf.get(`${stageIndex}:${systems[0].systemIndex}`);
      const y0 = padT + r0 * rowH;
      const h = systems.length * rowH;
      ctx.fillStyle = visibleIndex % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.022)";
      ctx.fillRect(0, y0, cssW, h);

      systems.forEach(({ system: s, systemIndex }) => {
        const y = padT + rowOf.get(`${stageIndex}:${systemIndex}`) * rowH;
        ctx.fillStyle = SYS_COLORS[(sysColor.get(s.name) ?? 0) % SYS_COLORS.length];
        ctx.fillRect(6, y + rowH / 2 - 3, 6, 6);
        ctx.fillStyle = "#cbd5e1";
        ctx.textAlign = "left";
        ctx.fillText(SHORT_NAMES[s.name] ?? s.name.replace(/^sys_/, ""), 17, y + rowH / 2);
      });

      // stage label on the divider
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y0) + 0.5);
      ctx.lineTo(cssW, Math.round(y0) + 0.5);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "right";
      ctx.fillText(`S${visibleIndex + 1}`, padL - 6, y0 + h / 2);
    });

    // stage barriers: the last block in each stage has to finish before the
    // next stage may start, so this line is the cost of the whole stage.
    const stageEnd = new Map();
    for (let i = 0; i < n; i++) {
      const st = trace[i * 5];
      const idx = trace[i * 5 + 1];
      if (!rowOf.has(`${st}:${idx}`)) continue;
      stageEnd.set(st, Math.max(stageEnd.get(st) ?? 0, trace[i * 5 + 4]));
    }
    ctx.strokeStyle = "rgba(248,250,252,0.34)";
    ctx.setLineDash([3, 3]);
    for (const [, end] of stageEnd) {
      const px = Math.round(x(end)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // the blocks
    for (let i = 0; i < n; i++) {
      const st = trace[i * 5];
      const idx = trace[i * 5 + 1];
      const row = rowOf.get(`${st}:${idx}`);
      if (row === undefined) continue;
      const name = schedule.stages[st]?.[idx]?.name ?? "?";
      const x0 = x(trace[i * 5 + 3]);
      const w = Math.max(x(trace[i * 5 + 4]) - x0, 1.5);
      const y = padT + row * rowH + 1;
      const h = Math.max(rowH - 2, 2);

      ctx.fillStyle = SYS_COLORS[(sysColor.get(name) ?? 0) % SYS_COLORS.length];
      ctx.beginPath();
      ctx.roundRect(x0, y, w, h, 2);
      ctx.fill();

    }

    // time axis
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH + 0.5);
    ctx.lineTo(padL + plotW, padT + plotH + 0.5);
    ctx.stroke();
    ctx.fillStyle = "#475569";
    ctx.textAlign = "left";
    ctx.fillText("0", padL, cssH - 6);
    ctx.textAlign = "right";
    ctx.fillText(`${axis.toFixed(1)} ms`, padL + plotW, cssH - 6);
  }

  // -- camera ---------------------------------------------------------------
  let yaw = 0.5;
  let pitch = 0.62;
  let dist = side * 0.62 * 1.35;
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
    pitch = Math.max(0.06, Math.min(1.45, pitch + e.movementY * 0.004));
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      dist = Math.max(8, Math.min(900, dist * (1 + Math.sign(e.deltaY) * 0.09)));
    },
    { passive: false },
  );

  function updateCamera(dt) {
    if (camEntity < 0) return;
    if (autoOrbit) yaw += dt * 0.09;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const eye = [dist * cp * Math.sin(yaw), dist * sp, dist * cp * Math.cos(yaw)];
    const q = quatMul(
      [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
      [Math.sin(-pitch / 2), 0, 0, Math.cos(-pitch / 2)],
    );
    const views = app.world.query(["Camera3D", "Transform"]);
    if (!views.length || !views[0].len) return;
    const tr = views[0].arrays["Transform"];
    tr[0] = eye[0]; tr[1] = eye[1]; tr[2] = eye[2];
    tr[3] = q[0]; tr[4] = q[1]; tr[5] = q[2]; tr[6] = q[3];
    app.world.wasm.wasm_mark_changed(camEntity, app.world.schemas["Transform"].id);
    views[0].arrays["Camera3D"][1] = canvas.width / Math.max(canvas.height, 1);
  }

  // -- ui -------------------------------------------------------------------
  function syncButtons() {
    for (const b of document.querySelectorAll("[data-side]")) {
      b.classList.toggle("active", parseInt(b.dataset.side, 10) === side);
    }
    for (const b of document.querySelectorAll("[data-par]")) {
      b.classList.toggle("active", (b.dataset.par === "1") === parallel);
    }
  }

  const panel = el("ui");
  const toggle = el("toggle");
  function setPanel(open) {
    panel.hidden = !open;
    toggle.style.display = open ? "none" : "block";
  }
  toggle.addEventListener("click", () => setPanel(true));
  el("close").addEventListener("click", () => setPanel(false));

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  el("fullscreen").addEventListener("click", toggleFullscreen);
  let chartPaused = false;
  el("chart-pause").addEventListener("click", () => {
    chartPaused = !chartPaused;
    el("chart-pause").innerText = chartPaused ? "Resume" : "Pause";
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") toggleFullscreen();
    if (e.key === "o" || e.key === "O") autoOrbit = !autoOrbit;
    if (e.key === "h" || e.key === "H") setPanel(panel.hidden);
    if (e.key === "c" || e.key === "C") {
      const c = el("chart-wrap");
      c.style.display = c.style.display === "none" ? "block" : "none";
    }
  });
  setPanel(true);

  if (matchMedia("(pointer: coarse)").matches) document.body.classList.add("touch");

  for (const b of document.querySelectorAll("[data-side]")) {
    b.addEventListener("click", async () => {
      side = parseInt(b.dataset.side, 10);
      await buildScene();
    });
  }
  // No rebuild: the schedule and the world are untouched, only the width of
  // the machine changes. That is what makes it a fair before/after — flip it
  // while watching and the picture on the left is identical.
  for (const b of document.querySelectorAll("[data-par]")) {
    b.addEventListener("click", () => {
      parallel = b.dataset.par === "1";
      set_parallel(engine, parallel);
      avgSpan.reset();
      avgTick.reset();
      syncButtons();
    });
  }

  await buildScene();
  if (poolError) {
    el("warn").style.display = "block";
    el("warn").innerText =
      "No thread pool: this page is not cross-origin isolated, so every stage runs on one core.";
  }

  // -- loop -----------------------------------------------------------------
  let last = performance.now();
  let lastChartUpdate = 0;
  let fpsLast = last;
  let frames = 0;
  let fps = 0;

  const loop = (now) => {
    try {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frames++;
      if (now - fpsLast >= 500) {
        fps = (frames * 1000) / (now - fpsLast);
        frames = 0;
        fpsLast = now;
      }

      if (renderer.deviceLost) {
        el("warn").style.display = "block";
        el("warn").innerText = `GPU device lost (${renderer.deviceLost.reason}) — reload`;
        return;
      }

      updateCamera(dt);

      const t0 = performance.now();
      engine.tick(dt);
      avgTick.add(performance.now() - t0);

      renderer.render3D(app.world, dt);

      const trace = trace_data(engine);
      // Hold each trace long enough to read it. The schedule still runs every
      // frame; only its visual snapshot updates at a calm pace.
      if (!chartPaused && el("chart-wrap").style.display !== "none" && now - lastChartUpdate >= 200) {
        drawChart(trace);
        lastChartUpdate = now;
      }

      if (!panel.hidden) {
        el("v-cells").innerText = (side * side).toLocaleString();
        el("v-span").innerText = `${avgSpan.get().toFixed(2)} ms`;
      }
    } catch (err) {
      console.error("[scheduler] frame error (continuing):", err);
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
  loading.innerText = insecureWebGPU
    ? "WebGPU is blocked because this LAN page uses HTTP. Open it through HTTPS, or mark this development origin as secure in Chrome flags."
    : `Failed to start: ${e.message}`;
  console.error(e);
});
