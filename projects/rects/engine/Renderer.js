import { AssetManager } from "./Assets.js";
import { Renderer2D } from "./Renderer2D.js";
import { Renderer3D } from "./Renderer3D.js";
import { MeshSyncer } from "./MeshSyncer.js";

/// `requestDevice()` with no `requiredLimits` hands back the *default* limits,
/// not the adapter's. On a machine whose adapter advertises a 2 GiB storage
/// buffer that still means a 128 MiB cap — so any buffer past that fails to
/// create no matter what the hardware can do, and the only symptom is a device
/// error and a scene that never appears.
///
/// These four are pure ceilings: raising them to whatever the adapter reports
/// cannot change the behaviour of anything that fit under the defaults, so
/// there is no reason for the engine not to ask. A device that refuses the
/// request falls back to the defaults rather than failing to start.
async function requestDeviceWithMaxBuffers(adapter) {
  const wanted = [
    "maxBufferSize",
    "maxStorageBufferBindingSize",
    "maxUniformBufferBindingSize",
    "maxVertexBufferArrayStride",
  ];
  const requiredLimits = {};
  for (const key of wanted) {
    const v = adapter.limits[key];
    if (typeof v === "number") requiredLimits[key] = v;
  }
  // `timestamp-query` is what makes GPU time measurable at all. Without it the
  // only signal available is `onSubmittedWorkDone()` wall time, which absorbs
  // vsync backpressure and queue latency and therefore reads ~one refresh
  // interval for *any* scene that is presenting — useless for telling a cheap
  // frame from one that is barely making it. Optional: not every adapter or
  // browser exposes it, and nothing but instrumentation depends on it.
  const optionalFeatures = ["timestamp-query"].filter((f) =>
    adapter.features.has(f),
  );
  try {
    return await adapter.requestDevice({
      requiredLimits,
      requiredFeatures: optionalFeatures,
    });
  } catch (e) {
    console.warn("[artisan] adapter limits refused, using defaults:", e);
    return await adapter.requestDevice();
  }
}

export class WebGPURenderer {
  /// `options.msaa` selects the sample count (1, 2 or 4; 1 disables MSAA and
  /// the resolve entirely). It is fixed at construction rather than settable
  /// later because every pipeline bakes the sample count in at creation time,
  /// so changing it afterwards would mean rebuilding all of them.
  ///
  /// 4 remains the default. It is worth knowing that its cost is very
  /// architecture-dependent: a tile-based mobile GPU resolves in tile memory
  /// for almost nothing, while an immediate-mode desktop GPU pays bandwidth
  /// for the wider attachments -- and a scene made of sub-pixel triangles gets
  /// the least benefit from MSAA while paying the most for it.
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.device = null;
    this.context = null;
    this.assets = null;
    this.gpuFormat = null;
    this.renderPassDescriptor = null;

    this.msaaCount = [1, 2, 4].includes(options.msaa) ? options.msaa : 4;
    this.msaaColorTexture = null;
    this.msaaColorTextureView = null;
    this.depthTexture = null;
    this.depthTextureView = null;

