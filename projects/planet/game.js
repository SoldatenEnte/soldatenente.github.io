import init, { create_vivarium_engine, wasm_set_visualization } from "./pkg/planet.js";
import { ArtisanApp } from "./engine/App.js";
import { UIBridge } from "./engine/UIBridge.js";

const canvas = document.getElementById("gameCanvas");
const seedInput = document.getElementById("seed");
const randomButton = document.getElementById("random-seed");
const generateButton = document.getElementById("generate");
const status = document.getElementById("status");
const layerSelect = document.getElementById("layer");
const subdivisionsSelect = document.getElementById("subdivisions");
const fpsDisplay = document.getElementById("fps");

function hashSeed(value) {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const floatView = new Float32Array(1);
  new Uint32Array(floatView.buffer)[0] = hash >>> 0;
  return floatView[0];
}

function createRandomSeed() {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return `${bytes[0].toString(36)}-${bytes[1].toString(36)}`.toUpperCase();
}

async function start() {
  const wasm = await init();
  const mobile = matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  const maxDpi = mobile ? 1.5 : 2;
  const dpi = Math.min(window.devicePixelRatio || 1, maxDpi);
  if (mobile) subdivisionsSelect.value = "5";
  const app = new ArtisanApp(create_vivarium_engine(dpi), wasm.memory);
  await app.initRenderer("gameCanvas");
  app.renderer.setClearColor(0.00392, 0.01568, 0.0392, 1);

  const ui = new UIBridge(app.world);
  const planetView = app.world.query(["PlanetConfig", "PlanetSimulationState"])[0];
  const config = ui.getComponentProxy(planetView.entities[0], "PlanetConfig");
  const atmosphereView = app.world.query(["AtmosphereConfig"])[0];
  const atmosphereConfig = ui.getComponentProxy(atmosphereView.entities[0], "AtmosphereConfig");
  const haloView = app.world.query(["AtmosphereHalo"])[0];
  const haloConfig = ui.getComponentProxy(haloView.entities[0], "AtmosphereHalo");
  let pendingGeneration = null;

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, maxDpi);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
    const cameraView = app.world.query(["Camera3D"])[0];
    if (cameraView?.len > 0) {
      cameraView.arrays.Camera3D[1] = window.innerWidth / window.innerHeight;
      app.world.wasm.wasm_mark_changed(cameraView.entities[0], app.world.schemas.Camera3D.id);
    }
    app.renderer.resize?.(window.innerWidth, window.innerHeight);
  }

  function generate() {
    const seed = seedInput.value.trim() || createRandomSeed();
    seedInput.value = seed;
    config.seed = hashSeed(seed);
    config.visualization_mode = Number(layerSelect.value);
    config.subdivisions = Number(subdivisionsSelect.value);
    atmosphereConfig.subdivisions = Math.min(Number(subdivisionsSelect.value), 6);
    atmosphereConfig.visible = Number(layerSelect.value) === 0 ? 1 : 0;
    haloConfig.visible = Number(layerSelect.value) === 0 && Number(subdivisionsSelect.value) >= 3 ? 1 : 0;
    const level = Number(subdivisionsSelect.value);
    const faces = 20 * 4 ** level;
    status.textContent = `Generating ${faces.toLocaleString()} triangles`;
    requestAnimationFrame(() => {
      pendingGeneration = { seed, level, faces };
      config.version += 1;
    });
  }

  randomButton.addEventListener("click", () => {
    seedInput.value = createRandomSeed();
    generate();
  });
  generateButton.addEventListener("click", generate);
  layerSelect.addEventListener("change", () => {
    const layer = Number(layerSelect.value);
    config.visualization_mode = layer;
    atmosphereConfig.visible = layer === 0 ? 1 : 0;
    haloConfig.visible = layer === 0 && Number(subdivisionsSelect.value) >= 3 ? 1 : 0;
    wasm_set_visualization(app.world.wasm, layer);
    status.textContent = `${layerSelect.options[layerSelect.selectedIndex].text} layer`;
  });
  subdivisionsSelect.addEventListener("change", generate);
  seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") generate();
  });

  let theta = 0;
  let phi = 0;
  let radius = 45;
  let radiusTarget = 45;
  let velocityTheta = 0;
  let velocityPhi = 0;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  let lastInteraction = performance.now();
  const pointers = new Map();
  let pinchDistance = 0;

  canvas.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    lastInteraction = performance.now();
    canvas.classList.add("dragging");
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (pinchDistance > 0) {
        radiusTarget = Math.max(14, Math.min(85, radiusTarget - (distance - pinchDistance) * 0.05));
      }
      pinchDistance = distance;
      lastInteraction = performance.now();
      return;
    }
    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    theta -= deltaX * 0.005;
    phi = Math.max(-1.45, Math.min(1.45, phi + deltaY * 0.005));
    velocityTheta = -deltaX * 0.004;
    velocityPhi = deltaY * 0.004;
    previousX = event.clientX;
    previousY = event.clientY;
    lastInteraction = performance.now();
  });
  const stopDragging = (event) => {
    pointers.delete(event.pointerId);
    pinchDistance = 0;
    dragging = pointers.size > 0;
    if (!dragging) canvas.classList.remove("dragging");
  };
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    radiusTarget = Math.max(14, Math.min(85, radiusTarget + event.deltaY * 0.035));
    lastInteraction = performance.now();
  }, { passive: false });

  app.addSystem((world) => {
    const cameraView = world.query(["Camera3D", "Transform"])[0];
    if (!cameraView?.len) return;
    if (!dragging) {
      theta += velocityTheta;
      phi = Math.max(-1.45, Math.min(1.45, phi + velocityPhi));
      velocityTheta *= 0.92;
      velocityPhi *= 0.92;
      if (performance.now() - lastInteraction > 4000) theta += 0.0004;
    }
    radius += (radiusTarget - radius) * 0.1;

    const transform = cameraView.arrays.Transform;
    transform[0] = radius * Math.cos(phi) * Math.sin(theta);
    transform[1] = radius * Math.sin(phi);
    transform[2] = radius * Math.cos(phi) * Math.cos(theta);
    const halfTheta = theta * 0.5;
    const halfPhi = -phi * 0.5;
    const sinX = Math.sin(halfPhi);
    const cosX = Math.cos(halfPhi);
    const sinY = Math.sin(halfTheta);
    const cosY = Math.cos(halfTheta);
    transform[3] = sinX * cosY;
    transform[4] = cosX * sinY;
    transform[5] = -sinX * sinY;
    transform[6] = cosX * cosY;
  });

  window.addEventListener("resize", resize);
  resize();
  generate();

  let previousTime = performance.now();
  let fpsStart = previousTime;
  let fpsFrames = 0;
  function frame(time) {
    const deltaTime = Math.min((time - previousTime) / 1000, 0.1);
    previousTime = time;
    app.world.wasm.wasm_update_input(
      app.input.buffer, app.input.mouseX, app.input.mouseY, app.input.mouseDX,
      app.input.mouseDY, app.input.mouseWheelDelta, app.input.buttonsBuffer,
    );
    app.input.mouseDX = 0;
    app.input.mouseDY = 0;
    for (const system of app.systems) {
      if (system.type === "js") system.fn(app.world, deltaTime, app.input);
    }
    const generationStart = performance.now();
    app.world.wasm.tick(deltaTime);
    if (pendingGeneration) {
      const duration = performance.now() - generationStart;
      status.textContent = `${pendingGeneration.faces.toLocaleString()} triangles in ${duration.toFixed(0)} ms`;
      pendingGeneration = null;
    }
    app.renderer.render3D(app.world);
    fpsFrames++;
    if (time - fpsStart >= 500) {
      fpsDisplay.textContent = `FPS ${Math.round(fpsFrames * 1000 / (time - fpsStart))}`;
      fpsFrames = 0;
      fpsStart = time;
    }
    requestAnimationFrame(frame);
  }
  const loader = document.getElementById("artisan-loader");
  if (loader) {
    loader.classList.add("loaded");
    setTimeout(() => loader.remove(), 450);
  }
  requestAnimationFrame(frame);
}

start().catch((error) => {
  console.error(error);
  status.textContent = "Demo could not be started";
  const loader = document.getElementById("artisan-loader");
  if (loader) {
    const sub = loader.querySelector(".artisan-loader-sub");
    if (sub) sub.textContent = `Error: ${error.message || error}`;
  }
});
