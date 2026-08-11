import init, {
  initThreadPool,
  create_vivarium_engine,
  wasm_get_face_info,
  wasm_select_face,
  vivarium_settler_marker_mesh,
  wasm_set_settler_mesh_id,
  wasm_active_drought_count,
  wasm_admin_set_food_regen,
  wasm_admin_clear_droughts,
  wasm_admin_paint,
  wasm_admin_preview,
} from "./pkg/vivarium_civ.js";
import { ArtisanApp } from "./engine/App.js";
import { UIBridge } from "./engine/UIBridge.js";

function seededRandom(seed) {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Deterministic, single-word names. The affine shuffle spreads neighboring
// tribe ids across both parts instead of producing a list with one repeated
// ending. The first 432 tribes are distinct; later cycles stay distinct too.
const tribeOnsets = ["Ael", "Ar", "Bel", "Cor", "Da", "Eld", "Fen", "Gal", "Hal", "Is", "Jar", "Ka", "Lor", "Mor", "Nor", "Or", "Pra", "Quel", "Rav", "Sar", "Tor", "Ul", "Val", "Wyr", "Xan", "Yor", "Zel"];
const tribeEndings = ["dan", "dor", "ia", "in", "is", "mar", "mon", "nar", "os", "ran", "ria", "ron", "tar", "th", "var", "wyn"];
function tribeName(rawId) {
  const id = Math.max(0, Math.round(rawId));
  const combinations = tribeOnsets.length * tribeEndings.length;
  const shuffled = (id * 29 + 71) % combinations;
  const onset = tribeOnsets[shuffled % tribeOnsets.length];
  const ending = tribeEndings[Math.floor(shuffled / tribeOnsets.length)];
  const cycle = Math.floor(id / combinations);
  return onset + ending + (cycle ? cycle.toString(36).toUpperCase() : "");
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

// id, face_index, hunger, thirst, hue, cooldown, known_water_face,
// known_food_face, tribe_id, age, birth_cooldown, cooperation, aggression,
// mobility, render_slot, previous_face, move_commitment -- must match the Settler struct field order/count in
// demos/vivarium_civ/src/components.rs exactly (repr(C), read here by raw
// byte offset). tribe_id occupies the same slot the old colony_id did (just
// renamed in Rust); cooperation/aggression/mobility/render_slot were appended
// for the emergent-civilisation adaptation, stride grew from 11 to 15.
const SETTLER_STRIDE = 17;

async function start() {
  const wasm = await init();

  // Spin up rayon's Web Worker thread pool. Without this every par_for_each
  // in the engine (transform propagation, billboard orientation, frustum
  // culling, BVH build -- ~14 call sites) silently runs single-threaded, so
  // the whole simulation was using one core no matter how many the machine
  // has. Requires cross-origin isolation for SharedArrayBuffer, which
  // tools/scripts/dev_server.js already sends COOP/COEP headers for;
  // `crossOriginIsolated` is the browser's own confirmation that it worked.
  // Guarded rather than assumed so the demo still runs (single-threaded) if
  // it's served without those headers.
  if (window.crossOriginIsolated) {
    try {
      await initThreadPool(navigator.hardwareConcurrency || 4);
      console.log(`[vivarium] rayon thread pool: ${navigator.hardwareConcurrency || 4} threads`);
    } catch (err) {
      console.warn("[vivarium] thread pool init failed, running single-threaded:", err);
    }
  } else {
    console.warn("[vivarium] not cross-origin isolated - running single-threaded");
  }

  const dpi = window.devicePixelRatio || 1.0;

  const canvas = document.getElementById("gameCanvas");
  canvas.width = window.innerWidth * dpi;
  canvas.height = window.innerHeight * dpi;

  const app = new ArtisanApp(create_vivarium_engine(dpi), wasm.memory);
  await app.initRenderer("gameCanvas");
  app.renderer.setClearColor(0.00392, 0.01568, 0.0392, 1.0);
  // Debug hook for querying live entity state from devtools/automated
  // checks (WebGPU tabs can't be screenshotted headlessly) -- see the
  // artisan-testing-workflow/artisan-surface-entity-rotation memories.
  window.__app = app;

  // Register the settler marker mesh ONCE and share its id across every
  // settler entity (see wasm_set_settler_mesh_id's doc comment in lib.rs).
  // Without this, every settler got its own DynamicMesh -- correct, but each
  // one is a separate GPU buffer AND a separate render batch, so thousands of
  // settlers meant thousands of individual draw calls instead of one
  // instanced draw (this was the cause of the severe framerate drop at even
  // a few thousand settlers).
  const settlerMesh = vivarium_settler_marker_mesh();
  const settlerMeshId = app.renderer.assets.createMesh(settlerMesh.vertices, settlerMesh.indices);
  wasm_set_settler_mesh_id(app.world.wasm, settlerMeshId);

  const uiBridge = new UIBridge(app.world);

  const handleResize = () => {
    const freshDpi = window.devicePixelRatio || 1.0;
    const freshCanvas = document.getElementById("gameCanvas");
    if (freshCanvas) {
      freshCanvas.width = window.innerWidth * freshDpi;
      freshCanvas.height = window.innerHeight * freshDpi;
    }
    const cams = app.world.query(["Camera3D"]);
    if (cams.length > 0 && cams[0].len > 0) {
      const cameraView = cams[0];
      const cameraData = cameraView.arrays["Camera3D"];
      const aspect = window.innerWidth / window.innerHeight;
      cameraData[1] = aspect;
      app.world.wasm.wasm_mark_changed(
        cameraView.entities[0],
        app.world.schemas["Camera3D"].id,
      );
    }
    if (app.renderer && typeof app.renderer.resize === "function") {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    }
  };
  window.addEventListener("resize", handleResize);
  handleResize();

  const setupUI = document.getElementById("setup-ui");
  const simUI = document.getElementById("sim-ui");
  const btnLaunch = document.getElementById("btn-launch");
  const seedInput = document.getElementById("param-seed");
  const btnRandomSeed = document.getElementById("btn-random-seed");
  const coloniesSlider = document.getElementById("param-colonies");
  const coloniesVal = document.getElementById("val-colonies");

  const seedWords = ["Aster", "Boreal", "Cygnus", "Draco", "Eos", "Helios", "Lyra", "Nova", "Orion", "Pavo", "Quasar", "Sol", "Vela", "Zenith"];
  function randomPlanetSeed() {
    const first = seedWords[Math.floor(Math.random() * seedWords.length)];
    let last = seedWords[Math.floor(Math.random() * seedWords.length)];
    if (last === first) last = seedWords[(seedWords.indexOf(last) + 1) % seedWords.length];
    return `${first.toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}-${last.toUpperCase()}`;
  }

  coloniesSlider.oninput = () => {
    coloniesVal.textContent = coloniesSlider.value;
  };

  let planetEntityId = null;
  const planetQuery = app.world.query([
    "PlanetConfig",
    "PlanetSimulationState",
  ]);
  if (planetQuery.length > 0 && planetQuery[0].len > 0) {
    planetEntityId = planetQuery[0].entities[0];
  }

  let appState = "setup";
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
      seedInput.value = randomPlanetSeed();
      updateSeed();
    };

    btnLaunch.onclick = () => {
      setupUI.classList.remove("active");
      simUI.classList.add("active");
      // Reset the planet's orientation to identity before the sim starts.
      // During "setup" the planet free-spins for eye-candy and freezes at a
      // leftover rotation; nothing rewrites it in "sim". Settlers are spawned
      // at LOCAL face-center coords as root (non-parented) entities, so they
      // render at those raw positions with no rotation applied -- while the
      // terrain renders through the planet's rotated GlobalTransform. Any
      // leftover rotation therefore slides every settler off the terrain
      // (they'd appear over water / on the wrong tiles). Zeroing it here makes
      // planet-local space == world space, so surface entities line up exactly
      // with the terrain (and tile picking, which already accounts for the
      // planet transform, keeps working).
      const planetTView = app.world.query([
        "PlanetSimulationState",
        "Transform",
      ]);
      if (planetTView.length > 0 && planetTView[0].len > 0) {
        const pt = planetTView[0].arrays["Transform"];
        pt[3] = 0.0;
        pt[4] = 0.0;
        pt[5] = 0.0;
        pt[6] = 1.0;
      }
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
  let cameraLookAtX = 0.0;
  let cameraPositionZ = 45.0;
  let adminBrush = null;
  let adminBrushRadius = 1;
  let isAdminPainting = false;
  let lastPaintedFace = -1;
  let lastPaintTime = 0;
  let lastPreviewFace = -1;
  let lastPreviewTime = 0;

  function adminFaceAtPointer(e) {
    const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    const ray = app.world.wasm.wasm_screen_to_ray(ndcX, ndcY);
    if (!ray || ray.length !== 6) return -1;
    const hit = app.world.wasm.wasm_raycast_3d(...ray);
    return hit && hit.length === 3 ? Math.floor(hit[2]) : -1;
  }

  function clearAdminPreview() {
    wasm_admin_preview(app.world.wasm, -1, adminBrush ?? 0, adminBrushRadius);
    lastPreviewFace = -1;
  }

  function updateAdminPreview(e) {
    if (adminBrush === null || appState !== "sim") return;
    const now = performance.now();
    const face = adminFaceAtPointer(e);
    if (face === lastPreviewFace || now - lastPreviewTime < 70) return;
    lastPreviewFace = face;
    lastPreviewTime = now;
    wasm_admin_preview(app.world.wasm, face, adminBrush, adminBrushRadius);
    lastInputTime = now;
  }

  function paintAdminBrush(e, force = false) {
    if (adminBrush === null || appState !== "sim") return;
    const now = performance.now();
    if (!force && now - lastPaintTime < 55) return;
    const face = adminFaceAtPointer(e);
    if (face < 0) return;
    if (face === lastPaintedFace) return;
    lastPaintedFace = face;
    lastPaintTime = now;
    const result = wasm_admin_paint(app.world.wasm, face, adminBrush, adminBrushRadius);
    const changed = result?.[0] ?? 0;
    const skipped = result?.[1] ?? 0;
    const names = ["Drought", "Food", "Land", "Water", "Settlers"];
    const skippedText = adminBrush === 3 || adminBrush === 4
      ? `${skipped} occupied tile${skipped === 1 ? " was" : "s were"} skipped.`
      : "";
    adminStatus.textContent = changed
      ? `${names[adminBrush]} updated on ${changed} tile${changed === 1 ? "" : "s"}.${skipped ? ` ${skippedText}` : ""}`
      : skipped ? skippedText : "Nothing changes here.";
    lastInputTime = now;
  }

  window.addEventListener("mousedown", (e) => {
    if (e.target.tagName !== "CANVAS") return;
    if (adminBrush !== null && appState === "sim" && e.button === 0) {
      e.preventDefault();
      isAdminPainting = true;
      lastPaintedFace = -1;
      paintAdminBrush(e, true);
      return;
    }
    if (e.button === 1 || e.button === 2) e.preventDefault();
    clearAdminPreview();
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    dragDistance = 0;
    lastInputTime = performance.now();
    // Manual dragging always wins over an in-progress camera track.
    trackedSettlerId = null;
  });

  window.addEventListener("mousemove", (e) => {
    if (isAdminPainting) {
      paintAdminBrush(e);
      return;
    }
    if (adminBrush !== null && !isDragging && e.target.tagName === "CANVAS") {
      updateAdminPreview(e);
      return;
    }
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

  window.addEventListener("mouseup", (e) => {
    isDragging = false;
    isAdminPainting = false;
    lastPaintedFace = -1;
    if (adminBrush !== null && e.target.tagName === "CANVAS") updateAdminPreview(e);
  });

  window.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "CANVAS") e.preventDefault();
  });
  document.getElementById("gameCanvas").addEventListener("mouseleave", () => {
    if (!isAdminPainting) clearAdminPreview();
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

  let selectedFaceId = -1;
  let selectedSettlerId = null;
  // Id of the settler the camera should keep following every frame (see the
  // app.addSystem camera-update callback below), or null when not tracking.
  // Cleared whenever the user manually drags/closes the panel, or the
  // tracked settler can no longer be found (died).
  let trackedSettlerId = null;
  const tileBox = document.getElementById("tile-box");
  const closeTileBtn = document.getElementById("close-tile");

  function clearSelection() {
    wasm_select_face(app.world.wasm, selectedFaceId, -1);
    selectedFaceId = -1;
    selectedSettlerId = null;
    trackedSettlerId = null;
    tileBox.style.display = "none";
    selectedTribeId = null;
    applyTribeHighlight();
    for (const row of listContainer.querySelectorAll(".tribe-selected")) row.classList.remove("tribe-selected");
  }

  closeTileBtn.onclick = (e) => { e.stopPropagation(); clearSelection(); };

  function findSettlerById(id) {
    for (const view of app.world.query(["Settler", "Transform"])) {
      const s = view.arrays["Settler"], t = view.arrays["Transform"];
      for (let i = 0; i < view.len; i++) {
        const base = i * SETTLER_STRIDE;
        if (Math.round(s[base]) === Math.round(id)) {
          return { id: s[base], face: Math.round(s[base + 1]), hunger: s[base + 2], thirst: s[base + 3], tribe: s[base + 8], age: s[base + 9], cooperation: s[base + 11], aggression: s[base + 12], mobility: s[base + 13], x: t[i * 10], y: t[i * 10 + 1], z: t[i * 10 + 2] };
        }
      }
    }
    return null;
  }

  function pickSettler(ray) {
    let best = null, bestPerpSq = 0.13 * 0.13;
    for (const view of app.world.query(["Settler", "Transform"])) {
      const s = view.arrays["Settler"], tr = view.arrays["Transform"];
      for (let i = 0; i < view.len; i++) {
        const px = tr[i * 10] - ray[0], py = tr[i * 10 + 1] - ray[1], pz = tr[i * 10 + 2] - ray[2];
        const along = px * ray[3] + py * ray[4] + pz * ray[5];
        if (along <= 0) continue;
        const perpSq = px * px + py * py + pz * pz - along * along;
        if (perpSq < bestPerpSq) { bestPerpSq = perpSq; best = s[i * SETTLER_STRIDE]; }
      }
    }
    return best;
  }

  window.addEventListener("click", (e) => {
    if (adminBrush !== null) return;
    if (dragDistance > 5) return;
    if (e.target.tagName !== "CANVAS") return;
    if (appState !== "sim") return;

    const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

    const ray = app.world.wasm.wasm_screen_to_ray(ndcX, ndcY);
    if (ray && ray.length === 6) {
      const settlerId = pickSettler(ray);
      if (settlerId !== null) {
        const settler = findSettlerById(settlerId);
        if (settler) {
          wasm_select_face(app.world.wasm, selectedFaceId, settler.face);
          selectedFaceId = settler.face;
          selectedSettlerId = settler.id;
          showSettlerUI(settler);
          return;
        }
      }
      const hit = app.world.wasm.wasm_raycast_3d(
        ray[0],
        ray[1],
        ray[2],
        ray[3],
        ray[4],
        ray[5],
      );
      if (hit && hit.length === 3) {
        const newFaceId = Math.floor(hit[2]);
        wasm_select_face(app.world.wasm, selectedFaceId, newFaceId);
        selectedFaceId = newFaceId;
        selectedSettlerId = null;
        updateTileUI(selectedFaceId);
      } else {
        clearSelection();
      }
    }
  });

  function showSettlerUI(onTile) {
    tileBox.style.display = "block";
    document.getElementById("tile-title").textContent = `Settler #${Math.round(onTile.id)}`;
    for (const row of tileBox.querySelectorAll(".d-grid > .d-row")) row.style.display = "none";
    const cityPanel = document.getElementById("city-panel");
    cityPanel.style.display = "block";
    document.getElementById("c-faction").textContent = Math.round(onTile.hunger) + "%";
    document.getElementById("c-tier").textContent = Math.round(onTile.thirst) + "%";
    document.getElementById("c-tribe").textContent = tribeName(onTile.tribe);
    document.getElementById("c-age").textContent = onTile.age.toFixed(1) + " years";
    document.getElementById("c-cooperation").textContent = Math.round(onTile.cooperation * 100) + "%";
    document.getElementById("c-aggression").textContent = Math.round(onTile.aggression * 100) + "%";
    document.getElementById("c-mobility").textContent = Math.round(onTile.mobility * 100) + "%";
    const trackBtn = document.getElementById("btn-track-settler");
    trackBtn.textContent = trackedSettlerId === onTile.id ? "Stop tracking" : "Track settler";
    trackBtn.onclick = () => {
      trackedSettlerId = trackedSettlerId === onTile.id ? null : onTile.id;
      trackBtn.textContent = trackedSettlerId === onTile.id ? "Stop tracking" : "Track settler";
      if (trackedSettlerId !== null) radiusTarget = Math.min(radiusTarget, 22.0);
    };
  }

  // Fields match wasm_get_face_info's layout (lib.rs): 0 is_water, 1 elev,
  // 2 temp, 3 moisture, 4 arability, 5 minerals, 6-7 legacy, 8 food_stock,
  // 9 food_cap, 10 drought, 11 population, 12 dominant_tribe.
  function updateTileUI(faceId) {
    if (faceId === -1) return;
    const info = wasm_get_face_info(app.world.wasm, faceId);
    if (!info || info.length < 13) return;

    tileBox.style.display = "block";
    document.getElementById("city-panel").style.display = "none";
    for (const row of tileBox.querySelectorAll(".d-grid > .d-row")) row.style.display = "flex";
    document.getElementById("tile-title").textContent = `Tile ${faceId}`;
    const isWater = info[0] === 1.0;
    document.getElementById("t-terrain").textContent = isWater ? "Water" : "Land";

    const foodRow = document.getElementById("t-food-row");
    const fertilityRow = document.getElementById("t-fertility-row");
    const droughtRow = document.getElementById("t-drought-row");
    if (!isWater) {
      foodRow.style.display = "flex";
      fertilityRow.style.display = "flex";
      droughtRow.style.display = "flex";
      document.getElementById("t-food").textContent =
        `${info[8].toFixed(0)} of ${info[9].toFixed(0)}`;
      document.getElementById("t-fertility").textContent =
        Math.round(info[4] * 100) + "%";
      const localDrought = Math.round(info[10] * 100);
      const activeDroughts = wasm_active_drought_count(app.world.wasm);
      document.getElementById("t-drought").textContent = localDrought > 0
        ? `${localDrought}%`
        : activeDroughts > 0 ? `${activeDroughts} elsewhere` : "None";
    } else {
      foodRow.style.display = "none";
      fertilityRow.style.display = "none";
      droughtRow.style.display = "none";
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
    speedVal.textContent = `${Math.round(simSpeed)}×`;
  };

  const listContainer = document.getElementById("colony-list");
  // Jump the camera to look straight down at a world-space point on the
  // planet's surface. The planet's own rotation is frozen once in "sim"
  // state (nothing writes planetTransform there), so a settlement's raw
  // translation can be used directly without correcting for planet spin.
  function flyCameraTo(x, y, z) {
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const dx = x / len, dy = y / len, dz = z / len;
    thetaTarget = Math.atan2(dx, dz);
    phiTarget = Math.asin(Math.max(-1, Math.min(1, dy)));
    radiusTarget = 22.0;
    isTransitioning = true;
    lastInputTime = performance.now(); // stop auto-rotate from immediately fighting the jump
  }
  let selectedTribeId = null;
  const LEADERBOARD_SIZE = 8;

  function tribeCssColor(hue) {
    const h = ((hue % 360) + 360) % 360 / 60;
    const x = 1 - Math.abs((h % 2) - 1);
    let r = 0, g = 0, b = 0;
    if (h < 1) [r, g] = [1, x];
    else if (h < 2) [r, g] = [x, 1];
    else if (h < 3) [g, b] = [1, x];
    else if (h < 4) [g, b] = [x, 1];
    else if (h < 5) [r, b] = [x, 1];
    else [r, b] = [1, x];
    return `rgb(${Math.round((0.3 + r * 0.7) * 255)}, ${Math.round((0.3 + g * 0.7) * 255)}, ${Math.round((0.3 + b * 0.7) * 255)})`;
  }

  function applyTribeHighlight() {
    const views = app.world.query(["Settler", "Transform", "StandardMaterial"]);
    for (const view of views) {
      const settlers = view.arrays["Settler"];
      const transforms = view.arrays["Transform"];
      const materials = view.arrays["StandardMaterial"];
      for (let i = 0; i < view.len; i++) {
        const selected = selectedTribeId !== null && settlers[i * SETTLER_STRIDE + 8] === selectedTribeId;
        const scale = selected ? 0.032 : 0.018;
        transforms[i * 10 + 7] = scale;
        transforms[i * 10 + 8] = scale;
        transforms[i * 10 + 9] = scale;
        materials[i * 12 + 4] = selected ? materials[i * 12] * 0.9 : 0;
        materials[i * 12 + 5] = selected ? materials[i * 12 + 1] * 0.9 : 0;
        materials[i * 12 + 6] = selected ? materials[i * 12 + 2] * 0.9 : 0;
      }
    }
    // Materials are intentionally cached across frames by Renderer3D. Direct
    // ECS writes therefore need an explicit invalidation; transforms upload
    // every frame, which was why size changed immediately but brightness
    // waited until the next birth/death structural change.
    app.renderer.renderer3D.markMaterialsDirty();
  }

  // Event delegation on the (stable) container, not per-row onclick handlers:
  // updateLeaderboard() used to replace the list's innerHTML on basically
  // every tick while the sim ran, which destroyed and recreated whatever row
  // elements a per-row onclick was attached to -- a click landing between two
  // renders would just miss (now throttled below, but delegation is still
  // the robust way to do this). The container itself is never replaced, so
  // one listener here survives forever, and re-deriving the fly-to target at
  // click time (instead of trusting position captured whenever the list last
  // rendered) flies to where it actually is right now.
  listContainer.addEventListener("click", (e) => {
    const item = e.target.closest("[data-fly-id]");
    if (!item) return;
    const tribeId = item.getAttribute("data-fly-tribe");
    const views = app.world.query(["Settler", "Transform"]);
    if (tribeId !== null) {
      const tid = parseFloat(tribeId);
      selectedTribeId = selectedTribeId === tid ? null : tid;
      for (const row of listContainer.querySelectorAll("[data-fly-tribe]")) {
        row.classList.toggle("tribe-selected", selectedTribeId !== null && parseFloat(row.dataset.flyTribe) === selectedTribeId);
      }
      applyTribeHighlight();
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const view of views) {
        const s = view.arrays["Settler"];
        const t = view.arrays["Transform"];
        for (let i = 0; i < view.len; i++) {
          if (s[i * SETTLER_STRIDE + 8] === tid) {
            sx += t[i * 10]; sy += t[i * 10 + 1]; sz += t[i * 10 + 2];
            n++;
          }
        }
      }
      if (n > 0) flyCameraTo(sx / n, sy / n, sz / n);
      return;
    }
    const id = parseInt(item.getAttribute("data-fly-id"), 10);
    for (const view of views) {
      const s = view.arrays["Settler"];
      const t = view.arrays["Transform"];
      for (let i = 0; i < view.len; i++) {
        if (Math.round(s[i * SETTLER_STRIDE]) === id) {
          flyCameraTo(t[i * 10], t[i * 10 + 1], t[i * 10 + 2]);
          return;
        }
      }
    }
  });

  // Pause rebuilding the list while the mouse is over it. Even throttled to
  // a few times a second, replacing innerHTML resets :hover state on
  // whatever the cursor is sitting on, which reads as the row "pulsing" or
  // "blinking" under the pointer. It's paused, not stopped -- values just
  // hold steady until you move away, then it catches back up immediately.
  let leaderboardHovered = false;
  listContainer.addEventListener("mouseenter", () => { leaderboardHovered = true; });
  listContainer.addEventListener("mouseleave", () => { leaderboardHovered = false; });

  function updateLeaderboard() {
    const views = app.world.query(["Settler"]);
    let alive = 0;
    const tribes = new Map();
    for (const view of views) {
      const arr = view.arrays["Settler"];
      alive += view.len;
      for (let i = 0; i < view.len; i++) {
        const base = i * SETTLER_STRIDE;
        const tribeId = arr[base + 8];
        let c = tribes.get(tribeId);
        if (!c) { c = { count: 0, hue: arr[base + 4] }; tribes.set(tribeId, c); }
        c.count++;
      }
    }

    const tribeRows = Array.from(tribes.entries())
      .map(([id, c]) => ({
        id,
        count: c.count,
        hue: c.hue,
      }))
      .sort((a, b) => b.count - a.count);

    let listHtml = "";
    for (const c of tribeRows.slice(0, LEADERBOARD_SIZE)) {
      listHtml += `
      <div class="colony-item${selectedTribeId === c.id ? " tribe-selected" : ""}" style="cursor: pointer" data-fly-id="t${c.id}" data-fly-tribe="${c.id}" title="Select and center this tribe">
        <span class="c-info"><span class="tribe-swatch" style="color:${tribeCssColor(c.hue)};background:${tribeCssColor(c.hue)}"></span><span class="c-name">${tribeName(c.id)}</span></span>
        <span class="c-pop">${fmt(c.count)}</span>
      </div>`;
    }

    listContainer.innerHTML = `
      <div class="colony-item"><span class="c-info"><span class="c-name">People</span></span><span class="c-pop">${fmt(alive)}</span></div>
      <div class="colony-item"><span class="c-info"><span class="c-name">Tribes</span></span><span class="c-pop">${tribeRows.length}</span></div>
      <div style="margin-top: 8px; font-size: 0.75rem; color: #888;">Largest tribes</div>
      ${listHtml}
    `;
    if (selectedTribeId !== null) applyTribeHighlight();
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      isTransitioning = false;
      clearSelection();
      adminBrush = null;
      isAdminPainting = false;
      clearAdminPreview();
      for (const button of document.querySelectorAll(".admin-tool")) button.classList.remove("active");
      adminStatus.textContent = "Choose a tool to change the world.";
    }
  });

  const adminStatus = document.getElementById("admin-status");
  const adminFood = document.getElementById("admin-food");
  adminFood.oninput = () => {
    const value = parseFloat(adminFood.value);
    document.getElementById("admin-food-value").textContent = value.toFixed(1) + "×";
    wasm_admin_set_food_regen(app.world.wasm, value);
    adminStatus.textContent = `Food growth is now ${value.toFixed(1)}×.`;
  };
  document.getElementById("admin-brush-size").oninput = (event) => {
    adminBrushRadius = Number(event.target.value);
    document.getElementById("admin-brush-value").textContent = `${adminBrushRadius + 1}`;
  };
  for (const button of document.querySelectorAll(".admin-tool")) {
    button.onclick = () => {
      const tool = Number(button.dataset.adminTool);
      clearAdminPreview();
      adminBrush = adminBrush === tool ? null : tool;
      clearSelection();
      for (const other of document.querySelectorAll(".admin-tool")) {
        other.classList.toggle("active", Number(other.dataset.adminTool) === adminBrush);
      }
      adminStatus.textContent = adminBrush === null
        ? "Choose a tool to change the world."
        : `${button.textContent.trim()} selected.`;
    };
  }
  document.getElementById("admin-clear-drought").onclick = () => {
    wasm_admin_clear_droughts(app.world.wasm);
    adminStatus.textContent = "Droughts cleared.";
    if (selectedFaceId >= 0 && selectedSettlerId === null) updateTileUI(selectedFaceId);
  };

  app.addSystem((world, dt) => {
    const cams = world.query(["Camera3D", "Transform"]);
    const planets = world.query(["PlanetSimulationState", "Transform"]);
    if (cams.length === 0 || cams[0].len === 0) return;
    if (planets.length === 0 || planets[0].len === 0) return;

    const cameraTransform = cams[0].arrays["Transform"];
    const planetTransform = planets[0].arrays["Transform"];

    if (appState === "setup") {
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
        planetTransform[3],
        planetTransform[4],
        planetTransform[5],
        planetTransform[6],
      ];
      let q_new = quatMultiply(dq, q_old);

      const len = Math.sqrt(
        q_new[0] * q_new[0] +
          q_new[1] * q_new[1] +
          q_new[2] * q_new[2] +
          q_new[3] * q_new[3],
      );
      planetTransform[3] = q_new[0] / len;
      planetTransform[4] = q_new[1] / len;
      planetTransform[5] = q_new[2] / len;
      planetTransform[6] = q_new[3] / len;

      cameraLookAtX += (6.5 - cameraLookAtX) * 0.025;
      cameraPositionZ += (36.0 - cameraPositionZ) * 0.025;

      cameraTransform[0] = 0.0;
      cameraTransform[1] = 0.0;
      cameraTransform[2] = cameraPositionZ;

      const theta_cam = -Math.atan2(cameraLookAtX, cameraPositionZ);
      cameraTransform[3] = 0.0;
      cameraTransform[4] = Math.sin(theta_cam * 0.5);
      cameraTransform[5] = 0.0;
      cameraTransform[6] = Math.cos(theta_cam * 0.5);
    } else if (appState === "sim") {
      // Continuous camera tracking: re-derive thetaTarget/phiTarget from the
      // tracked settler's LIVE position every frame (not just once, unlike
      // flyCameraTo elsewhere) and force the transition lerp on so it keeps
      // chasing a moving target instead of settling once and stopping.
      if (trackedSettlerId !== null) {
        const views = world.query(["Settler", "Transform"]);
        let found = false;
        for (const view of views) {
          const s = view.arrays["Settler"];
          const t = view.arrays["Transform"];
          for (let i = 0; i < view.len; i++) {
            if (s[i * SETTLER_STRIDE] === trackedSettlerId) {
              const x = t[i * 10], y = t[i * 10 + 1], z = t[i * 10 + 2];
              const len = Math.sqrt(x * x + y * y + z * z) || 1;
              thetaTarget = Math.atan2(x / len, z / len);
              phiTarget = Math.asin(Math.max(-1, Math.min(1, y / len)));
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          // Tracked settler died or despawned -- stop trying.
          trackedSettlerId = null;
        } else {
          isTransitioning = true;
        }
      }
      if (isTransitioning) {
        radius += (radiusTarget - radius) * 0.06;
        // thetaTarget (set by flyCameraTo/atan2) is always in [-PI, PI], but
        // `theta` itself accumulates unbounded from free dragging and
        // auto-rotate -- after spinning the camera around many times, the
        // raw difference could be thousands of degrees, so lerping toward it
        // directly span the camera all the way back around instead of the
        // short way. Wrap the delta to the shortest equivalent path first.
        let deltaTheta = thetaTarget - theta;
        deltaTheta = ((deltaTheta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        theta += deltaTheta * 0.06;
        phi += (phiTarget - phi) * 0.06;
        if (
          Math.abs(radius - radiusTarget) < 0.2 &&
          Math.abs(deltaTheta) < 0.01
        ) {
          isTransitioning = false;
        }
      } else {
        if (!isDragging) {
          theta += thetaVelocity;
          phi += phiVelocity;
          thetaVelocity *= damping;
          phiVelocity *= damping;
          if (performance.now() - lastInputTime > 5000 && !isPaused && adminBrush === null) {
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

      // Clamp elevation short of the poles -- past +-90 degrees the camera
      // flies "over the top", and since cos(phi) goes negative beyond that
      // point, it flips the sign of both x and z below, which reads as
      // horizontal drag suddenly reversing direction ("mouse inverted when
      // upside down"). Clamping keeps the camera the right way up always.
      const PHI_LIMIT = Math.PI / 2 - 0.01;
      phi = Math.max(-PHI_LIMIT, Math.min(PHI_LIMIT, phi));

      const x = radius * Math.cos(phi) * Math.sin(theta);
      const y = radius * Math.sin(phi);
      const z = radius * Math.cos(phi) * Math.cos(theta);

      cameraTransform[0] = x;
      cameraTransform[1] = y;
      cameraTransform[2] = z;

      const halfTheta = theta * 0.5;
      const halfPhi = -phi * 0.5;

      const s_x = Math.sin(halfPhi);
      const c_x = Math.cos(halfPhi);
      const s_y = Math.sin(halfTheta);
      const c_y = Math.cos(halfTheta);

      cameraTransform[3] = s_x * c_y;
      cameraTransform[4] = c_x * s_y;
      cameraTransform[5] = -s_x * s_y;
      cameraTransform[6] = c_x * c_y;
    }
  });

  let lastTime = performance.now();
  let lastLeaderboardUpdate = 0;
  let currentYear = 1;
  const SIM_SECONDS_PER_YEAR = 60;

  const loop = (t) => {
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;

    app.world.wasm.wasm_update_input(
      app.input.buffer,
      app.input.mouseX,
      app.input.mouseY,
      app.input.mouseDX,
      app.input.mouseDY,
      app.input.mouseWheelDelta,
      app.input.buttonsBuffer,
    );
    app.input.mouseDX = 0;
    app.input.mouseDY = 0;

    for (const sys of app.systems) {
      if (sys.type === "js") sys.fn(app.world, dt, app.input);
    }

    const stateProxy = uiBridge.getComponentProxy(
      planetEntityId,
      "PlanetSimulationState",
    );
    if (stateProxy && stateProxy.run_simulation > 0.0 && !isPaused) {
      // Systems are dt-scaled, so speed is simulated time, not a reason to
      // repeat the entire ECS schedule N times. Civ movement targets one
      // adjacent face at a time, so one-second fast-forward substeps remain
      // stable while avoiding the 50 serial ticks/frame that caused the
      // 125ms WASM time at 50x.
      const frameSimSeconds = dt * simSpeed;
      let simulatedDt = frameSimSeconds;
      if (simulatedDt > 0) {
        while (simulatedDt > 0) {
          const stepDt = Math.min(simulatedDt, 1.0);
          app.world.wasm.tick(stepDt);
          simulatedDt -= stepDt;
        }
        currentYear += frameSimSeconds / SIM_SECONDS_PER_YEAR;
        document.getElementById("year-display").textContent =
          `Year ${Math.floor(currentYear)}`;
        // Throttled: rebuilding/re-sorting the list on every tick (which at
        // 1x is basically every frame) replaces its DOM nodes 60+ times a
        // second. That's what made it flicker through tied-value settlers
        // (each rebuild re-sorts from whatever order the ECS query returned
        // this time, so ties visibly reshuffle) and made it unclickable (a
        // click can easily land between two rebuilds and miss). A few times
        // a second is still plenty responsive for a leaderboard.
        if (t - lastLeaderboardUpdate > 400 && !leaderboardHovered) {
          lastLeaderboardUpdate = t;
          updateLeaderboard();
        }
        if (selectedSettlerId !== null) {
          const selected = findSettlerById(selectedSettlerId);
          if (selected) showSettlerUI(selected); else clearSelection();
        } else if (selectedFaceId !== -1) {
          updateTileUI(selectedFaceId);
        }
      } else {
        // Keep transform propagation alive at 0x so orbit/zoom still render.
        app.world.wasm.tick(0.0);
      }
    } else {
      // A zero-delta ECS pass propagates camera transforms and input without
      // advancing settlers/resources. This makes both Pause and 0x genuinely
      // frozen while the user can still orbit and zoom the planet.
      app.world.wasm.tick(0.0);
    }

    // Mesh GPU-buffer sync happens automatically inside render3D() via the
    // engine's own renderer.meshSyncer (packages/artisan-js/MeshSyncer.js),
    // which updates an existing buffer in place (or grows/destroys+recreates
    // only when it must) instead of leaking a fresh GPU buffer on every
    // change -- this demo used to hand-roll its own version-check-and-
    // reregister loop here that called assets.createMesh() unconditionally
    // on every vertex/color change and never freed the previous buffer.
    // With the periodic per-tile color repaint (sys_tick_face_color)
    // bumping color_version regularly, that leaked a full ~12MB planet mesh
    // buffer every repaint -- the "Not enough memory left" / "Buffer is
    // invalid" WebGPU errors reported 2026-08-01, worse at higher sim speeds
    // since repaints then land more often per real second.

    // Presentation-only systems (settler marker placement) run once here per
    // drawn frame, not once per simulation tick -- see
    // App::add_render_system in the engine. This is what keeps render-prep
    // cost tied to frame rate instead of to the speed multiplier.
    app.world.wasm.render_tick();

    app.renderer.render3D(app.world);

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

start();
