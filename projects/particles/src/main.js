import * as THREE from "three";
import { setupScene } from "./setup.js";
import { loadModel } from "./loader.js";
import { addAnimations } from "./animation.js";
import { setupScrollTrigger } from "./scrolltrigger.js";
import { setupLenis } from "./lenis.js";

const {
  scene,
  camera,
  renderer,
  controls,
  composer,
  particleSystem,
  backgroundCloud,
  backgroundGeometry,
  backgroundPositions,
  backgroundVelocities,
  maxBackgroundOffset,
  numBackgroundParticles,
} = setupScene();

setupLenis();

async function main() {
  const { particleSystem: particleSystem1 } = await loadModel(
    scene,
    "assets/models/obj.glb",
    5.1,
    0
  );
  const { particleSystem: particleSystem2 } = await loadModel(
    scene,
    "assets/models/controller.glb",
    2.9,
    0.4
  );
  const { particleSystem: particleSystem3 } = await loadModel(
    scene,
    "assets/models/gameboy.glb",
    0.3,
    0
  );
  const { particleSystem: particleSystem4 } = await loadModel(
    scene,
    "assets/models/controller.glb",
    -2.9,
    -0.7
  );
  const { particleSystem: particleSystem5 } = await loadModel(
    scene,
    "assets/models/gameboy.glb",
    -2.2,
    0.5
  );
  const { particleSystem: particleSystem6 } = await loadModel(
    scene,
    "assets/models/soon.glb",
    -4,
    0
  );

  const idleAnimation = addAnimations([
    particleSystem1,
    particleSystem2,
    particleSystem3,
    particleSystem4,
    particleSystem5,
    particleSystem6,
  ]);

  setupScrollTrigger(particleSystem1, "0px 40%", "1000px 40%");
  setupScrollTrigger(particleSystem2, "800px 40%", "1800px 40%");
  setupScrollTrigger(particleSystem3, "2000px 40%", "3000px 40%");
  setupScrollTrigger(particleSystem4, "3150px 40%", "4150px 40%");
  setupScrollTrigger(particleSystem5, "3000px 40%", "4000px 40%");
  setupScrollTrigger(particleSystem6, "4100px 40%", "5100px 40%");

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener("mousemove", (event) => {
    mouseX = (event.clientX / window.innerWidth) * 20 - 1;
    mouseY = (event.clientY / window.innerHeight) * 26 + 1;
  });

  function animateScene() {
    function animate() {
      requestAnimationFrame(animate);

      const time = performance.now() * 0.001;
      idleAnimation(time);

      const mouseRotationX = mouseY * 0.1;
      const mouseRotationY = mouseX * 0.1;

      [
        particleSystem1,
        particleSystem2,
        particleSystem3,
        particleSystem4,
        particleSystem5,
        particleSystem6,
      ].forEach((particleSystem) => {
        particleSystem.rotation.x +=
          (mouseRotationX - particleSystem.rotation.x) * 0.05;
        particleSystem.rotation.y +=
          (mouseRotationY - particleSystem.rotation.y) * 0.05;
      });

      for (let i = 0; i < numBackgroundParticles; i++) {
        backgroundPositions[i * 3] += backgroundVelocities[i * 3];
        backgroundPositions[i * 3 + 1] += backgroundVelocities[i * 3 + 1];
        backgroundPositions[i * 3 + 2] += backgroundVelocities[i * 3 + 2];

        if (Math.abs(backgroundPositions[i * 3]) > maxBackgroundOffset) {
          backgroundVelocities[i * 3] *= -1;
        }
        if (Math.abs(backgroundPositions[i * 3 + 1]) > maxBackgroundOffset) {
          backgroundVelocities[i * 3 + 1] *= -1;
        }
        if (Math.abs(backgroundPositions[i * 3 + 2]) > maxBackgroundOffset) {
          backgroundVelocities[i * 3 + 2] *= -1;
        }
      }

      backgroundGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(backgroundPositions, 3)
      );
      backgroundGeometry.attributes.position.needsUpdate = true;

      composer.render();
      controls.update();
    }

    animate();
  }

  animateScene();
}

main();
