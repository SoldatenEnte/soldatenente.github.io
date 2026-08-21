import * as THREE from "three";

class Lcg {
  constructor(seed) {
    this.seed = seed;
  }
  next_f32() {
    this.seed = (Math.imul(this.seed, 1103515245) + 12345) & 0x7fffffff;
    return this.seed / 2147483648.0;
  }
}

export class Stars {
  constructor() {
    this.instance = new THREE.Group();
    this.layers = [];

    const starCvs = document.createElement("canvas");
    starCvs.width = 64;
    starCvs.height = 64;
    const sctx = starCvs.getContext("2d");
    const sgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sgrad.addColorStop(0, "rgba(255, 255, 255, 1)");
    sgrad.addColorStop(0.1, "rgba(255, 255, 255, 0.9)");
    sgrad.addColorStop(0.3, "rgba(255, 255, 255, 0.4)");
    sgrad.addColorStop(0.6, "rgba(255, 255, 255, 0.1)");
    sgrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 64, 64);
    const starTex = new THREE.CanvasTexture(starCvs);

    const nebulaCvs = document.createElement("canvas");
    nebulaCvs.width = 64;
    nebulaCvs.height = 64;
    const nctx = nebulaCvs.getContext("2d");
    const ngrad = nctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    ngrad.addColorStop(0, "rgba(255, 255, 255, 1)");
    ngrad.addColorStop(0.4, "rgba(255, 255, 255, 0.3)");
    ngrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    nctx.fillStyle = ngrad;
    nctx.fillRect(0, 0, 64, 64);
    const nebulaTex = new THREE.CanvasTexture(nebulaCvs);

    const rng = new Lcg(54321);

    const createStarLayer = (count, size, colorHex, opacity, radiusRange) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const baseColor = new THREE.Color(colorHex);

      for (let i = 0; i < count; i++) {
        const r =
          radiusRange[0] + rng.next_f32() * (radiusRange[1] - radiusRange[0]);
        const theta = rng.next_f32() * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * rng.next_f32() - 1.0);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        const lerp_t = rng.next_f32() * 0.4;
        const c = baseColor.clone().lerp(new THREE.Color(0xffffff), lerp_t);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }

      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: starTex,
      });

      const points = new THREE.Points(geo, mat);
      this.layers.push(points);
      this.instance.add(points);
    };

    const ringGeo = new THREE.BufferGeometry();
    const ringCount = 2000;
    const rPos = new Float32Array(ringCount * 3);
    const rCol = new Float32Array(ringCount * 3);
    const ringColor = new THREE.Color(0xffffff);

    for (let i = 0; i < ringCount; i++) {
      const r = 400 + rng.next_f32() * 400;
      const theta = rng.next_f32() * 2.0 * Math.PI;
      const thickness = (rng.next_f32() - 0.5) * 160;

      rPos[i * 3] = r * Math.cos(theta);
      rPos[i * 3 + 1] = thickness;
      rPos[i * 3 + 2] = r * Math.sin(theta);

      const c = ringColor
        .clone()
        .lerp(new THREE.Color(0xaaccff), rng.next_f32() * 0.2);
      rCol[i * 3] = c.r;
      rCol[i * 3 + 1] = c.g;
      rCol[i * 3 + 2] = c.b;
    }

    ringGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
    ringGeo.setAttribute("color", new THREE.BufferAttribute(rCol, 3));

    this.galaxyRing = new THREE.Points(
      ringGeo,
      new THREE.PointsMaterial({
        size: 8.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        map: starTex,
        depthWrite: false,
      }),
    );

    this.galaxyRing.rotation.x = Math.PI * 0.18;
    this.galaxyRing.rotation.z = Math.PI * 0.08;

    this.instance.add(this.galaxyRing);

    createStarLayer(3500, 2.0, 0xffffff, 0.65, [400, 1800]);
    createStarLayer(2000, 3.8, 0xaaccff, 0.75, [350, 1400]);
    createStarLayer(1000, 6.0, 0xffeedd, 0.6, [300, 1100]);
    createStarLayer(200, 11.0, 0xffffff, 0.95, [300, 900]);

    this.nebulaGroups = [];

    const addNebulaCloud = (count, size, colorHex, opacity, rx, ry, rz) => {
      const group = new THREE.Group();
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const baseColor = new THREE.Color(colorHex);

      for (let i = 0; i < count; i++) {
        const r = 350 + rng.next_f32() * 700;
        const theta = rng.next_f32() * Math.PI * 2;
        const phi = Math.acos(2 * rng.next_f32() - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        const lerp_t = rng.next_f32() * 0.1;
        const c = baseColor.clone().lerp(new THREE.Color(0x000210), lerp_t);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }

      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: nebulaTex,
      });

      const points = new THREE.Points(geo, mat);
      group.add(points);
      group.rotation.set(rx, ry, rz);
      this.nebulaGroups.push(group);
      this.instance.add(group);
    };

    addNebulaCloud(1000, 350, 0x051a4a, 0.045, 0.0, 0.0, 0.0);
    addNebulaCloud(700, 500, 0x1a054a, 0.035, 0.4, 1.2, 0.3);
    addNebulaCloud(500, 420, 0x054a32, 0.024, -0.3, -1.0, 0.8);
    addNebulaCloud(350, 600, 0x4a2a05, 0.018, 1.1, 0.2, -0.5);
  }

  update(dt) {
    this.instance.rotation.y += 0.0012 * dt;
    this.layers.forEach((l, i) => {
      l.rotation.y += 0.00024 * (i + 1) * dt;
    });
    if (this.galaxyRing) {
      this.galaxyRing.rotation.y += 0.0009 * dt;
    }
    this.nebulaGroups.forEach((group, i) => {
      group.rotation.y -= 0.000003 * (i + 1) * dt;
      group.rotation.z += 0.000001 * (i + 1) * dt;
    });
  }
}
