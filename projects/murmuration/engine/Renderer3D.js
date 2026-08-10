import { Shaders3D } from "./Shaders3D.js";

/// Every GPU-sim compute shader declares `@workgroup_size(64)`; the dispatch
/// size is derived from this, so the two have to agree.
const SIM_WORKGROUP_SIZE = 64;
/// WebGPU's `maxComputeWorkgroupsPerDimension`, guaranteed by the spec.
const MAX_DISPATCH_PER_DIM = 65535;

export class Renderer3D {
  constructor(renderer) {
    this.renderer = renderer;
    this.device = null;
    this.assets = null;
    this.maxInstances3D = 0;
    this.sceneBuffer3D = null;
    this.sceneBindGroupLayout3D = null;
    this.sceneBindGroup3D = null;
    this.transformBuffers3D = [];
    this.materialBuffers3D = [];
    this.frameIndex = 0;
    this.materialNeedsUpload = [true, true, true];
    this.lastStructuralGen = -1;
    this.lastMemoryBuffer = null;
    this.cachedMemView = null;
    this.lightBuffer3D = null;
    this.materialRegistry = new Map();
    this.skyPipeline = null;
    this.gridPipeline = null;
    this.gizmoPipeline = null;
    this.editorMode = false;
    this.selectedEntity = null;
    this.gpuSimStates = new Map();
    this.gpuSimShaders = new Map();
    this.lastFrameTime = null;
    // Simulation clock handed to GPU-driven sims and to shaders as "time".
    //
    // This deliberately is *not* performance.now(). CPU systems advance on the
    // engine's own Time resource, which starts at zero for a fresh engine and
    // accumulates the same per-tick delta the app clamps — so anything driven
    // by wall-clock-since-page-load runs on a different clock than every CPU
    // system in the same scene. For a GPU sim whose field is a function of
    // time, that difference is the whole behaviour: the identical field
    // evaluated at t=0 and at t=90 is two unrelated flows. It also means a
    // rebuilt scene silently resumes at a different phase than the CPU
    // equivalent, and that frame drops desync the two (a clamped CPU delta
    // falls behind wall clock, an unclamped GPU one does not).
    this.simTime = 0;
    // Near-camera fade band, in world units. Off by default — see
    // near_fade_scale() in Shaders3D.js and setNearFade() below.
    this.nearFadeFull = 0;
    this.nearFadeZero = 0;
    this.lastStats = {
      batches: 0,
      instances: 0,
      uploadTimeMs: 0,
      passTimeMs: 0,
      writeBufferTimeMs: 0,
      computeRecordTimeMs: 0,
      renderRecordTimeMs: 0,
      gpuExecutionTimeMs: 0,
    };
  }

  markMaterialsDirty() {
    this.materialNeedsUpload.fill(true);
  }

  /// Fade instances out as they approach the camera so nothing ever crosses
  /// the near plane and gets sliced open.
  ///
  /// `zero` must clear the near plane by at least the bounding radius of the
  /// largest instance, or a cube can still be caught mid-shrink with a corner
  /// past the plane. Pass (0, 0) to disable.
  setNearFade(full, zero) {
    this.nearFadeFull = full;
    this.nearFadeZero = zero;
  }

  /// Restart the GPU simulation clock. A scene rebuild creates a fresh engine
  /// whose Time starts at zero, so anything driven by this clock has to
  /// restart with it or the new scene resumes mid-flow at the old phase.
  resetSimTime() {
    this.simTime = 0;
    this.lastFrameTime = null;
  }

  registerGPUSimShader(typeId, computeWgsl, renderWgsl) {
    this.gpuSimShaders.set(typeId, { computeWgsl, renderWgsl });
  }

