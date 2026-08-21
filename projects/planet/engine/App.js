import { ArtisanWorld } from "./Artisan.js";
import { InputManager } from "./Input.js";
import { WebGPURenderer } from "./Renderer.js";

export class ArtisanApp {
  constructor(wasmEngine, wasmMemory) {
    this.world = new ArtisanWorld(wasmEngine, wasmMemory);
    this.input = new InputManager();
    this.renderer = null;
    this.systems = [];
    this.postSystems = [];
    this.lastTime = performance.now();
    this.isRunning = false;
    this.registerStandardSchemas();
  }

  async initRenderer(canvasId) {
    const canvas = document.getElementById(canvasId);
    this.renderer = new WebGPURenderer(canvas);
    await this.renderer.init();
    return this;
  }

  registerStandardSchemas() {
    this.world.refreshSchemas();

    this.world.componentIds = {};
    const schemas = this.world.wasm.get_component_schemas();
    for (let i = 0; i < schemas.length; i++) {
      const s = schemas[i];
      this.world.componentIds[s.name] = s.id;
    }

    return this;
  }

  addSystem(fn) {
    this.systems.push({ type: "js", fn });
    return this;
  }

  // Runs after wasm.tick() but before render. Use this for JS logic that reacts to
  // entities the simulation just spawned/mutated this tick (e.g. skinning a
  // just-spawned entity's Shape2D) — a pre-tick system would only see last tick's
  // state and render one frame behind (a visible flash of default component values).
  addPostSystem(fn) {
    this.postSystems.push({ type: "js", fn });
    return this;
  }

  create2DShape(type, params = {}) {
    if (!this.renderer || !this.renderer.assets) return null;
    let meshObj = null;

    switch(type) {
      case 'quad': 
        meshObj = this.world.wasm.mesh_quad_2d(params.width || 1.0, params.height || 1.0); 
        break;
      case 'circle': 
        meshObj = this.world.wasm.mesh_circle_2d(params.segments || 32); 
        break;
      case 'ring': 
        meshObj = this.world.wasm.mesh_ring_2d(params.innerRadius || 0.4, params.outerRadius || 0.5, params.segments || 32); 
        break;
      case 'capsule': 
        meshObj = this.world.wasm.mesh_capsule_2d(params.width || 1.0, params.height || 2.0, params.segments || 16); 
        break;
      case 'polygon': 
        meshObj = this.world.wasm.mesh_circle_2d(params.sides || 3); 
        break;
    }

    if (meshObj) {
      const indices16 = new Uint16Array(meshObj.indices);
      return this.renderer.assets.createMesh(meshObj.vertices, indices16);
    }
    return null;
  }

  drawLine(x1, y1, x2, y2, color = [1.0, 0.0, 0.0, 1.0], width = 0) {
    if (this.renderer && this.renderer.renderer2D) {
      this.renderer.renderer2D.drawLine(x1, y1, x2, y2, color, width);
    }
  }

  drawShape(opts) {
    if (this.renderer && this.renderer.renderer2D) {
      this.renderer.renderer2D.drawShape(opts);
    }
  }

  drawPolyline(points, width, color) {
    if (this.renderer && this.renderer.renderer2D) {
      this.renderer.renderer2D.drawPolyline(points, width, color);
    }
  }

  drawPolygon(points, color) {
    if (this.renderer && this.renderer.renderer2D) {
      this.renderer.renderer2D.drawPolygon(points, color);
    }
  }

  run(renderMode = null) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (t) => {
      if (!this.isRunning) return;
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;

      this.input.update();

      this.world.wasm.wasm_update_input(
        this.input.buffer,
        this.input.mouseX,
        this.input.mouseY,
        this.input.mouseDX,
        this.input.mouseDY,
        this.input.mouseWheelDelta,
        this.input.buttonsBuffer,
      );

      for (const sys of this.systems) {
        if (sys.type === "js") sys.fn(this.world, dt, this.input);
        else if (sys.type === "native") this.world.wasm[sys.name](dt);
      }
      this.world.wasm.tick(dt);

      for (const sys of this.postSystems) {
        if (sys.type === "js") sys.fn(this.world, dt, this.input);
      }

      if (this.renderer) {
        if (renderMode === "3d") this.renderer.render3D(this.world);
        else if (renderMode === "2d") this.renderer.render(this.world);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}