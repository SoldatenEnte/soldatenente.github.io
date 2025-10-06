import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { BokehPass } from "jsm/postprocessing/BokehPass.js";

const particleTexture = new THREE.TextureLoader().load(
  "assets/images/white_circle.png"
);

export function setupScene() {
  const w = window.innerWidth;
  const h = 6 * window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("threejs-canvas"),
  });
  renderer.setSize(w, h);
  document.body.appendChild(renderer.domElement);

  const fov = 38;
  const aspect = w / h;
  const near = 0.01;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x160211);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableRotate = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bokehPass = new BokehPass(scene, camera, {
    focus: 2.55,
    aperture: 0.025,
    maxblur: 0.01,
  });
  composer.addPass(bokehPass);

  const backgroundMaterial = new THREE.PointsMaterial({
    map: particleTexture,
    size: 0.03,
    color: 0xee33ee,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    alphaTest: 0.1,
  });

  const backgroundGeometry = new THREE.BufferGeometry();

  const numBackgroundParticles = 10000;
  const backgroundPositions = new Float32Array(numBackgroundParticles * 3);
  const backgroundVelocities = new Float32Array(numBackgroundParticles * 3);

  const maxBackgroundOffset = 4;

  for (let i = 0; i < numBackgroundParticles; i++) {
    const phi = Math.acos(Math.random() * 2 - 1);
    const theta = Math.PI * 2 * Math.random();

    const offsetX =
      Math.random() * maxBackgroundOffset * (Math.random() < 0.5 ? -1 : 1);
    const offsetY =
      Math.random() * maxBackgroundOffset * (Math.random() < 0.5 ? -1 : 1);
    const offsetZ =
      Math.random() * maxBackgroundOffset * (Math.random() < 0.5 ? -1 : 1);

    const x = Math.sin(phi) * Math.cos(theta) + offsetX;
    const y = Math.sin(phi) * Math.sin(theta) + offsetY;
    const z = Math.cos(phi) + offsetZ;

    backgroundPositions[i * 3] = x;
    backgroundPositions[i * 3 + 1] = y;
    backgroundPositions[i * 3 + 2] = z;

    backgroundVelocities[i * 3] = Math.random() * 0.001 - 0.0005;
    backgroundVelocities[i * 3 + 1] = Math.random() * 0.001 - 0.0005;
    backgroundVelocities[i * 3 + 2] = Math.random() * 0.001 - 0.0005;
  }

  backgroundGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(backgroundPositions, 3)
  );

  const backgroundCloud = new THREE.Points(
    backgroundGeometry,
    backgroundMaterial
  );
  scene.add(backgroundCloud);

  return {
    scene,
    camera,
    renderer,
    controls,
    composer,
    particleSystem: null,
    backgroundCloud,
    backgroundGeometry,
    backgroundPositions,
    backgroundVelocities,
    maxBackgroundOffset,
    numBackgroundParticles,
  };
}

export function createParticle() {
  const material = new THREE.SpriteMaterial({
    map: particleTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    alphaTest: 0.5,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.05, 0.05, 1);
  return sprite;
}
