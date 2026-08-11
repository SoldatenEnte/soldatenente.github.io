import { AssetManager } from "./Assets.js";

export class Renderer2D {
  constructor(renderer) {
    this.renderer = renderer;
    this.device = null;
    this.assets = null;
    this.pipeline = null;
    this.maxInstances = 0;
    this.transformBuffers = [];
    this.materialBuffers = [];
    
    this.shapePipeline = null;
    this.maxShapeInstances = 0;
    this.shapeInstanceBuffer = null;
    this.shapeData = null;

    this.frameIndex = 0;
    this.materialNeedsUpload = [true, true, true];
    this.lastStructuralGen = -1;
    this.lastMemoryBuffer = null;
    this.cachedMemView = null;
    this.cameraBuffer = null;
    this.cameraBindGroup = null;
    this.textureBindGroupLayout = null;
    this.textureBindGroups = new Map();
    this.quadMeshId = 0;
    
    this.lineData = new Float32Array(10000 * 12);
    this.lineCount = 0;
    this.lineBuffer = null;
    this.linePipeline = null;

    this.immShapeData = new Float32Array(4096 * 28);
    this.immShapeCount = 0;

    this.polyData = new Float32Array(65536 * 6); // x,y,r,g,b,a triangle-list vertices
    this.polyVertexCount = 0;
    this.polyBuffer = null;
    this.polyPipeline = null;

    this.textPipeline = null;
    this.sdfTexture = null;
    this.sdfBindGroup = null;
    this.sdfSampler = null;
    this.textInstanceBuffer = null;
    this.maxTextChars = 0;
    this.charWidths = new Float32Array(96);
  }

