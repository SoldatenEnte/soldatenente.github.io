import * as THREE from "three";
import init, {
  create_vivarium_engine,
  wasm_get_face_info,
  wasm_get_colony_stats,
  wasm_get_settlements_data,
} from "./pkg/planet.js";
import { Planet } from "./Planet.js";
import { Stars } from "./Stars.js";
import { ArtisanApp } from "../engine/App.js";
import { UIBridge } from "../engine/UIBridge.js";

function seededRandom(seed) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const prefixes = [
  "Nova",
  "San",
  "Khar",
  "Fort",
  "Port",
  "Alt",
  "New",
  "Astro",
  "Zeth",
  "Val",
];
const roots = [
  "Tesh",
  "Prime",
  "Kor",
  "Zan",
  "Vak",
  "Lom",
  "Garth",
  "Hearth",
  "Vara",
  "Taria",
  "Lumina",
];
const suffixes = [
  "ia",
  "ium",
  "grad",
  "burg",
  "polis",
  "ville",
  "ton",
  " Station",
  " Base",
  " City",
];

function generateName(seed) {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  let name = "";
  if (r1 < 0.4) {
    name += prefixes[Math.floor(r1 * 2.5 * prefixes.length)] + " ";
  }
  name += roots[Math.floor(r2 * roots.length)];
  if (r3 < 0.5) {
    name += suffixes[Math.floor(r3 * 2.0 * suffixes.length)];
  }
  return name;
}

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.floor(n).toString();
}

function quatMultiply(q1, q2) {
  const x1 = q1[0],
    y1 = q1[1],
    z1 = q1[2],
    w1 = q1[3];
  const x2 = q2[0],
    y2 = q2[1],
    z2 = q2[2],
    w2 = q2[3];
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ];
}