  init() {
    this.device = this.renderer.device;
    this.assets = this.renderer.assets;
    this.sceneBuffer3D = this.device.createBuffer({
      size: 352,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.lightBuffer3D = this.device.createBuffer({
      size: 1024 * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.sceneBindGroupLayout3D = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    this.sceneBindGroup3D = this.device.createBindGroup({
      layout: this.sceneBindGroupLayout3D,
      entries: [
        { binding: 0, resource: { buffer: this.sceneBuffer3D } },
        { binding: 1, resource: { buffer: this.lightBuffer3D } },
      ],
    });

    this.createShader(0, Shaders3D.SharedWGSL + Shaders3D.StandardFS, true);

    this.skyPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.device.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
              },
            ],
          }),
        ],
      }),
      vertex: {
        module: this.device.createShaderModule({ code: Shaders3D.SkyWGSL }),
        entryPoint: "vs_main",
      },
      fragment: {
        module: this.device.createShaderModule({ code: Shaders3D.SkyWGSL }),
        entryPoint: "fs_main",
        targets: [{ format: this.renderer.gpuFormat }],
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "always",
        format: "depth24plus",
      },
      multisample: { count: this.renderer.msaaCount },
      primitive: { topology: "triangle-list" },
    });

    this.gridPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.device.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
              },
            ],
          }),
        ],
      }),
      vertex: {
        module: this.device.createShaderModule({ code: Shaders3D.GridWGSL }),
        entryPoint: "vs_main",
      },
      fragment: {
        module: this.device.createShaderModule({ code: Shaders3D.GridWGSL }),
        entryPoint: "fs_main",
        targets: [
          {
            format: this.renderer.gpuFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "less",
        format: "depth24plus",
      },
      multisample: { count: this.renderer.msaaCount },
      primitive: { topology: "triangle-list" },
    });

    this.gizmoPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.device.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" },
              },
            ],
          }),
          this.device.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" },
              },
            ],
          }),
        ],
      }),
      vertex: {
        module: this.device.createShaderModule({ code: Shaders3D.GizmoWGSL }),
        entryPoint: "vs_main",
      },
      fragment: {
        module: this.device.createShaderModule({ code: Shaders3D.GizmoWGSL }),
        targets: [{ format: this.renderer.gpuFormat }],
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "always",
        format: "depth24plus",
      },
      multisample: { count: this.renderer.msaaCount },
      primitive: { topology: "line-list" },
    });

    this.gizmoBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.gizmoBindGroup = this.device.createBindGroup({
      layout: this.gizmoPipeline.getBindGroupLayout(1),
      entries: [{ binding: 0, resource: { buffer: this.gizmoBuffer } }],
    });
  }

  createShader(id, wgsl, useDepth = true) {
    const pipelineLayout3D = this.device.createPipelineLayout({
      bindGroupLayouts: [this.sceneBindGroupLayout3D],
    });
    const createPipelineWithBlend = (blendConfig, depthWrite) => {
      return this.device.createRenderPipeline({
        layout: pipelineLayout3D,
        vertex: {
          module: this.device.createShaderModule({ code: wgsl }),
          entryPoint: "vs_main",
          buffers: [
            {
              arrayStride: 48,
              stepMode: "vertex",
              attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x3" },
                { shaderLocation: 1, offset: 12, format: "float32x3" },
                { shaderLocation: 2, offset: 24, format: "float32x2" },
                { shaderLocation: 6, offset: 32, format: "float32x4" },
              ],
            },
            {
              arrayStride: 24,
              stepMode: "instance",
              attributes: [
                { shaderLocation: 3, offset: 0, format: "float32x3" },
                { shaderLocation: 4, offset: 12, format: "snorm16x4" },
                { shaderLocation: 5, offset: 20, format: "float32" },
              ],
            },
            {
              arrayStride: 48,
              stepMode: "instance",
              attributes: [
                { shaderLocation: 7, offset: 0, format: "float32x4" },
                { shaderLocation: 8, offset: 16, format: "float32x3" },
                { shaderLocation: 9, offset: 28, format: "float32" },
                { shaderLocation: 10, offset: 32, format: "float32" },
                { shaderLocation: 11, offset: 36, format: "float32x3" },
              ],
            },
          ],
        },
        fragment: {
          module: this.device.createShaderModule({ code: wgsl }),
          entryPoint: "fs_main",
          targets: [
            {
              format: this.renderer.gpuFormat,
              blend: blendConfig,
            },
          ],
        },
        depthStencil: {
          depthWriteEnabled: depthWrite,
          depthCompare: useDepth ? "less" : "always",
          format: "depth24plus",
        },
        multisample: { count: this.renderer.msaaCount },
        primitive: {
          topology: "triangle-list",
          cullMode: depthWrite ? "back" : "none",
        },
      });
    };
    const blendOpaque = {
      color: { srcFactor: "one", dstFactor: "zero", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "zero", operation: "add" },
    };
    const blendAlpha = {
      color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
      alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
        operation: "add",
      },
    };
    const blendAdditive = {
      color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
    };
    const pipelines = {
      opaque: createPipelineWithBlend(blendOpaque, useDepth),
      transparent: createPipelineWithBlend(blendAlpha, false),
      additive: createPipelineWithBlend(blendAdditive, false),
    };
    this.materialRegistry.set(id, pipelines);
  }

  ensureBufferSize3D(count) {
    if (count <= this.maxInstances3D) return;
    for (const buf of this.transformBuffers3D) {
      if (buf) buf.destroy();
    }
    for (const buf of this.materialBuffers3D) {
      if (buf) buf.destroy();
    }
    this.transformBuffers3D = [];
    this.materialBuffers3D = [];
    this.maxInstances3D = Math.max(count, 1000);
    for (let i = 0; i < 3; i++) {
      this.transformBuffers3D.push(
        this.device.createBuffer({
          size: this.maxInstances3D * 24,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }),
      );
      this.materialBuffers3D.push(
        this.device.createBuffer({
          size: this.maxInstances3D * 48,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }),
      );
    }
    this.materialNeedsUpload.fill(true);
  }

  initGPUSim(entId, maxInstances, shaderType) {
    const particleSize = 32;
    const bufferSize = maxInstances * particleSize;
    const particleBuffer = this.device.createBuffer({
      size: bufferSize,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.VERTEX |
        GPUBufferUsage.COPY_DST |
        // Lets tools and tests read simulation state back. A GPU sim is
        // otherwise a black box: when particles misbehave there is no way to
        // tell a simulation bug from a rendering one without this.
        GPUBufferUsage.COPY_SRC,
    });
    // Seed the buffer in chunks. The obvious version — one Float32Array over
    // every instance — needs a contiguous JS allocation of 32 bytes per
    // instance, which is 320 MB at 10M particles and is the thing that fails
    // first when a demo scales up, well before the GPU is under any pressure.
    // A fixed-size staging array uploads the identical bytes with a bounded
    // 32 MB peak.
    const CHUNK = 1 << 20;
    const staging = new Float32Array(Math.min(maxInstances, CHUNK) * 8);
    for (let base = 0; base < maxInstances; base += CHUNK) {
      const n = Math.min(CHUNK, maxInstances - base);
      for (let i = 0; i < n; i++) {
        const idx = i * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const dist = Math.random() * 15.0 + 5.0;
        staging[idx] = Math.sin(phi) * Math.cos(theta) * dist;
        staging[idx + 1] = Math.sin(phi) * Math.sin(theta) * dist;
        staging[idx + 2] = Math.cos(phi) * dist;
        staging[idx + 3] = (Math.random() - 0.5) * 5.0;
        staging[idx + 4] = (Math.random() - 0.5) * 5.0;
        staging[idx + 5] = (Math.random() - 0.5) * 5.0;
        staging[idx + 6] = 1.0;
        staging[idx + 7] = Math.random();
      }
      this.device.queue.writeBuffer(
        particleBuffer,
        base * particleSize,
        staging,
        0,
        n * 8,
      );
    }
    const paramBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const customShaders = this.gpuSimShaders.get(shaderType);
    const computeShaderWGSL = customShaders
      ? customShaders.computeWgsl
      : Shaders3D.GPUSimComputeWGSL;
    const renderShaderWGSL = customShaders
      ? customShaders.renderWgsl
      : Shaders3D.GPUSimRenderWGSL;

    const computeModule = this.device.createShaderModule({
      code: computeShaderWGSL,
    });
    const computeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        },
      ],
    });
    const computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      }),
      compute: {
        module: computeModule,
        entryPoint: "cs_main",
      },
    });
    const computeBindGroup = this.device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: paramBuffer } },
      ],
    });
    const renderModule = this.device.createShaderModule({
      code: renderShaderWGSL,
    });
    const renderPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.sceneBindGroupLayout3D],
      }),
      vertex: {
        module: renderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 48,
            stepMode: "vertex",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x3" },
              { shaderLocation: 2, offset: 24, format: "float32x2" },
              { shaderLocation: 6, offset: 32, format: "float32x4" },
            ],
          },
          {
            arrayStride: 32,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 3, offset: 0, format: "float32x3" },
              { shaderLocation: 4, offset: 12, format: "float32x3" },
              { shaderLocation: 5, offset: 24, format: "float32" },
              { shaderLocation: 7, offset: 28, format: "float32" },
            ],
          },
        ],
      },
      fragment: {
        module: renderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: this.renderer.gpuFormat,
          },
        ],
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
      multisample: { count: this.renderer.msaaCount },
      primitive: { topology: "triangle-list", cullMode: "back" },
    });
    const state = {
      particleBuffer,
      paramBuffer,
      computePipeline,
      computeBindGroup,
      renderPipeline,
      maxInstances,
    };
    this.gpuSimStates.set(entId, state);
    return state;
  }

  /// `appDt` is the app's own frame delta — the same value its CPU systems
  /// were ticked with this frame. Pass it whenever there is one.
  ///
  /// Measuring the delta here instead, from performance.now() between render
  /// calls, looks equivalent and is not: this timestamp is taken partway
  /// through the frame, *after* however long the CPU spent in simulation and
  /// scene traversal beforehand. That prologue varies from frame to frame and
  /// grows with scene size, so the measured delta jitters even while the app
  /// is holding a perfectly steady vsync-locked framerate. Feeding that jitter
  /// to a GPU sim that integrates `pos += vel * dt` turns it directly into
  /// visible per-frame position noise — the particles shake in place at a
  /// solid 60fps — and it also desyncs the GPU sim from CPU systems that were
  /// ticked with the real frame delta.
  render(world, appDt) {
    const now = performance.now();
    const measured = this.lastFrameTime
      ? (now - this.lastFrameTime) / 1000.0
      : 0.016;
    this.lastFrameTime = now;
    const dt = Number.isFinite(appDt) && appDt > 0 ? appDt : measured;
    // Same 0.05 ceiling the CPU tick applies to its own delta, so a stutter
    // costs both paths the identical amount of simulated time and they stay
    // in step instead of drifting apart every time a frame runs long.
    this.simTime += Math.min(dt, 0.05);

    const t0 = now;
    const camViews = world.query(["Camera3D", "GlobalTransform"]);
    const sceneData = new Float32Array(88);
    sceneData[0] = 1;
    sceneData[5] = 1;
    sceneData[10] = 1;
    sceneData[15] = 1;
    sceneData[16] = 1;
    sceneData[21] = 1;
    sceneData[26] = 1;
    sceneData[31] = 1;
    let exposure = 1.0;
    if (camViews.length > 0 && camViews[0].len > 0) {
      const cam = camViews[0].arrays["Camera3D"];
      sceneData.set(cam.subarray(4, 20), 0);
      sceneData.set(cam.subarray(20, 36), 16);
      sceneData.set(cam.subarray(36, 39), 32);
      exposure = cam[39];
    }
    let ambCol = [0.0, 0.0, 0.0],
      ambLux = 0.0;
    const ambViews = world.query(["AmbientLight"]);
    if (ambViews.length > 0 && ambViews[0].len > 0) {
      const a = ambViews[0].arrays["AmbientLight"];
      ambCol = [a[0], a[1], a[2]];
      ambLux = a[3];
    }
    let hemiSkyCol = [0.0, 0.0, 0.0],
      hemiSkyLux = 0.0;
    let hemiGroundCol = [0.0, 0.0, 0.0],
      hemiGroundLux = 0.0;
    const hemiViews = world.query(["HemisphereLight"]);
    if (hemiViews.length > 0 && hemiViews[0].len > 0) {
      const h = hemiViews[0].arrays["HemisphereLight"];
      hemiSkyCol = [h[0], h[1], h[2]];
      hemiSkyLux = h[3];
      hemiGroundCol = [h[4], h[5], h[6]];
      hemiGroundLux = h[7];
    }
    const lightData = world.wasm.wasm_get_light_data();
    const activeLightsCount = lightData.length / 8;
    sceneData[35] = activeLightsCount;
    sceneData[36] = hemiSkyCol[0];
    sceneData[37] = hemiSkyCol[1];
    sceneData[38] = hemiSkyCol[2];
    sceneData[39] = hemiSkyLux;
    sceneData[40] = hemiGroundCol[0];
    sceneData[41] = hemiGroundCol[1];
    sceneData[42] = hemiGroundCol[2];
    sceneData[43] = hemiGroundLux;
    sceneData[44] = ambCol[0];
    sceneData[45] = ambCol[1];
    sceneData[46] = ambCol[2];
    sceneData[47] = ambLux;
    sceneData[48] = exposure;
    sceneData[49] = this.simTime;
    sceneData[50] = this.nearFadeFull;
    sceneData[51] = this.nearFadeZero;
    sceneData.fill(0.0, 52, 88);
    const lightViews = world.query(["DirectionalLight"]);
    let dirLightCount = 0;
    for (let i = 0; i < lightViews.length && dirLightCount < 4; i++) {
      const view = lightViews[i];
      const arr = view.arrays["DirectionalLight"];
      for (let j = 0; j < view.len && dirLightCount < 4; j++) {
        const r = arr[j * 8 + 0];
        const g = arr[j * 8 + 1];
        const b = arr[j * 8 + 2];
        const intensity = arr[j * 8 + 3];
        const dx = arr[j * 8 + 4];
        const dy = arr[j * 8 + 5];
        const dz = arr[j * 8 + 6];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = len > 0 ? dx / len : 0.0;
        const ny = len > 0 ? dy / len : -1.0;
        const nz = len > 0 ? dz / len : 0.0;
        const offset = 52 + dirLightCount * 8;
        sceneData[offset + 0] = nx;
        sceneData[offset + 1] = ny;
        sceneData[offset + 2] = nz;
        sceneData[offset + 3] = intensity;
        sceneData[offset + 4] = r;
        sceneData[offset + 5] = g;
        sceneData[offset + 6] = b;
        sceneData[offset + 7] = 1.0;
        dirLightCount++;
      }
    }
    this.device.queue.writeBuffer(this.sceneBuffer3D, 0, sceneData);
    if (lightData.length > 0)
      this.device.queue.writeBuffer(this.lightBuffer3D, 0, lightData);
    const batches = world.wasm.wasm_get_render_batches_3d();
    const batchCount = batches.length / 5;
    let totalInstances = 0;
    for (let i = 0; i < batchCount; i++) totalInstances += batches[i * 5 + 4];
    this.ensureBufferSize3D(totalInstances);
    const currentGen = world.wasm.get_structural_gen();
    if (currentGen !== this.lastStructuralGen) {
      this.lastStructuralGen = currentGen;
      this.materialNeedsUpload.fill(true);
    }
    const activeTransformBuffer = this.transformBuffers3D[this.frameIndex];
    const activeMaterialBuffer = this.materialBuffers3D[this.frameIndex];
    if (totalInstances > 0) {
      const mem = world.memory.buffer;
      let offset = 0;
      for (let i = 0; i < batchCount; i++) {
        const gtPtr = batches[i * 5 + 0];
        const matPtr = batches[i * 5 + 1];
        const count = batches[i * 5 + 4];

        const transformSlice = new Uint8Array(mem, gtPtr, count * 24);
        this.device.queue.writeBuffer(
          activeTransformBuffer,
          offset * 24,
          transformSlice,
        );
        if (this.materialNeedsUpload[this.frameIndex]) {
          const materialSlice = new Uint8Array(mem, matPtr, count * 48);
          this.device.queue.writeBuffer(
            activeMaterialBuffer,
            offset * 48,
            materialSlice,
          );
        }
        offset += count;
      }
      this.materialNeedsUpload[this.frameIndex] = false;
    }
    const t1 = performance.now();
    const commandEncoder = this.device.createCommandEncoder();

    const gpuSims = world.query(["GPUDrivenSimulation"]);
    let computePassEncoder = null;
    let totalWriteTime = 0;
    let totalComputeTime = 0;

    if (gpuSims.length > 0) {
      for (let i = 0; i < gpuSims.length; i++) {
        const view = gpuSims[i];
        const arr = view.arrays["GPUDrivenSimulation"];
        for (let j = 0; j < view.len; j++) {
          const entId = view.entities[j * 2];
          const maxInstances = arr[j * 8 + 0];
          const meshId = arr[j * 8 + 1];
          const shaderType = arr[j * 8 + 2];
          const speed = arr[j * 8 + 3];
          const size = arr[j * 8 + 4];
          const gravity = arr[j * 8 + 5];
          const noiseScale = arr[j * 8 + 6];
          let state = this.gpuSimStates.get(entId);
          if (!state) {
            state = this.initGPUSim(entId, maxInstances, shaderType);
          }
          // A dispatch dimension tops out at 65,535 workgroups, so a purely 1D
          // dispatch cannot cover more than ~4.19M particles at a workgroup
          // size of 64 — past that the encoder rejects the whole command
          // buffer and the scene simply never appears. Spilling the overflow
          // into Y raises the ceiling to billions.
          //
          // `row_stride` (threads per Y row) is handed to the shader so it can
          // rebuild the flat index. When one row is enough — every scene under
          // 4.19M, i.e. every existing demo — Y is 1 and `id.y` is 0, so the
          // index is `id.x` exactly as before.
          const workgroups = Math.ceil(maxInstances / SIM_WORKGROUP_SIZE);
          const dispatchX = Math.min(workgroups, MAX_DISPATCH_PER_DIM);
          const dispatchY = Math.ceil(workgroups / dispatchX);
          const rowStride = dispatchX * SIM_WORKGROUP_SIZE;

          const tWrite = performance.now();
          const simParams = new Float32Array([
            speed,
            size,
            gravity,
            noiseScale,
            this.simTime,
            dt,
            rowStride,
            0,
          ]);
          this.device.queue.writeBuffer(state.paramBuffer, 0, simParams);
          totalWriteTime += performance.now() - tWrite;

          const tComp = performance.now();
          if (!computePassEncoder) {
            computePassEncoder = commandEncoder.beginComputePass();
          }
          computePassEncoder.setPipeline(state.computePipeline);
          computePassEncoder.setBindGroup(0, state.computeBindGroup);
          computePassEncoder.dispatchWorkgroups(dispatchX, dispatchY);
          totalComputeTime += performance.now() - tComp;
        }
      }
      if (computePassEncoder) {
        computePassEncoder.end();
      }
    }
    this.lastStats.writeBufferTimeMs = totalWriteTime;
    this.lastStats.computeRecordTimeMs = totalComputeTime;

    if (this.renderer.msaaCount > 1) {
      this.renderer.renderPassDescriptor.colorAttachments[0].view =
        this.renderer.msaaColorTextureView;
      this.renderer.renderPassDescriptor.colorAttachments[0].resolveTarget =
        this.renderer.context.getCurrentTexture().createView();
    } else {
      this.renderer.renderPassDescriptor.colorAttachments[0].view =
        this.renderer.context.getCurrentTexture().createView();
      this.renderer.renderPassDescriptor.colorAttachments[0].resolveTarget =
        undefined;
    }
    this.renderer.renderPassDescriptor.depthStencilAttachment.view =
      this.renderer.depthTextureView;
    const tRenderRec = performance.now();
    const pass = commandEncoder.beginRenderPass(
      this.renderer.renderPassDescriptor,
    );
    let bgBindGroup = null;
    if (this.skyPipeline) {
      bgBindGroup = this.device.createBindGroup({
        layout: this.skyPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.sceneBuffer3D } }],
      });
      pass.setPipeline(this.skyPipeline);
      pass.setBindGroup(0, bgBindGroup);
      pass.draw(3);
    }
    pass.setBindGroup(0, this.sceneBindGroup3D);
    if (totalInstances > 0) {
      let offset = 0;
      let lastPipeline = null;
      let lastVertexBuffer = null;
      let lastIndexBuffer = null;
      let lastTransformBuffer = null;
      let lastMaterialBuffer = null;
      const opaqueBatches = [];
      const transparentBatches = [];
      for (let i = 0; i < batchCount; i++) {
        const sId = batches[i * 5 + 2];
        const mId = batches[i * 5 + 3];
        const count = batches[i * 5 + 4];
        const matPtr = batches[i * 5 + 1];
        const matFloatArray = new Float32Array(
          world.memory.buffer,
          matPtr,
          count * 12,
        );
        const blendMode = matFloatArray[9];
        const batchInfo = { sId, mId, count, blendMode, offset };
        if (blendMode === 1.0 || blendMode === 2.0) {
          transparentBatches.push(batchInfo);
        } else {
          opaqueBatches.push(batchInfo);
        }
        offset += count;
      }
      for (const b of opaqueBatches) {
        const pipelines =
          this.materialRegistry.get(b.sId) || this.materialRegistry.get(0);
        const pipeline = pipelines ? pipelines.opaque || pipelines : null;
        const mesh = this.assets.getMesh(b.mId);
        if (mesh && pipeline) {
          if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
          }
          if (mesh.vertexBuffer !== lastVertexBuffer) {
            pass.setVertexBuffer(0, mesh.vertexBuffer);
            lastVertexBuffer = mesh.vertexBuffer;
          }
          if (mesh.indexBuffer !== lastIndexBuffer) {
            pass.setIndexBuffer(mesh.indexBuffer, "uint32");
            lastIndexBuffer = mesh.indexBuffer;
          }
          if (activeTransformBuffer !== lastTransformBuffer) {
            pass.setVertexBuffer(1, activeTransformBuffer);
            lastTransformBuffer = activeTransformBuffer;
          }
          if (activeMaterialBuffer !== lastMaterialBuffer) {
            pass.setVertexBuffer(2, activeMaterialBuffer);
            lastMaterialBuffer = activeMaterialBuffer;
          }
          pass.drawIndexed(mesh.indexCount, b.count, 0, 0, b.offset);
        }
      }
      for (const b of transparentBatches) {
        const pipelines =
          this.materialRegistry.get(b.sId) || this.materialRegistry.get(0);
        let pipeline = null;
        if (pipelines) {
          if (pipelines.opaque) {
            pipeline =
              b.blendMode === 1.0 ? pipelines.transparent : pipelines.additive;
          } else {
            pipeline = pipelines;
          }
        }
        const mesh = this.assets.getMesh(b.mId);
        if (mesh && pipeline) {
          if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
          }
          if (mesh.vertexBuffer !== lastVertexBuffer) {
            pass.setVertexBuffer(0, mesh.vertexBuffer);
            lastVertexBuffer = mesh.vertexBuffer;
          }
          if (mesh.indexBuffer !== lastIndexBuffer) {
            pass.setIndexBuffer(mesh.indexBuffer, "uint32");
            lastIndexBuffer = mesh.indexBuffer;
          }
          if (activeTransformBuffer !== lastTransformBuffer) {
            pass.setVertexBuffer(1, activeTransformBuffer);
            lastTransformBuffer = activeTransformBuffer;
          }
          if (activeMaterialBuffer !== lastMaterialBuffer) {
            pass.setVertexBuffer(2, activeMaterialBuffer);
            lastMaterialBuffer = activeMaterialBuffer;
          }
          pass.drawIndexed(mesh.indexCount, b.count, 0, 0, b.offset);
        }
      }
    }

    if (gpuSims.length > 0) {
      for (let i = 0; i < gpuSims.length; i++) {
        const view = gpuSims[i];
        const arr = view.arrays["GPUDrivenSimulation"];
        for (let j = 0; j < view.len; j++) {
          const entId = view.entities[j * 2];
          const meshId = arr[j * 8 + 1];
          const state = this.gpuSimStates.get(entId);
          const mesh = this.assets.getMesh(meshId);
          if (state && mesh) {
            pass.setPipeline(state.renderPipeline);
            pass.setBindGroup(0, this.sceneBindGroup3D);
            pass.setVertexBuffer(0, mesh.vertexBuffer);
            pass.setVertexBuffer(1, state.particleBuffer);
            if (mesh.indexBuffer) {
              pass.setIndexBuffer(mesh.indexBuffer, "uint32");
              pass.drawIndexed(mesh.indexCount, state.maxInstances, 0, 0, 0);
            } else {
              pass.draw(mesh.indexCount, state.maxInstances, 0, 0);
            }
          }
        }
      }
    }

    if (this.editorMode && bgBindGroup) {
      pass.setPipeline(this.gridPipeline);
      pass.setBindGroup(0, bgBindGroup);
      pass.draw(3);
      if (this.selectedEntity !== null) {
        const ptr = world.wasm.get_component_ptr(
          this.selectedEntity,
          "GlobalTransform",
        );
        if (ptr !== 0) {
          const gt = new Float32Array(world.memory.buffer, ptr, 16);
          this.device.queue.writeBuffer(
            this.gizmoBuffer,
            0,
            new Float32Array([gt[12], gt[13], gt[14], 1.0]),
          );
          pass.setPipeline(this.gizmoPipeline);
          pass.setBindGroup(0, bgBindGroup);
          pass.setBindGroup(1, this.gizmoBindGroup);
          pass.draw(6);
        }
      }
    }
    pass.end();
    this.lastStats.renderRecordTimeMs = performance.now() - tRenderRec;

    const tSubmit = performance.now();
    this.device.queue.submit([commandEncoder.finish()]);
    this.device.queue.onSubmittedWorkDone().then(() => {
      this.lastStats.gpuExecutionTimeMs = performance.now() - tSubmit;
    });

    const t2 = performance.now();
    this.lastStats.batches = batchCount;
    this.lastStats.instances = totalInstances;
    this.lastStats.uploadTimeMs = t1 - t0;
    this.lastStats.passTimeMs = t2 - t1;
    this.frameIndex = (this.frameIndex + 1) % 3;
  }
}