    this.renderer2D = new Renderer2D(this);
    this.renderer3D = new Renderer3D(this);
    this.meshSyncer = null;
  }

  registerGPUSimShader(typeId, computeWgsl, renderWgsl) {
    this.renderer3D.registerGPUSimShader(typeId, computeWgsl, renderWgsl);
  }

  async init() {
    if (!navigator.gpu) throw new Error("WebGPU not supported");

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });

    this.device = await requestDeviceWithMaxBuffers(adapter);
    this.context = this.canvas.getContext("webgpu");
    this.gpuFormat = navigator.gpu.getPreferredCanvasFormat();

    const config = {
      device: this.device,
      format: this.gpuFormat,
      alphaMode: "premultiplied",
    };

    const supportedModes = adapter.features;
    if (supportedModes.has("immediate")) {
      config.presentMode = "immediate";
    } else if (supportedModes.has("mailbox")) {
      config.presentMode = "mailbox";
    }

    try {
      this.context.configure(config);
    } catch (_) {
      config.presentMode = "fifo";
      this.context.configure(config);
    }

    this.assets = new AssetManager(this.device);
    this.meshSyncer = new MeshSyncer(this.device, this.assets);

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined,
          resolveTarget: undefined,
          clearValue: { r: 0.08, g: 0.1, b: 0.12, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: undefined,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    // A lost device (driver reset, GPU OOM from an oversized surface, tab
    // eviction) makes every subsequent command throw forever. Without this
    // the only symptom is a canvas that silently stops updating, which is
    // indistinguishable from a hung render loop — so record it and say so.
    this.deviceLost = null;
    this.device.lost?.then((info) => {
      this.deviceLost = info;
      console.error(
        `[artisan] WebGPU device lost (${info.reason}): ${info.message}`,
      );
    });

    this.resize();
    // ResizeObserver is the primary notification, but it is not a guarantee:
    // its callbacks are delivered as part of the rendering steps, so a page
    // that is not being composited gets none, and a fullscreen transition can
    // deliver a degenerate (zero-sized) box as the *last* callback of the
    // transition. Either way the observer alone can leave the swapchain stuck
    // at a stale size with no further notification coming. syncCanvasSize()
    // in the render path is the backstop; see the note there.
    const observer = new ResizeObserver(() => {
      this.resize();
    });
    observer.observe(this.canvas);
    // Fullscreen enter/exit is the case where a missed notification is most
    // visible, and it does not always coincide with a usable observer box.
    document.addEventListener("fullscreenchange", () => this.resize());
    window.addEventListener("resize", () => this.resize());

    this.renderer2D.init();
    this.renderer3D.init();
  }

  /// Called once per frame from the render path. ResizeObserver is a
  /// notification, not a source of truth: it can be skipped entirely while the
  /// page is not composited, and a fullscreen transition can deliver a
  /// zero-sized box as its final callback — in both cases nothing further
  /// arrives, and the surface stays stuck at the old size forever. Comparing
  /// the canvas' laid-out size against its backing store every frame costs two
  /// property reads and makes a missed notification cost one frame instead of
  /// the rest of the session.
  syncCanvasSize() {
    if (this.deviceLost) return false;
    const w = this.targetSize();
    if (!w) return false;
    if (
      w[0] === this.canvas.width &&
      w[1] === this.canvas.height &&
      (this.msaaCount === 1 || this.msaaColorTextureView) &&
      this.depthTextureView
    ) {
      return true;
    }
    this.resize();
    return !!this.depthTextureView;
  }

  /// The size the surface should have, clamped to what the device can actually
  /// allocate, or null when the layout has not produced a usable size yet.
  targetSize() {
    const w = Math.floor(this.canvas.clientWidth || window.innerWidth || 0);
    const h = Math.floor(this.canvas.clientHeight || window.innerHeight || 0);

    // Entering/leaving fullscreen (and some other layout thrash) can report a
    // 0-something client size before the real target size lands. A WebGPU
    // texture cannot have a zero dimension — creating one is invalid — so skip
    // rather than tear down the swapchain over a value that isn't the real
    // size. syncCanvasSize() retries on the next frame; nothing here depends
    // on another notification arriving.
    if (w < 1 || h < 1) return null;

    // A fullscreen surface on a large or multi-monitor desktop can exceed what
    // the device will allocate. createTexture past maxTextureDimension2D is a
    // validation error, and at 4x MSAA the *pair* of attachments is hundreds of
    // megabytes, so an oversized request is also a plausible way to lose the
    // device outright — which is unrecoverable, unlike rendering slightly
    // letterboxed. Clamp instead of asking for something that may not come back.
    const max = this.device?.limits?.maxTextureDimension2D || 8192;
    return [Math.min(w, max), Math.min(h, max)];
  }

  resize() {
    if (this.deviceLost) return;
    const size = this.targetSize();
    if (!size) return;
    const [w, h] = size;

    // If texture (re)creation below throws, an uncaught exception inside a
    // ResizeObserver callback is exactly the kind of thing that can leave
    // the observer wedged (some implementations stop delivering further
    // notifications after one throws) — which is how a single bad resize
    // permanently breaks every resize after it, not just that one frame.
    // Falling back to whatever was already there keeps the observer alive
    // and the canvas rendering at its old size instead of going dark.
    try {
      this.canvas.width = w;
      this.canvas.height = h;

      // Release the old attachments *before* allocating the new ones. Holding
      // both alive doubles peak surface memory at exactly the moment it is
      // largest — a fullscreen transition — and at 4x MSAA the two attachments
      // for a 4K surface are already ~265 MB, so overlapping them is a real
      // way to push a modest GPU into an allocation failure while resizing to
      // a size it could otherwise have rendered at fine.
      this.msaaColorTexture?.destroy();
      this.depthTexture?.destroy();
      this.msaaColorTexture = null;
      this.msaaColorTextureView = null;
      this.depthTexture = null;
      this.depthTextureView = null;

      // At one sample the render path draws straight into the swapchain
      // texture and never reads this attachment, so allocating it would be a
      // full-surface texture nothing ever samples.
      if (this.msaaCount > 1) {
        this.msaaColorTexture = this.device.createTexture({
          size: [w, h],
          sampleCount: this.msaaCount,
          format: this.gpuFormat,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.msaaColorTextureView = this.msaaColorTexture.createView();
      }

      this.depthTexture = this.device.createTexture({
        size: [w, h],
        sampleCount: this.msaaCount,
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.depthTextureView = this.depthTexture.createView();
    } catch (err) {
      // Since the old attachments are already gone, a failure here leaves the
      // views null rather than pointing at destroyed resources — the render
      // path checks for that and skips the frame, and syncCanvasSize() retries
      // on the next one. That is a dropped frame, not a dead canvas.
      console.error("[artisan] resize failed, skipping this frame:", err);
      this.msaaColorTextureView = null;
      this.depthTextureView = null;
    }
  }

  syncCameras(world) {
    const aspect = this.canvas.width / this.canvas.height || 16 / 9;

    const cams3d = world.query(["Camera3D"]);
    for (let i = 0; i < cams3d.length; i++) {
      const view = cams3d[i];
      const arr = view.arrays["Camera3D"];
      for (let j = 0; j < view.len; j++) {
        arr[j * 40 + 1] = aspect;
      }
    }

    const cams2d = world.query(["Camera"]);
    for (let i = 0; i < cams2d.length; i++) {
      const view = cams2d[i];
      const arr = view.arrays["Camera"];
      for (let j = 0; j < view.len; j++) {
        arr[j * 2 + 0] = arr[j * 2 + 0];
      }
    }
  }

  setClearColor(r, g, b, a) {
    this.renderPassDescriptor.colorAttachments[0].clearValue = { r, g, b, a };
  }

  createQuadMesh() {
    return this.renderer2D.createQuadMesh();
  }

  createDataTexture(width, height, data) {
    return this.assets.createDataTexture(width, height, data);
  }

  screenToWorld(screenX, screenY, cameraEntityView) {
    return this.renderer2D.screenToWorld(screenX, screenY, cameraEntityView);
  }

  createShader(id, wgsl) {
    this.renderer3D.createShader(id, wgsl);
  }

  render(world) {
    if (!this.syncCanvasSize()) return;
    this.syncCameras(world);
    this.meshSyncer.sync(world);
    this.renderer2D.render(world);
  }

  /// `dt` is optional; pass the app's frame delta so GPU-driven simulations
  /// integrate on the same timestep as the CPU systems. See Renderer3D.render.
  render3D(world, dt) {
    if (!this.syncCanvasSize()) return;
    this.syncCameras(world);
    this.meshSyncer.sync(world);
    this.renderer3D.render(world, dt);
  }
}