async function start() {
  const wasm = await init();
  const dpi = window.devicePixelRatio || 1.0;
  const app = new ArtisanApp(create_vivarium_engine(dpi), wasm.memory);
  app.registerStandardSchemas();
  const uiBridge = new UIBridge(app.world);

  const landingUI = document.getElementById("landing-ui");
  const setupUI = document.getElementById("setup-ui");
  const simUI = document.getElementById("sim-ui");
  const btnBegin = document.getElementById("btn-begin");
  const btnLaunch = document.getElementById("btn-launch");
  const seedInput = document.getElementById("param-seed");
  const btnRandomSeed = document.getElementById("btn-random-seed");
  const coloniesSlider = document.getElementById("param-colonies");
  const coloniesVal = document.getElementById("val-colonies");

  coloniesSlider.oninput = () => {
    coloniesVal.textContent = coloniesSlider.value;
  };

  btnBegin.onclick = () => {
    landingUI.classList.remove("active");
    setupUI.classList.add("active");
    appState = "setup";
  };

  let planetEntityId = null;
  const planetQuery = app.world.query([
    "PlanetConfig",
    "PlanetSimulationState",
  ]);
  if (planetQuery.length > 0 && planetQuery[0].len > 0) {
    planetEntityId = planetQuery[0].entities[0];
  }

  let appState = "landing";
  let isTransitioning = false;
  let thetaTarget = 0.0;
  let phiTarget = 0.0;

  if (planetEntityId !== null) {
    const configProxy = uiBridge.getComponentProxy(
      planetEntityId,
      "PlanetConfig",
    );
    const stateProxy = uiBridge.getComponentProxy(
      planetEntityId,
      "PlanetSimulationState",
    );

    const updateSeed = () => {
      const seedStr = seedInput.value;
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const floatView = new Float32Array(1);
      const uintView = new Uint32Array(floatView.buffer);
      uintView[0] = h >>> 0;
      configProxy.seed = floatView[0];
      configProxy.version = configProxy.version + 1.0;
    };

    updateSeed();

    seedInput.oninput = () => {
      updateSeed();
    };

    btnRandomSeed.onclick = () => {
      seedInput.value =
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        "-" +
        Math.floor(Math.random() * 9000 + 1000) +
        "-OMEGA";
      updateSeed();
    };

    btnLaunch.onclick = () => {
      setupUI.classList.remove("active");
      simUI.classList.add("active");
      stateProxy.num_colonies = parseFloat(coloniesSlider.value);
      stateProxy.run_simulation = 1.0;
      appState = "sim";
      isTransitioning = true;
      radiusTarget = 45.0;
      thetaTarget = 0.0;
      phiTarget = 0.0;
    };
  }

  let theta = 0;
  let phi = 0;
  let radius = 45.0;
  let radiusTarget = 45.0;
  let thetaVelocity = 0.0;
  let phiVelocity = 0.0;
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let dragDistance = 0;
  let lastInputTime = performance.now();
  const autoRotateSpeed = 0.0004;
  const damping = 0.93;
  let dragVelocityX = 0.002;
  let dragVelocityY = 0.0;

  window.addEventListener("mousedown", (e) => {
    if (e.target.tagName !== "CANVAS") return;
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    dragDistance = 0;
    lastInputTime = performance.now();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouseX;
    const dy = e.clientY - prevMouseY;

    if (appState === "sim") {
      thetaVelocity = dx * -0.005;
      phiVelocity = dy * 0.005;
    } else if (appState === "setup") {
      dragVelocityX = dx * 0.005;
      dragVelocityY = dy * 0.005;
    }

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    dragDistance += Math.abs(dx) + Math.abs(dy);
    lastInputTime = performance.now();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("wheel", (e) => {
    if (e.target.tagName !== "CANVAS") return;
    if (appState === "sim") {
      radiusTarget = Math.max(
        12.0,
        Math.min(100.0, radiusTarget + e.deltaY * 0.05),
      );
    }
    lastInputTime = performance.now();
  });

  app.world.wasm.tick(0.016);
  const initialVertices = app.world.getDynamicMeshVertices(planetEntityId);
  const initialIndices = app.world.getDynamicMeshIndices(planetEntityId);

  const canvas = document.getElementById("gameCanvas");
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor("#01040a", 1.0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01040a);

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000.0);
  camera.position.set(0.0, 0.0, 45.0);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x404550, 0.4));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.0));

  const sun = new THREE.DirectionalLight(0xffffee, 1.8);
  sun.position.set(40, 30, 20);
  scene.add(sun);

  const back = new THREE.DirectionalLight(0x88aacc, 1.8);
  back.position.set(-40, -30, -20);
  scene.add(back);

  const planet = new Planet(initialVertices, initialIndices);
  scene.add(planet.mesh);

  const stars = new Stars();
  scene.add(stars.instance);

  const tileBox = document.getElementById("tile-box");
  const closeTileBtn = document.getElementById("close-tile");
  let selectedFaceId = -1;

  closeTileBtn.onclick = (e) => {
    e.stopPropagation();
    selectedFaceId = -1;
    tileBox.style.display = "none";
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  window.addEventListener("click", (e) => {
    if (dragDistance > 5) return;
    if (e.target.tagName !== "CANVAS") return;
    if (appState !== "sim") return;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(planet.mesh);

    if (intersects.length > 0) {
      selectedFaceId = intersects[0].faceIndex;
      updateTileUI(selectedFaceId);
    } else {
      selectedFaceId = -1;
      tileBox.style.display = "none";
    }
  });

  function updateTileUI(faceId) {
    if (faceId === -1) return;
    const info = wasm_get_face_info(app.world.wasm, faceId);
    if (!info || info.length < 8) return;

    tileBox.style.display = "block";
    const isWater = info[0] === 1.0;
    document.getElementById("t-type").textContent = isWater ? "Ocean" : "Land";
    document.getElementById("t-elev").textContent = isWater
      ? "Sea Level"
      : Math.round(info[1] * 5000) + " m";
    document.getElementById("t-temp").textContent =
      Math.round(info[2] * 80 - 30) + " °C";
    document.getElementById("t-moist").textContent =
      Math.round(info[3] * 3000) + " mm/yr";

    const arabilityRow = document.getElementById("t-arability-row");
    const minRow = document.getElementById("t-min-row");
    if (!isWater) {
      arabilityRow.style.display = "flex";
      minRow.style.display = "flex";
      document.getElementById("t-arability").textContent =
        Math.round(info[4] * 100) + "%";
      document.getElementById("t-min").textContent =
        Math.round(info[5] * 100) + "%";
    } else {
      arabilityRow.style.display = "none";
      minRow.style.display = "none";
    }

    const cityPanel = document.getElementById("city-panel");
    const ownerPanel = document.getElementById("owner-panel");

    const ownerId = info[6];
    if (ownerId !== -1) {
      ownerPanel.style.display = "block";
      const ownerName = document.getElementById("t-owner-name");
      ownerName.textContent = `Faction ${ownerId}`;
    } else {
      ownerPanel.style.display = "none";
    }

    let selectedSet = null;
    const setsData = wasm_get_settlements_data(app.world.wasm);
    for (let i = 0; i < setsData.length; i += 10) {
      const fIdx = setsData[i + 9];
      if (fIdx === faceId) {
        selectedSet = {
          id: setsData[i],
          pop: setsData[i + 4],
          factionId: setsData[i + 5],
          infra: setsData[i + 6],
          isCap: setsData[i + 7] === 1.0,
          nameSeed: setsData[i + 8],
        };
        break;
      }
    }

    if (selectedSet) {
      cityPanel.style.display = "block";
      document.getElementById("c-name").textContent = generateName(
        selectedSet.nameSeed,
      );
      const tier =
        selectedSet.pop > 150000
          ? "Metropolis"
          : selectedSet.pop > 30000
            ? "City"
            : selectedSet.pop > 8000
              ? "Town"
              : "Village";
      document.getElementById("c-tier").textContent = selectedSet.isCap
        ? "Capital " + tier
        : tier;
      document.getElementById("c-faction").textContent = selectedSet.factionId;
      document.getElementById("c-pop").textContent = fmt(selectedSet.pop);
      document.getElementById("c-infra").textContent =
        Math.round(selectedSet.infra * 100) + "%";
    } else {
      cityPanel.style.display = "none";
    }
  }

  let isPaused = false;
  let simSpeed = 1;
  const btnPlay = document.getElementById("btn-play");
  const speedSlider = document.getElementById("sim-speed-slider");
  const speedVal = document.getElementById("sim-speed-val");

  btnPlay.onclick = () => {
    isPaused = !isPaused;
    btnPlay.textContent = isPaused ? "Play" : "Pause";
  };

  speedSlider.oninput = () => {
    simSpeed = parseFloat(speedSlider.value);
    speedVal.textContent = simSpeed.toFixed(1) + "x";
  };

  const listContainer = document.getElementById("colony-list");
  function updateLeaderboard() {
    const stats = wasm_get_colony_stats(app.world.wasm);
    const sorted = [];
    for (let i = 0; i < stats.length; i += 5) {
      sorted.push({
        id: stats[i],
        pop: stats[i + 1],
        nodes: stats[i + 2],
        wealth: stats[i + 3],
        tech: stats[i + 4],
      });
    }
    sorted.sort((a, b) => b.pop - a.pop);
    listContainer.innerHTML = "";
    sorted.forEach((item) => {
      const el = document.createElement("div");
      el.className = "colony-item";
      el.innerHTML = `
        <div class="c-info">
          <span class="c-name">Faction ${item.id}</span>
        </div>
        <span class="c-pop">${fmt(item.pop)}</span>
      `;
      listContainer.appendChild(el);
    });
  }

  const btnTogglePerf = document.getElementById("btn-toggle-perf");
  const perfContent = document.getElementById("perf-content");
  btnTogglePerf.onclick = (e) => {
    e.stopPropagation();
    const isHidden = perfContent.style.display === "none";
    perfContent.style.display = isHidden ? "block" : "none";
    btnTogglePerf.textContent = isHidden ? "[ - ]" : "[ + ]";
  };

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const pWasm = document.getElementById("p-wasm");
  const pJs = document.getElementById("p-js");
  const pRender = document.getElementById("p-render");
  const pTotal = document.getElementById("p-total");
  const pFps = document.getElementById("p-fps");

  const rollingWasm = [];
  const rollingJs = [];
  const rollingRender = [];
  const rollingTotal = [];

  const updateRolling = (arr, val) => {
    arr.push(val);
    if (arr.length > 20) arr.shift();
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  let lastTime = performance.now();
  let frames = 0;
  let lastFpsTime = performance.now();
  let lastMeshVersion = app.world.getDynamicMeshVersion(planetEntityId);
  let currentYear = 1;
  let simTickCounter = 0;

  const cameraLookAt = new THREE.Vector3(0, 0, 0);

  const loop = (t) => {
    const frameStart = performance.now();
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;

    const tWasm0 = performance.now();
    const stateProxy = uiBridge.getComponentProxy(
      planetEntityId,
      "PlanetSimulationState",
    );
    if (stateProxy && stateProxy.run_simulation > 0.0 && !isPaused) {
      simTickCounter += simSpeed;
      if (simTickCounter >= 1) {
        const steps = Math.floor(simTickCounter);
        simTickCounter -= steps;
        for (let s = 0; s < steps; s++) {
          app.world.wasm.tick(dt);
          currentYear++;
        }
        document.getElementById("year-display").textContent =
          `Year ${currentYear}`;
        updateLeaderboard();
        if (selectedFaceId !== -1) {
          updateTileUI(selectedFaceId);
        }
      }
    } else {
      app.world.wasm.tick(dt);
    }
    const tWasm1 = performance.now();

    const currentVersion = app.world.getDynamicMeshVersion(planetEntityId);
    if (currentVersion !== lastMeshVersion) {
      lastMeshVersion = currentVersion;
      const updatedVertices = app.world.getDynamicMeshVertices(planetEntityId);
      const updatedIndices = app.world.getDynamicMeshIndices(planetEntityId);
      planet.updateGeometry(updatedVertices, updatedIndices);
    }

    if (appState === "landing") {
      const dq_y = [0, Math.sin(0.001), 0, Math.cos(0.001)];
      let q_old = [
        planet.mesh.quaternion.x,
        planet.mesh.quaternion.y,
        planet.mesh.quaternion.z,
        planet.mesh.quaternion.w,
      ];
      let q_new = quatMultiply(dq_y, q_old);

      const len = Math.sqrt(
        q_new[0] * q_new[0] +
          q_new[1] * q_new[1] +
          q_new[2] * q_new[2] +
          q_new[3] * q_new[3],
      );
      planet.mesh.quaternion.set(
        q_new[0] / len,
        q_new[1] / len,
        q_new[2] / len,
        q_new[3] / len,
      );

      camera.position.lerp(new THREE.Vector3(0, 0, 45), 0.015);
      cameraLookAt.lerp(new THREE.Vector3(0, 0, 0), 0.015);
      camera.lookAt(cameraLookAt);
    } else if (appState === "setup") {
      if (!isDragging) {
        dragVelocityX += (0.002 - dragVelocityX) * 0.05;
        dragVelocityY += (0.0 - dragVelocityY) * 0.05;
      }

      const dq_y = [
        0,
        Math.sin(dragVelocityX * 0.5),
        0,
        Math.cos(dragVelocityX * 0.5),
      ];
      const dq_x = [
        Math.sin(dragVelocityY * 0.5),
        0,
        0,
        Math.cos(dragVelocityY * 0.5),
      ];
      const dq = quatMultiply(dq_y, dq_x);

      let q_old = [
        planet.mesh.quaternion.x,
        planet.mesh.quaternion.y,
        planet.mesh.quaternion.z,
        planet.mesh.quaternion.w,
      ];
      let q_new = quatMultiply(dq, q_old);

      const len = Math.sqrt(
        q_new[0] * q_new[0] +
          q_new[1] * q_new[1] +
          q_new[2] * q_new[2] +
          q_new[3] * q_new[3],
      );
      planet.mesh.quaternion.set(
        q_new[0] / len,
        q_new[1] / len,
        q_new[2] / len,
        q_new[3] / len,
      );

      camera.position.lerp(new THREE.Vector3(0, 0, 36), 0.025);
      cameraLookAt.lerp(new THREE.Vector3(6.5, 0, 0), 0.025);
      camera.lookAt(cameraLookAt);
    } else if (appState === "sim") {
      if (isTransitioning) {
        radius += (radiusTarget - radius) * 0.06;
        theta += (thetaTarget - theta) * 0.06;
        phi += (phiTarget - phi) * 0.06;
        if (
          Math.abs(radius - radiusTarget) < 0.2 &&
          Math.abs(theta - thetaTarget) < 0.01
        ) {
          isTransitioning = false;
        }
      } else {
        if (!isDragging) {
          theta += thetaVelocity;
          phi += phiVelocity;
          thetaVelocity *= damping;
          phiVelocity *= damping;
          if (performance.now() - lastInputTime > 5000 && !isPaused) {
            theta += autoRotateSpeed;
          }
        } else {
          theta += thetaVelocity;
          phi += phiVelocity;
          thetaVelocity = 0;
          phiVelocity = 0;
        }
        radius += (radiusTarget - radius) * 0.1;
      }

      const cx = radius * Math.cos(phi) * Math.sin(theta);
      const cy = radius * Math.sin(phi);
      const cz = radius * Math.cos(phi) * Math.cos(theta);
      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);
    }

    stars.update(dt);

    const tRender0 = performance.now();
    renderer.render(scene, camera);
    const tRender1 = performance.now();

    const frameEnd = performance.now();

    const wasmMs = tWasm1 - tWasm0;
    const renderMs = tRender1 - tRender0;
    const jsMs = 0.05;
    const totalMs = frameEnd - frameStart;

    pWasm.textContent = `${updateRolling(rollingWasm, wasmMs).toFixed(2)}ms`;
    pJs.textContent = `${updateRolling(rollingJs, jsMs).toFixed(2)}ms`;
    pRender.textContent = `${updateRolling(rollingRender, renderMs).toFixed(2)}ms`;
    pTotal.textContent = `${updateRolling(rollingTotal, totalMs).toFixed(2)}ms`;

    frames++;
    if (t - lastFpsTime >= 500) {
      pFps.textContent = (frames / ((t - lastFpsTime) / 1000)).toFixed(1);
      frames = 0;
      lastFpsTime = t;
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

start();