  init() {
    this.device = this.renderer.device;
    this.assets = this.renderer.assets;

    this.cameraBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shader2D = `
      struct Camera { pos: vec2f, zoom: f32, pad: f32, resolution: vec2f };
      @group(0) @binding(0) var<uniform> camera: Camera;
      @group(1) @binding(0) var t_diffuse: texture_2d<f32>;
      @group(1) @binding(1) var s_diffuse: sampler;

      struct VertexOutput { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) uv: vec2f };
      
      @vertex fn vs_main(@location(0) v_pos: vec3f, @location(1) v_uv: vec2f, @location(2) t_vec4: vec4f, @location(3) t_scale: vec2f, @location(4) color: vec4f, @location(5) tex_id: f32, @location(6) uv_rect: vec4f) -> VertexOutput {
        let s = sin(t_vec4.w); let c = cos(t_vec4.w);
        let rx = v_pos.x * t_scale.x * c - v_pos.y * t_scale.y * s;
        let ry = v_pos.x * t_scale.x * s + v_pos.y * t_scale.y * c;
        let world_x = rx + t_vec4.x;
        let world_y = ry + t_vec4.y;
        let view_x = (world_x - camera.pos.x) * camera.zoom / (camera.resolution.x * 0.5);
        let view_y = (world_y - camera.pos.y) * camera.zoom / (camera.resolution.y * 0.5);
        var out: VertexOutput;
        out.position = vec4f(view_x, view_y, 0.5 - t_vec4.z * 0.0001, 1.0);
        out.color = color;
        out.uv = vec2f(v_uv.x * uv_rect.z + uv_rect.x, v_uv.y * uv_rect.w + uv_rect.y);
        return out;
      }
      
      @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f { 
        let texColor = textureSample(t_diffuse, s_diffuse, in.uv);
        if (texColor.a < 0.01) { discard; }
        return vec4f(in.color.rgb * texColor.rgb * in.color.a * texColor.a, in.color.a * texColor.a); 
      }
    `;

    const cameraBindGroupLayout = this.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }] });
    this.textureBindGroupLayout = this.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} }, { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} }] });
    this.cameraBindGroup = this.device.createBindGroup({ layout: cameraBindGroupLayout, entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }] });

    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout, this.textureBindGroupLayout] });
    const vertexBufferLayout = { arrayStride: 20, stepMode: "vertex", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }, { shaderLocation: 1, offset: 12, format: "float32x2" }] };
    const instanceTransformLayout = { arrayStride: 24, stepMode: "instance", attributes: [{ shaderLocation: 2, offset: 0, format: "float32x4" }, { shaderLocation: 3, offset: 16, format: "float32x2" }] };
    const instanceMaterialLayout = { arrayStride: 36, stepMode: "instance", attributes: [{ shaderLocation: 4, offset: 0, format: "float32x4" }, { shaderLocation: 5, offset: 16, format: "float32" }, { shaderLocation: 6, offset: 20, format: "float32x4" }] };
    
    const blendState = { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } };

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: this.device.createShaderModule({ code: shader2D }), entryPoint: "vs_main", buffers: [vertexBufferLayout, instanceTransformLayout, instanceMaterialLayout] },
      fragment: { module: this.device.createShaderModule({ code: shader2D }), entryPoint: "fs_main", targets: [ { format: this.renderer.gpuFormat, blend: blendState } ] },
      depthStencil: { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" }, multisample: { count: this.renderer.msaaCount }, primitive: { topology: "triangle-list", cullMode: "none" },
    });

    const shapeShader2D = `
      struct Camera { pos: vec2f, zoom: f32, pad: f32, resolution: vec2f };
      @group(0) @binding(0) var<uniform> camera: Camera;
      struct VertexOutput { @builtin(position) position: vec4f, @location(0) local_pos: vec2f, @location(1) color: vec4f, @location(2) extents: vec2f, @location(3) shape_params: vec4f, @location(4) border_color: vec4f, @location(5) grad_color: vec4f, @location(6) grad_pts: vec4f };
      @vertex fn vs_main(@location(0) v_pos: vec3f, @location(1) v_uv: vec2f, @location(2) t_vec4: vec4f, @location(3) t_scale: vec2f, @location(4) shape_type: f32, @location(5) color: vec4f, @location(6) extents: vec2f, @location(7) border_radius: f32, @location(8) border_color: vec4f, @location(9) border_thickness: f32, @location(10) grad_type: f32, @location(11) grad_color: vec4f, @location(12) grad_pts: vec4f) -> VertexOutput {
        // Shape types: 0=circle, 1=rounded rect, 2=capsule (along local X, half-len=ext.x, radius=ext.y),
        // 3=triangle (apex at +ext.x, base at -ext.x spanning ±ext.y), 4=arc (radius=ext.x, start angle=border_radius, sweep=ext.y radians)
        // Gradient: grad_type 0=none, 1=linear, 2=radial; from color at grad_pts.xy to grad_color at grad_pts.zw (local units).
        var quad_extents = extents;
        if (shape_type > 1.5 && shape_type < 2.5) { quad_extents = vec2f(extents.x + extents.y, extents.y); }
        if (shape_type > 3.5) { quad_extents = vec2f(extents.x, extents.x); }
        let actual_extents = quad_extents + vec2f(border_thickness);
        let s = sin(t_vec4.w); let c = cos(t_vec4.w);
        let local = v_pos.xy * actual_extents * 2.0;
        let rx = local.x * c - local.y * s;
        let ry = local.x * s + local.y * c;
        let world_x = rx * t_scale.x + t_vec4.x;
        let world_y = ry * t_scale.y + t_vec4.y;
        let view_x = (world_x - camera.pos.x) * camera.zoom / (camera.resolution.x * 0.5);
        let view_y = (world_y - camera.pos.y) * camera.zoom / (camera.resolution.y * 0.5);
        var out: VertexOutput;
        out.position = vec4f(view_x, view_y, 0.5, 1.0);
        out.local_pos = local; out.color = color; out.extents = extents; out.shape_params = vec4f(shape_type, border_radius, border_thickness, grad_type); out.border_color = border_color;
        out.grad_color = grad_color; out.grad_pts = grad_pts;
        return out;
      }
      @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f {
        let p = in.local_pos; let ext = in.extents; var dist = 0.0;
        let st = in.shape_params.x;
        if (st < 0.5) { dist = length(p) - ext.x; }
        else if (st < 1.5) { let b_rad = min(in.shape_params.y, min(ext.x, ext.y)); let d = abs(p) - ext + vec2f(b_rad); dist = length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - b_rad; }
        else if (st < 2.5) {
          // Capsule along local X: segment half-length ext.x, radius ext.y
          let qx = max(abs(p.x) - ext.x, 0.0);
          dist = length(vec2f(qx, p.y)) - ext.y;
        }
        else if (st < 3.5) {
          // Triangle: apex (ext.x, 0), base corners (-ext.x, ±ext.y)
          let a = vec2f(ext.x, 0.0); let b = vec2f(-ext.x, ext.y); let cc = vec2f(-ext.x, -ext.y);
          let e0 = b - a; let e1 = cc - b; let e2 = a - cc;
          let v0 = p - a; let v1 = p - b; let v2 = p - cc;
          let pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
          let pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
          let pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
          let sgn = sign(e0.x * e2.y - e0.y * e2.x);
          let d0 = vec2f(dot(pq0, pq0), sgn * (v0.x * e0.y - v0.y * e0.x));
          let d1 = vec2f(dot(pq1, pq1), sgn * (v1.x * e1.y - v1.y * e1.x));
          let d2 = vec2f(dot(pq2, pq2), sgn * (v2.x * e2.y - v2.y * e2.x));
          let dm = min(min(d0, d1), d2);
          dist = -sqrt(dm.x) * sign(dm.y);
        }
        else {
          // Arc: centerline radius ext.x, start angle border_radius (shape_params.y), sweep ext.y radians; stroke width from border_thickness
          let start_a = in.shape_params.y; let sweep = ext.y;
          var rel = atan2(p.y, p.x) - start_a;
          rel = rel - floor(rel / 6.28318530718) * 6.28318530718;
          if (rel <= sweep) { dist = abs(length(p) - ext.x); }
          else {
            let ea = start_a + sweep;
            let p1 = vec2f(cos(start_a), sin(start_a)) * ext.x;
            let p2 = vec2f(cos(ea), sin(ea)) * ext.x;
            dist = min(length(p - p1), length(p - p2));
          }
        }
        let thick = in.shape_params.z; let fw = max(fwidth(dist), 0.001);
        let alpha = 1.0 - smoothstep(-fw, fw, dist - thick);
        if (alpha < 0.01) { discard; }
        var fill_alpha = 1.0; if (thick > 0.0) { fill_alpha = 1.0 - smoothstep(-fw, fw, dist); }
        if (st > 3.5) { fill_alpha = 1.0; }
        var base = in.color;
        let gt = in.shape_params.w;
        if (gt > 0.5) {
          let g0 = in.grad_pts.xy; let g1 = in.grad_pts.zw;
          let gd = g1 - g0;
          var tt = 0.0;
          if (gt < 1.5) { tt = clamp(dot(p - g0, gd) / max(dot(gd, gd), 0.000001), 0.0, 1.0); }
          else { tt = clamp(length(p - g0) / max(length(gd), 0.0001), 0.0, 1.0); }
          base = mix(base, in.grad_color, tt);
        }
        let color_mix = mix(in.border_color, base, fill_alpha);
        return vec4f(color_mix.rgb * color_mix.a * alpha, color_mix.a * alpha);
      }
    `;

    // 2D shapes render painter-style: instances are z-sorted on the CPU each frame and
    // drawn back-to-front with no depth writes, so translucency and antialiased edges
    // composite correctly (a depth buffer cannot order blended 2D layers).
    this.shapePipeline = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout] }),
        vertex: {
            module: this.device.createShaderModule({ code: shapeShader2D }), entryPoint: "vs_main",
            buffers: [vertexBufferLayout, { arrayStride: 112, stepMode: "instance", attributes: [{ shaderLocation: 2, offset: 0, format: "float32x4" }, { shaderLocation: 3, offset: 16, format: "float32x2" }, { shaderLocation: 4, offset: 24, format: "float32" }, { shaderLocation: 5, offset: 28, format: "float32x4" }, { shaderLocation: 6, offset: 44, format: "float32x2" }, { shaderLocation: 7, offset: 52, format: "float32" }, { shaderLocation: 8, offset: 56, format: "float32x4" }, { shaderLocation: 9, offset: 72, format: "float32" }, { shaderLocation: 10, offset: 76, format: "float32" }, { shaderLocation: 11, offset: 80, format: "float32x4" }, { shaderLocation: 12, offset: 96, format: "float32x4" }]}]
        },
        fragment: { module: this.device.createShaderModule({ code: shapeShader2D }), entryPoint: "fs_main", targets: [{ format: this.renderer.gpuFormat, blend: blendState }] },
        primitive: { topology: "triangle-list", cullMode: "none" }, multisample: { count: this.renderer.msaaCount }, depthStencil: { depthWriteEnabled: false, depthCompare: "always", format: "depth24plus" }
    });

    this.lineBuffer = this.device.createBuffer({ size: this.lineData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

    const lineShader = `
      struct Camera { pos: vec2f, zoom: f32, pad: f32, resolution: vec2f };
      @group(0) @binding(0) var<uniform> camera: Camera;
      struct LineOut { @builtin(position) pos: vec4f, @location(0) color: vec4f };
      @vertex fn vs_main(@location(0) pos: vec2f, @location(1) color: vec4f) -> LineOut {
        let view_x = (pos.x - camera.pos.x) * camera.zoom / (camera.resolution.x * 0.5); let view_y = (pos.y - camera.pos.y) * camera.zoom / (camera.resolution.y * 0.5);
        var out: LineOut; out.pos = vec4f(view_x, view_y, 0.0, 1.0); out.color = color; return out;
      }
      @fragment fn fs_main(in: LineOut) -> @location(0) vec4f { return vec4f(in.color.rgb * in.color.a, in.color.a); }
    `;

    this.linePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout] }),
      vertex: { module: this.device.createShaderModule({ code: lineShader }), entryPoint: "vs_main", buffers: [{ arrayStride: 24, stepMode: "vertex", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }, { shaderLocation: 1, offset: 8, format: "float32x4" }]}] },
      fragment: { module: this.device.createShaderModule({ code: lineShader }), entryPoint: "fs_main", targets: [{ format: this.renderer.gpuFormat, blend: blendState }] },
      primitive: { topology: "line-list" }, multisample: { count: this.renderer.msaaCount }, depthStencil: { depthWriteEnabled: false, depthCompare: "always", format: "depth24plus" },
    });

    // Triangle-list variant of the line pipeline for tessellated polylines
    this.polyPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout] }),
      vertex: { module: this.device.createShaderModule({ code: lineShader }), entryPoint: "vs_main", buffers: [{ arrayStride: 24, stepMode: "vertex", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }, { shaderLocation: 1, offset: 8, format: "float32x4" }]}] },
      fragment: { module: this.device.createShaderModule({ code: lineShader }), entryPoint: "fs_main", targets: [{ format: this.renderer.gpuFormat, blend: blendState }] },
      primitive: { topology: "triangle-list" }, multisample: { count: this.renderer.msaaCount }, depthStencil: { depthWriteEnabled: false, depthCompare: "always", format: "depth24plus" },
    });
    this.polyBuffer = this.device.createBuffer({ size: this.polyData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

    const textShader2D = `
      struct Camera { pos: vec2f, zoom: f32, pad: f32, resolution: vec2f };
      @group(0) @binding(0) var<uniform> camera: Camera;
      @group(1) @binding(0) var t_sdf: texture_2d<f32>;
      @group(1) @binding(1) var s_sdf: sampler;

      struct VertexOutput { @builtin(position) position: vec4f, @location(0) local_pos: vec2f, @location(1) color: vec4f, @location(2) uv: vec2f, @location(3) style_params: vec4f };

      @vertex fn vs_main(@location(0) v_pos: vec3f, @location(1) v_uv: vec2f, @location(2) t_vec4: vec4f, @location(3) t_scale: vec2f, @location(4) color: vec4f, @location(5) uv_rect: vec4f, @location(6) style: vec4f) -> VertexOutput {
        let s = sin(t_vec4.w); let c = cos(t_vec4.w);
        let slant = style.y * 0.25; 
        
        let sheared_x = v_pos.x + v_pos.y * slant;
        let scaled_x = sheared_x * t_scale.x; 
        let scaled_y = v_pos.y * t_scale.y;
        
        let rx = scaled_x * c - scaled_y * s; 
        let ry = scaled_x * s + scaled_y * c;
        let world_x = rx + t_vec4.x; let world_y = ry + t_vec4.y;
        let view_x = (world_x - camera.pos.x) * camera.zoom / (camera.resolution.x * 0.5); 
        let view_y = (world_y - camera.pos.y) * camera.zoom / (camera.resolution.y * 0.5);
        
        var out: VertexOutput; 
        out.position = vec4f(view_x, view_y, 0.5 - t_vec4.z * 0.0001, 1.0); 
        out.local_pos = v_pos.xy;
        out.color = color;
        out.uv = vec2f(v_uv.x * uv_rect.z + uv_rect.x, v_uv.y * uv_rect.w + uv_rect.y);
        out.style_params = style;
        return out;
      }

      @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4f {
        let sample_val = textureSample(t_sdf, s_sdf, in.uv).r;
        let width = max(fwidth(sample_val), 0.005);
        
        let threshold = 0.5 - (in.style_params.x * 0.15);
        let alpha = smoothstep(threshold - width, threshold + width, sample_val);
        
        let is_underline = step(-0.45, in.local_pos.y) * step(in.local_pos.y, -0.35);
        let final_alpha = max(alpha, in.style_params.z * is_underline);
        
        if (final_alpha < 0.01) { discard; }
        return vec4f(in.color.rgb * in.color.a * final_alpha, in.color.a * final_alpha);
      }
    `;

    this.textPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [cameraBindGroupLayout, this.textureBindGroupLayout] }),
      vertex: { module: this.device.createShaderModule({ code: textShader2D }), entryPoint: "vs_main", buffers: [vertexBufferLayout, { arrayStride: 72, stepMode: "instance", attributes: [{ shaderLocation: 2, offset: 0, format: "float32x4" }, { shaderLocation: 3, offset: 16, format: "float32x2" }, { shaderLocation: 4, offset: 24, format: "float32x4" }, { shaderLocation: 5, offset: 40, format: "float32x4" }, { shaderLocation: 6, offset: 56, format: "float32x4" }]}] },
      fragment: { module: this.device.createShaderModule({ code: textShader2D }), entryPoint: "fs_main", targets: [{ format: this.renderer.gpuFormat, blend: blendState }] },
      depthStencil: { depthWriteEnabled: false, depthCompare: "always", format: "depth24plus" }, multisample: { count: this.renderer.msaaCount }, primitive: { topology: "triangle-list", cullMode: "none" },
    });

    this.sdfSampler = this.device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    const atlasTexture = this.generateSDFAtlas();
    this.sdfBindGroup = this.device.createBindGroup({ layout: this.textureBindGroupLayout, entries: [{ binding: 0, resource: atlasTexture.createView() }, { binding: 1, resource: this.sdfSampler }] });
    if (this.quadMeshId === 0) this.createQuadMesh();

    console.log("[Renderer2D] Initialization complete. Proportional EDT SDF Pipeline Ready.");
  }

  generateSDFAtlas() {
    const atlasSize = 1024;
    const SS = 4; // supersampling factor — this is the key fix
    const hiSize = atlasSize * SS;

    const canvas = document.createElement("canvas");
    canvas.width = hiSize; canvas.height = hiSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    ctx.fillStyle = "black"; ctx.fillRect(0, 0, hiSize, hiSize);
    ctx.fillStyle = "white";
    ctx.font = `bold ${76 * SS}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'`;
    ctx.textBaseline = "middle"; ctx.textAlign = "center";

    const cols = 10; const rows = 10;
    const cellW = hiSize / cols; const cellH = hiSize / rows;

    for (let i = 0; i < 96; i++) {
      const char = String.fromCharCode(32 + i);
      const col = i % cols; const row = Math.floor(i / cols);
      const metrics = ctx.measureText(char);
      this.charWidths[i] = metrics.width / (76 * SS);
      if (char === ' ') this.charWidths[i] = 0.3;

      // True visual center, not advance-width center
      const boundsW = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const boundsH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const cx = Math.round(col * cellW + cellW / 2);
      const cy = Math.round(row * cellH + cellH / 2);
      ctx.fillText(char, cx, cy); 
    }

    const imgData = ctx.getImageData(0, 0, hiSize, hiSize);
    const data = imgData.data;
    const size = hiSize * hiSize;

    const grid1 = new Float32Array(size);
    const grid2 = new Float32Array(size);
    const INF = 1e20;

    for (let i = 0; i < size; i++) {
        const alpha = data[i * 4];
        if (alpha > 127) { grid1[i] = 0.0; grid2[i] = INF; }
        else { grid1[i] = INF; grid2[i] = 0.0; }
    }

    const f = new Float32Array(hiSize);
    const z = new Float32Array(hiSize + 1);
    const v = new Int32Array(hiSize);

    const edt1d = (f, v, z, n) => {
        let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < n; q++) {
            let s;
            do {
                const r = v[k];
                s = (f[q] + q * q - f[r] - r * r) / (2 * q - 2 * r);
                if (s <= z[k]) k--; else break;
            } while (k >= 0);
            k++; v[k] = q; z[k] = s; z[k + 1] = INF;
        }
        k = 0;
        for (let q = 0; q < n; q++) {
            while (z[k + 1] < q) k++;
            const r = v[k];
            f[q] = f[r] + (q - r) * (q - r);
        }
    };

    const edt = (grid) => {
        for (let x = 0; x < hiSize; x++) {
            for (let y = 0; y < hiSize; y++) f[y] = grid[y * hiSize + x];
            edt1d(f, v, z, hiSize);
            for (let y = 0; y < hiSize; y++) grid[y * hiSize + x] = f[y];
        }
        for (let y = 0; y < hiSize; y++) {
            for (let x = 0; x < hiSize; x++) f[x] = grid[y * hiSize + x];
            edt1d(f, v, z, hiSize);
            for (let x = 0; x < hiSize; x++) grid[y * hiSize + x] = Math.sqrt(f[x]);
        }
    };

    edt(grid1);
    edt(grid2);

    // Signed distance at high-res, in hi-res pixel units
    const hiSdf = new Float32Array(size);
    for (let i = 0; i < size; i++) hiSdf[i] = grid2[i] - grid1[i];

    // Downsample by averaging SS x SS blocks, converting back to atlas-pixel units
    const sdf = new Uint8Array(atlasSize * atlasSize);
    const radius = 10.0;
    for (let ay = 0; ay < atlasSize; ay++) {
        for (let ax = 0; ax < atlasSize; ax++) {
            let sum = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const hx = ax * SS + sx;
                    const hy = ay * SS + sy;
                    sum += hiSdf[hy * hiSize + hx];
                }
            }
            const avgDistHiRes = sum / (SS * SS);
            const avgDistAtlasPx = avgDistHiRes / SS; // back to atlas-pixel units
            const val = Math.round(128 + Math.max(-128, Math.min(127, (avgDistAtlasPx / radius) * 128)));
            sdf[ay * atlasSize + ax] = val;
        }
    }

    const texture = this.device.createTexture({ size: [atlasSize, atlasSize, 1], format: "r8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.device.queue.writeTexture({ texture }, sdf, { bytesPerRow: atlasSize, rowsPerImage: atlasSize }, [atlasSize, atlasSize, 1]);
    return texture;
  }

  ensureBufferSize(count) {
    if (count <= this.maxInstances) return;
    for (const buf of this.transformBuffers) { if (buf) buf.destroy(); }
    for (const buf of this.materialBuffers) { if (buf) buf.destroy(); }
    this.transformBuffers = []; this.materialBuffers = [];
    this.maxInstances = Math.max(count, 1000);
    for (let i = 0; i < 3; i++) {
      this.transformBuffers.push(this.device.createBuffer({ size: this.maxInstances * 24, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }));
      this.materialBuffers.push(this.device.createBuffer({ size: this.maxInstances * 36, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }));
    }
    this.materialNeedsUpload.fill(true);
  }

  createQuadMesh() {
    const vertices = new Float32Array([-0.5, -0.5, 0.0, 0.0, 1.0, 0.5, -0.5, 0.0, 1.0, 1.0, -0.5, 0.5, 0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 1.0, 0.0]);
    const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
    this.quadMeshId = this.assets.createMesh(vertices, indices);
    return this.quadMeshId;
  }

  getTextureBindGroup(texId) {
    if (this.textureBindGroups.has(texId)) return this.textureBindGroups.get(texId);
    const texture = this.assets.getTexture(texId);
    const group = this.device.createBindGroup({ layout: this.textureBindGroupLayout, entries: [{ binding: 0, resource: texture.createView() }, { binding: 1, resource: this.assets.getSampler(0) }] });
    this.textureBindGroups.set(texId, group);
    return group;
  }

  screenToWorld(screenX, screenY, cameraEntityView) {
    if (!cameraEntityView || cameraEntityView.len === 0) return [0, 0];
    const camPos = cameraEntityView.arrays["Transform2D"]; const camData = cameraEntityView.arrays["Camera"];
    const zoom = camData[0];
    const ndcX = (screenX / this.renderer.canvas.width) * 2.0 - 1.0;
    const ndcY = -((screenY / this.renderer.canvas.height) * 2.0 - 1.0);
    return [(ndcX * (this.renderer.canvas.width * 0.5)) / zoom + camPos[0], (ndcY * (this.renderer.canvas.height * 0.5)) / zoom + camPos[1]];
  }

  drawLine(x1, y1, x2, y2, color, width = 0) {
    if (width > 1) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      this.drawShape({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, rotation: Math.atan2(dy, dx), shape_type: 2, color, extents_x: len / 2, extents_y: width / 2 });
      return;
    }
    if (this.lineCount >= 10000) return;
    const offset = this.lineCount * 12;
    this.lineData[offset] = x1; this.lineData[offset+1] = y1; this.lineData[offset+2] = color[0]; this.lineData[offset+3] = color[1]; this.lineData[offset+4] = color[2]; this.lineData[offset+5] = color[3];
    this.lineData[offset+6] = x2; this.lineData[offset+7] = y2; this.lineData[offset+8] = color[0]; this.lineData[offset+9] = color[1]; this.lineData[offset+10] = color[2]; this.lineData[offset+11] = color[3];
    this.lineCount++;
  }

  // Immediate-mode polyline with round caps and round joins, tessellated into a
  // NON-OVERLAPPING triangle mesh so translucent strokes render with uniform alpha
  // (overlapping capsule segments would double-blend at every joint).
  // points: [{x,y}, ...]; width in world units; color [r,g,b,a].
  drawPolyline(points, width, color) {
    const n = points.length;
    if (n === 0) return;
    const w = width / 2;
    const d = this.polyData;
    const pushV = (x, y) => {
      if (this.polyVertexCount >= 65536) return;
      const o = this.polyVertexCount * 6;
      d[o] = x; d[o+1] = y; d[o+2] = color[0]; d[o+3] = color[1]; d[o+4] = color[2]; d[o+5] = color[3];
      this.polyVertexCount++;
    };
    const tri = (ax, ay, bx, by, cx, cy) => { pushV(ax, ay); pushV(bx, by); pushV(cx, cy); };
    const fan = (cx, cy, x0, y0, a0, a1, r) => {
      // fan around center (cx,cy) from angle a0 to a1, first spoke endpoint (x0,y0)
      let sweep = a1 - a0;
      while (sweep > Math.PI * 2) sweep -= Math.PI * 2;
      while (sweep < -Math.PI * 2) sweep += Math.PI * 2;
      const steps = Math.max(1, Math.ceil(Math.abs(sweep) / 0.35));
      let px = x0, py = y0;
      for (let s = 1; s <= steps; s++) {
        const a = a0 + sweep * (s / steps);
        const nx = cx + Math.cos(a) * r, ny = cy + Math.sin(a) * r;
        tri(cx, cy, px, py, nx, ny);
        px = nx; py = ny;
      }
    };

    if (n === 1) {
      const p = points[0];
      fan(p.x, p.y, p.x + w, p.y, 0, Math.PI * 2, w);
      return;
    }

    const dirs = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = points[i+1].x - points[i].x, dy = points[i+1].y - points[i].y;
      const len = Math.hypot(dx, dy) || 1;
      dirs.push({ x: dx / len, y: dy / len });
    }

    // Per-point left/right edge vertices (left = +90° from direction).
    const lefts = new Array(n), rights = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      if (i === 0) {
        const dd = dirs[0];
        lefts[i] = { x: p.x - dd.y * w, y: p.y + dd.x * w };
        rights[i] = { x: p.x + dd.y * w, y: p.y - dd.x * w };
      } else if (i === n - 1) {
        const dd = dirs[n-2];
        lefts[i] = { x: p.x - dd.y * w, y: p.y + dd.x * w };
        rights[i] = { x: p.x + dd.y * w, y: p.y - dd.x * w };
      } else {
        const dA = dirs[i-1], dB = dirs[i];
        const cross = dA.x * dB.y - dA.y * dB.x;
        const nAx = -dA.y, nAy = dA.x, nBx = -dB.y, nBy = dB.x;
        if (Math.abs(cross) < 1e-6) {
          lefts[i] = { x: p.x + nAx * w, y: p.y + nAy * w };
          rights[i] = { x: p.x - nAx * w, y: p.y - nAy * w };
        } else {
          let mx = nAx + nBx, my = nAy + nBy;
          const mlen = Math.hypot(mx, my) || 1;
          mx /= mlen; my /= mlen;
          const cosHalf = Math.max(mx * nAx + my * nAy, 0.15); // miter clamp
          const miter = w / cosHalf;
          if (cross > 0) {
            // left turn: inner side is left → shared miter point; outer right side gets a round join
            lefts[i] = { x: p.x + mx * miter, y: p.y + my * miter };
            rights[i] = null;
          } else {
            rights[i] = { x: p.x - mx * miter, y: p.y - my * miter };
            lefts[i] = null;
          }
        }
      }
    }

    // Segment quads. A null side at a joint means "round join there": the quad ends at
    // that segment's own perpendicular edge and the wedge is filled by a fan from the miter.
    for (let i = 0; i < n - 1; i++) {
      const dd = dirs[i];
      const nx = -dd.y * w, ny = dd.x * w;
      const p0 = points[i], p1 = points[i+1];
      const sL = lefts[i]  || { x: p0.x + nx, y: p0.y + ny };
      const sR = rights[i] || { x: p0.x - nx, y: p0.y - ny };
      const eL = lefts[i+1]  || { x: p1.x + nx, y: p1.y + ny };
      const eR = rights[i+1] || { x: p1.x - nx, y: p1.y - ny };
      tri(sL.x, sL.y, sR.x, sR.y, eR.x, eR.y);
      tri(sL.x, sL.y, eR.x, eR.y, eL.x, eL.y);
    }

    // Round joins at interior points
    for (let i = 1; i < n - 1; i++) {
      const p = points[i];
      const dA = dirs[i-1], dB = dirs[i];
      const cross = dA.x * dB.y - dA.y * dB.x;
      if (Math.abs(cross) < 1e-6) continue;
      if (cross > 0) {
        // outer arc on the right side, from segment A's right edge to segment B's right edge
        const m = lefts[i];
        const a0 = Math.atan2(-dA.x, dA.y); // angle of right normal of A
        const a1 = Math.atan2(-dB.x, dB.y);
        let sweep = a1 - a0;
        while (sweep > Math.PI) sweep -= Math.PI * 2;
        while (sweep < -Math.PI) sweep += Math.PI * 2;
        const steps = Math.max(1, Math.ceil(Math.abs(sweep) / 0.35));
        let px = p.x + Math.cos(a0) * w, py = p.y + Math.sin(a0) * w;
        for (let s = 1; s <= steps; s++) {
          const a = a0 + sweep * (s / steps);
          const qx = p.x + Math.cos(a) * w, qy = p.y + Math.sin(a) * w;
          tri(m.x, m.y, px, py, qx, qy);
          px = qx; py = qy;
        }
      } else {
        const m = rights[i];
        const a0 = Math.atan2(dA.x, -dA.y); // angle of left normal of A
        const a1 = Math.atan2(dB.x, -dB.y);
        let sweep = a1 - a0;
        while (sweep > Math.PI) sweep -= Math.PI * 2;
        while (sweep < -Math.PI) sweep += Math.PI * 2;
        const steps = Math.max(1, Math.ceil(Math.abs(sweep) / 0.35));
        let px = p.x + Math.cos(a0) * w, py = p.y + Math.sin(a0) * w;
        for (let s = 1; s <= steps; s++) {
          const a = a0 + sweep * (s / steps);
          const qx = p.x + Math.cos(a) * w, qy = p.y + Math.sin(a) * w;
          tri(m.x, m.y, px, py, qx, qy);
          px = qx; py = qy;
        }
      }
    }

    // Round end caps (half discs on the outward side)
    {
      const d0 = dirs[0];
      const aL = Math.atan2(d0.x, -d0.y); // left normal angle
      fan(points[0].x, points[0].y, points[0].x + Math.cos(aL) * w, points[0].y + Math.sin(aL) * w, aL, aL + Math.PI, w);
      const d1 = dirs[n-2];
      const aR = Math.atan2(-d1.x, d1.y); // right normal angle
      fan(points[n-1].x, points[n-1].y, points[n-1].x + Math.cos(aR) * w, points[n-1].y + Math.sin(aR) * w, aR, aR + Math.PI, w);
    }
  }

  // Immediate-mode convex polygon (triangle fan). Rendered in the same overlay pass as
  // drawPolyline, in call order.
  drawPolygon(points, color) {
    const n = points.length;
    if (n < 3) return;
    const d = this.polyData;
    const pushV = (x, y) => {
      if (this.polyVertexCount >= 65536) return;
      const o = this.polyVertexCount * 6;
      d[o] = x; d[o+1] = y; d[o+2] = color[0]; d[o+3] = color[1]; d[o+4] = color[2]; d[o+5] = color[3];
      this.polyVertexCount++;
    };
    for (let i = 1; i < n - 1; i++) {
      pushV(points[0].x, points[0].y);
      pushV(points[i].x, points[i].y);
      pushV(points[i+1].x, points[i+1].y);
    }
  }

  // Immediate-mode shape: rendered this frame only, z-sorted together with retained shapes.
  // opts: x, y, z, rotation, scale_x, scale_y, shape_type (0 circle, 1 rect, 2 capsule, 3 triangle, 4 arc),
  //       color [r,g,b,a], extents_x, extents_y, border_radius, border_color [r,g,b,a], border_thickness,
  //       grad_type (0 none, 1 linear, 2 radial), grad_color [r,g,b,a], grad_p0 [x,y], grad_p1 [x,y]
  drawShape(opts) {
    if (this.immShapeCount >= 4096) return;
    const o = this.immShapeCount * 28;
    const d = this.immShapeData;
    const col = opts.color || [1, 1, 1, 1];
    const bcol = opts.border_color || [0, 0, 0, 0];
    const gcol = opts.grad_color || [0, 0, 0, 0];
    const gp0 = opts.grad_p0 || [0, 0];
    const gp1 = opts.grad_p1 || [0, 0];
    d[o] = opts.x || 0; d[o+1] = opts.y || 0; d[o+2] = opts.z !== undefined ? opts.z : 10.0; d[o+3] = opts.rotation || 0;
    d[o+4] = opts.scale_x !== undefined ? opts.scale_x : 1; d[o+5] = opts.scale_y !== undefined ? opts.scale_y : 1;
    d[o+6] = opts.shape_type || 0;
    d[o+7] = col[0]; d[o+8] = col[1]; d[o+9] = col[2]; d[o+10] = col[3];
    d[o+11] = opts.extents_x !== undefined ? opts.extents_x : 10; d[o+12] = opts.extents_y !== undefined ? opts.extents_y : 10;
    d[o+13] = opts.border_radius || 0;
    d[o+14] = bcol[0]; d[o+15] = bcol[1]; d[o+16] = bcol[2]; d[o+17] = bcol[3];
    d[o+18] = opts.border_thickness || 0;
    d[o+19] = opts.grad_type || 0;
    d[o+20] = gcol[0]; d[o+21] = gcol[1]; d[o+22] = gcol[2]; d[o+23] = gcol[3];
    d[o+24] = gp0[0]; d[o+25] = gp0[1]; d[o+26] = gp1[0]; d[o+27] = gp1[1];
    this.immShapeCount++;
  }

  render(world) {
    const t0 = performance.now();
    const camViews = world.query(["Camera", "GlobalTransform2D"]);
    const cameraData = new Float32Array(8);
    cameraData[2] = 1.0; 
    cameraData[4] = this.renderer.canvas.width;  
    cameraData[5] = this.renderer.canvas.height; 
    
    if (camViews.length > 0 && camViews[0].len > 0) {
      const cams = camViews[0].arrays["Camera"]; const gts = camViews[0].arrays["GlobalTransform2D"];
      let activeCamIdx = 0;
      for (let i = 0; i < camViews[0].len; i++) { if (cams[i * 2 + 1] > 0.5) { activeCamIdx = i; break; } }
      cameraData[0] = gts[activeCamIdx * 6]; cameraData[1] = gts[activeCamIdx * 6 + 1]; cameraData[2] = cams[activeCamIdx * 2];
    }
    this.device.queue.writeBuffer(this.cameraBuffer, 0, cameraData);

    const batches = world.wasm.wasm_get_render_batches_2d();
    const batchCount = batches.length / 5;
    let totalInstances = 0; for (let i = 0; i < batchCount; i++) { totalInstances += batches[i * 5 + 4]; }

    const tmViews = world.query(["TileMap", "GlobalTransform2D"]);
    let tileInstances = 0;
    for (let i = 0; i < tmViews.length; i++) {
      const view = tmViews[i];
      for (let j = 0; j < view.len; j++) {
        const tiles = world.getTileMapData(view.entities[j * 2]);
        for (let k = 0; k < tiles.length; k++) { if (tiles[k] > 0) tileInstances++; }
      }
    }

    const overallInstances = totalInstances + tileInstances;
    this.ensureBufferSize(overallInstances);
    const currentGen = world.wasm.get_structural_gen();
    if (currentGen !== this.lastStructuralGen) { this.lastStructuralGen = currentGen; this.materialNeedsUpload.fill(true); }

    const activeTransformBuffer = this.transformBuffers[this.frameIndex];
    const activeMaterialBuffer = this.materialBuffers[this.frameIndex];

    if (overallInstances > 0) {
      const memView = new Uint8Array(world.memory.buffer);
      let currentInstanceOffset = 0;
      if (tileInstances > 0) {
        let tileTransformData = new Float32Array(tileInstances * 6); let tileMaterialData = new Float32Array(tileInstances * 9); let tileOffset = 0;
        for (let i = 0; i < tmViews.length; i++) {
          const view = tmViews[i]; const tmData = view.arrays["TileMap"]; const gtData = view.arrays["GlobalTransform2D"];
          for (let j = 0; j < view.len; j++) {
            const entId = view.entities[j * 2]; const width = tmData[j * 7 + 0]; const tileSize = tmData[j * 7 + 5]; const texId = tmData[j * 7 + 6];
            const gtX = gtData[j * 6 + 0]; const gtY = gtData[j * 6 + 1]; const gtZ = gtData[j * 6 + 2];
            const tiles = world.getTileMapData(entId);
            for (let k = 0; k < tiles.length; k++) {
              if (tiles[k] > 0) {
                const col = k % width; const row = Math.floor(k / width);
                tileTransformData[tileOffset * 6 + 0] = gtX + col * tileSize; tileTransformData[tileOffset * 6 + 1] = gtY + row * tileSize; tileTransformData[tileOffset * 6 + 2] = gtZ; tileTransformData[tileOffset * 6 + 3] = 0.0; tileTransformData[tileOffset * 6 + 4] = tileSize; tileTransformData[tileOffset * 6 + 5] = tileSize;
                tileMaterialData[tileOffset * 9 + 0] = 1.0; tileMaterialData[tileOffset * 9 + 1] = 1.0; tileMaterialData[tileOffset * 9 + 2] = 1.0; tileMaterialData[tileOffset * 9 + 3] = 1.0; tileMaterialData[tileOffset * 9 + 4] = texId; tileMaterialData[tileOffset * 9 + 5] = 0.0; tileMaterialData[tileOffset * 9 + 6] = 0.0; tileMaterialData[tileOffset * 9 + 7] = 1.0; tileMaterialData[tileOffset * 9 + 8] = 1.0;
                tileOffset++;
              }
            }
          }
        }
        this.device.queue.writeBuffer(activeTransformBuffer, 0, tileTransformData.buffer); this.device.queue.writeBuffer(activeMaterialBuffer, 0, tileMaterialData.buffer); currentInstanceOffset += tileInstances;
      }
      for (let i = 0; i < batchCount; i++) {
        const gtPtr = batches[i * 5 + 0]; const matPtr = batches[i * 5 + 1]; const count = batches[i * 5 + 4];
        this.device.queue.writeBuffer(activeTransformBuffer, currentInstanceOffset * 24, memView, gtPtr, count * 24);
        if (this.materialNeedsUpload[this.frameIndex]) { this.device.queue.writeBuffer(activeMaterialBuffer, currentInstanceOffset * 36, memView, matPtr, count * 36); }
        currentInstanceOffset += count;
      }
      this.materialNeedsUpload[this.frameIndex] = false;
    }

    // --- 2D shapes: gather retained + immediate, z-sort back-to-front (painter's algorithm) ---
    const shapeViews = world.query(["Shape2D", "GlobalTransform2D"]);
    let retainedShapes = 0;
    for (const v of shapeViews) retainedShapes += v.len;
    const shapeInstances = retainedShapes + this.immShapeCount;

    if (shapeInstances > 0) {
      if (shapeInstances > this.maxShapeInstances) {
        if (this.shapeInstanceBuffer) this.shapeInstanceBuffer.destroy();
        this.maxShapeInstances = Math.max(shapeInstances, 1000);
        this.shapeInstanceBuffer = this.device.createBuffer({ size: this.maxShapeInstances * 112, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        this.shapeData = new Float32Array(this.maxShapeInstances * 28);
        this.shapeScratch = new Float32Array(this.maxShapeInstances * 28);
        this.shapeZ = new Float32Array(this.maxShapeInstances);
        this.shapeOrder = new Uint32Array(this.maxShapeInstances);
      }
      const scratch = this.shapeScratch;
      const zArr = this.shapeZ;
      let n = 0;
      for (const v of shapeViews) {
        const shapes = v.arrays["Shape2D"]; const gts = v.arrays["GlobalTransform2D"];
        for (let i = 0; i < v.len; i++) {
          const sIdx = i * 22; const gIdx = i * 6; const o = n * 28;
          scratch[o] = gts[gIdx]; scratch[o+1] = gts[gIdx+1]; scratch[o+2] = gts[gIdx+2]; scratch[o+3] = gts[gIdx+3]; scratch[o+4] = gts[gIdx+4]; scratch[o+5] = gts[gIdx+5];
          for (let k = 0; k < 22; k++) scratch[o + 6 + k] = shapes[sIdx + k];
          zArr[n] = gts[gIdx + 2];
          n++;
        }
      }
      for (let i = 0; i < this.immShapeCount; i++) {
        const src = i * 28; const o = n * 28;
        for (let k = 0; k < 28; k++) scratch[o + k] = this.immShapeData[src + k];
        zArr[n] = this.immShapeData[src + 2];
        n++;
      }
      const order = this.shapeOrder.subarray(0, n);
      for (let i = 0; i < n; i++) order[i] = i;
      // stable insertion-order-preserving sort by z, back (low) to front (high)
      const orderArr = Array.from(order);
      orderArr.sort((a, b) => (zArr[a] - zArr[b]) || (a - b));
      for (let i = 0; i < n; i++) {
        const src = orderArr[i] * 28; const dst = i * 28;
        for (let k = 0; k < 28; k++) this.shapeData[dst + k] = scratch[src + k];
      }
      this.device.queue.writeBuffer(this.shapeInstanceBuffer, 0, this.shapeData.buffer, 0, shapeInstances * 112);
    }
    this.immShapeCount = 0;

    let textCharCount = 0;
    const textViews = world.query(["Text2D", "GlobalTransform2D"]);
    for (const v of textViews) {
      const textData = v.arrays["Text2D"];
      for (let i = 0; i < v.len; i++) { textCharCount += textData[i * 132 + 7]; }
    }

    if (textCharCount > 0) {
      if (textCharCount > this.maxTextChars) {
        if (this.textInstanceBuffer) this.textInstanceBuffer.destroy();
        this.maxTextChars = Math.max(textCharCount, 1000);
        this.textInstanceBuffer = this.device.createBuffer({ size: this.maxTextChars * 72, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      }

      const textInstanceData = new Float32Array(textCharCount * 18);
      let tOffset = 0;
      // z-sort text entities so labels layer correctly among themselves
      const textEntries = [];
      for (const v of textViews) {
        const gts = v.arrays["GlobalTransform2D"];
        for (let i = 0; i < v.len; i++) textEntries.push({ z: gts[i * 6 + 2], v, i });
      }
      textEntries.sort((a, b) => a.z - b.z);
      for (const entry of textEntries) {
        const v = entry.v;
        {
          const i = entry.i;
          const textData = v.arrays["Text2D"]; const gts = v.arrays["GlobalTransform2D"];
          const tIdx = i * 132; const gIdx = i * 6;
          const fontSize = textData[tIdx + 0]; const colorR = textData[tIdx + 1]; const colorG = textData[tIdx + 2]; const colorB = textData[tIdx + 3]; const colorA = textData[tIdx + 4];
          const alignment = textData[tIdx + 5]; const len = textData[tIdx + 7];
          const bold = textData[tIdx + 8]; const italic = textData[tIdx + 9]; const underline = textData[tIdx + 10];

          let totalW = 0.0;
          for (let j = 0; j < len; j++) {
              const charCode = textData[tIdx + 12 + j]; 
              const charIdx = (charCode >= 32 && charCode <= 127) ? charCode - 32 : 0;
              totalW += this.charWidths[charIdx] * fontSize;
          }

          let currentX = 0.0; 
          if (alignment === 1.0) currentX = -totalW * 0.5; 
          else if (alignment === 2.0) currentX = -totalW;

          const gx = gts[gIdx]; const gy = gts[gIdx + 1]; const gz = gts[gIdx + 2]; const rot = gts[gIdx + 3];
          const s = Math.sin(rot); const c = Math.cos(rot);

          for (let j = 0; j < len; j++) {
            const charCode = textData[tIdx + 12 + j]; const charIdx = (charCode >= 32 && charCode <= 127) ? charCode - 32 : 0;
            const advance = this.charWidths[charIdx] * fontSize;
            
            const col = charIdx % 10; const row = Math.floor(charIdx / 10);
            const uvX = col / 10.0; const uvY = row / 10.0; const uvW = 1.0 / 10.0; const uvH = 1.0 / 10.0;

            const localX = currentX + advance * 0.5; const localY = 0.0;
            const rx = localX * c - localY * s; const ry = localX * s + localY * c;

            const instIdx = tOffset * 18;
            textInstanceData[instIdx + 0] = gx + rx; textInstanceData[instIdx + 1] = gy + ry; textInstanceData[instIdx + 2] = gz; textInstanceData[instIdx + 3] = rot;
            textInstanceData[instIdx + 4] = fontSize; textInstanceData[instIdx + 5] = fontSize;
            textInstanceData[instIdx + 6] = colorR; textInstanceData[instIdx + 7] = colorG; textInstanceData[instIdx + 8] = colorB; textInstanceData[instIdx + 9] = colorA;
            textInstanceData[instIdx + 10] = uvX; textInstanceData[instIdx + 11] = uvY; textInstanceData[instIdx + 12] = uvW; textInstanceData[instIdx + 13] = uvH;
            textInstanceData[instIdx + 14] = bold; textInstanceData[instIdx + 15] = italic; textInstanceData[instIdx + 16] = underline; textInstanceData[instIdx + 17] = 0.0; 
            
            currentX += advance;
            tOffset++;
          }
        }
      }
      this.device.queue.writeBuffer(this.textInstanceBuffer, 0, textInstanceData.buffer, 0, textCharCount * 72);
    }

    const commandEncoder = this.device.createCommandEncoder();

    if (this.renderer.msaaCount > 1) {
      this.renderer.renderPassDescriptor.colorAttachments[0].view = this.renderer.msaaColorTextureView;
      this.renderer.renderPassDescriptor.colorAttachments[0].resolveTarget = this.renderer.context.getCurrentTexture().createView();
    } else {
      this.renderer.renderPassDescriptor.colorAttachments[0].view = this.renderer.context.getCurrentTexture().createView();
      this.renderer.renderPassDescriptor.colorAttachments[0].resolveTarget = undefined;
    }
    this.renderer.renderPassDescriptor.depthStencilAttachment.view = this.renderer.depthTextureView;

    const passEncoder = commandEncoder.beginRenderPass(this.renderer.renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.cameraBindGroup);

    if (overallInstances > 0) {
      let currentInstanceOffset = 0; let lastTextureBindGroup = null; let lastVertexBuffer = null; let lastIndexBuffer = null; let lastTransformBuffer = null; let lastMaterialBuffer = null;
      if (tileInstances > 0) {
        const mesh = this.assets.getMesh(this.quadMeshId);
        if (mesh) {
          passEncoder.setBindGroup(1, this.getTextureBindGroup(0)); lastTextureBindGroup = this.getTextureBindGroup(0);
          passEncoder.setVertexBuffer(0, mesh.vertexBuffer); lastVertexBuffer = mesh.vertexBuffer;
          passEncoder.setIndexBuffer(mesh.indexBuffer, "uint16"); lastIndexBuffer = mesh.indexBuffer;
          passEncoder.setVertexBuffer(1, activeTransformBuffer); lastTransformBuffer = activeTransformBuffer;
          passEncoder.setVertexBuffer(2, activeMaterialBuffer); lastMaterialBuffer = activeMaterialBuffer;
          passEncoder.drawIndexed(mesh.indexCount, tileInstances, 0, 0, 0);
        }
        currentInstanceOffset += tileInstances;
      }
      for (let i = 0; i < batchCount; i++) {
        const tId = batches[i * 5 + 2]; const mId = batches[i * 5 + 3]; const count = batches[i * 5 + 4];
        const mesh = this.assets.getMesh(mId);
        if (mesh) {
          const texBindGroup = this.getTextureBindGroup(tId);
          if (texBindGroup !== lastTextureBindGroup) { passEncoder.setBindGroup(1, texBindGroup); lastTextureBindGroup = texBindGroup; }
          if (mesh.vertexBuffer !== lastVertexBuffer) { passEncoder.setVertexBuffer(0, mesh.vertexBuffer); lastVertexBuffer = mesh.vertexBuffer; }
          if (mesh.indexBuffer !== lastIndexBuffer) { passEncoder.setIndexBuffer(mesh.indexBuffer, "uint16"); lastIndexBuffer = mesh.indexBuffer; }
          if (activeTransformBuffer !== lastTransformBuffer) { passEncoder.setVertexBuffer(1, activeTransformBuffer); lastTransformBuffer = activeTransformBuffer; }
          if (activeMaterialBuffer !== lastMaterialBuffer) { passEncoder.setVertexBuffer(2, activeMaterialBuffer); lastMaterialBuffer = activeMaterialBuffer; }
          passEncoder.drawIndexed(mesh.indexCount, count, 0, 0, currentInstanceOffset);
        }
        currentInstanceOffset += count;
      }
    }

    if (shapeInstances > 0) {
        const mesh = this.assets.getMesh(this.quadMeshId);
        if (mesh) {
            passEncoder.setPipeline(this.shapePipeline); passEncoder.setBindGroup(0, this.cameraBindGroup);
            passEncoder.setVertexBuffer(0, mesh.vertexBuffer); passEncoder.setVertexBuffer(1, this.shapeInstanceBuffer);
            passEncoder.setIndexBuffer(mesh.indexBuffer, "uint16"); passEncoder.drawIndexed(mesh.indexCount, shapeInstances, 0, 0, 0);
        }
    }

    if (this.polyVertexCount > 0) {
        this.device.queue.writeBuffer(this.polyBuffer, 0, this.polyData.buffer, 0, this.polyVertexCount * 24);
        passEncoder.setPipeline(this.polyPipeline); passEncoder.setBindGroup(0, this.cameraBindGroup);
        passEncoder.setVertexBuffer(0, this.polyBuffer); passEncoder.draw(this.polyVertexCount, 1, 0, 0);
        this.polyVertexCount = 0;
    }

    if (textCharCount > 0) {
        const mesh = this.assets.getMesh(this.quadMeshId);
        if (mesh) {
            passEncoder.setPipeline(this.textPipeline); passEncoder.setBindGroup(0, this.cameraBindGroup); passEncoder.setBindGroup(1, this.sdfBindGroup);
            passEncoder.setVertexBuffer(0, mesh.vertexBuffer); passEncoder.setVertexBuffer(1, this.textInstanceBuffer);
            passEncoder.setIndexBuffer(mesh.indexBuffer, "uint16"); passEncoder.drawIndexed(mesh.indexCount, textCharCount, 0, 0, 0);
        }
    }

    if (this.lineCount > 0) {
        this.device.queue.writeBuffer(this.lineBuffer, 0, this.lineData.buffer, 0, this.lineCount * 48);
        passEncoder.setPipeline(this.linePipeline); passEncoder.setBindGroup(0, this.cameraBindGroup);
        passEncoder.setVertexBuffer(0, this.lineBuffer); passEncoder.draw(this.lineCount * 2, 1, 0, 0);
        this.lineCount = 0;
    }

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);
    this.frameIndex = (this.frameIndex + 1) % 3;
  }
}