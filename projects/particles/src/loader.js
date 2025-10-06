import * as THREE from "three";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { createParticle } from "./setup.js";

function centerGeometry(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

export async function loadModel(scene, modelPath, positionY, positionX) {
  const loader = new GLTFLoader();
  return new Promise((resolve) => {
    loader.load(modelPath, (gltf) => {
      const obj = gltf.scene;

      centerGeometry(obj);

      const box = new THREE.Box3().setFromObject(obj);
      const objectHeight = box.max.y - box.min.y;

      const positions = [];
      const initialPositions = [];
      const offsets = [];
      const scrollOffsets = [];
      const colors = [];

      obj.traverse((child) => {
        if (child.isMesh) {
          child.material.transparent = true;
          child.material.opacity = 0;
          child.material.depthTest = false;

          const geometry = child.geometry;
          const positionAttribute = geometry.attributes.position;

          for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positionAttribute, i);

            positions.push(vertex.x, vertex.y, vertex.z);
            initialPositions.push(vertex.x, vertex.y, vertex.z);

            const maxOffset = 0.03;
            offsets.push(
              Math.random() * maxOffset * (Math.random() < 0.5 ? -1 : 1),
              Math.random() * maxOffset * (Math.random() < 0.5 ? -1 : 1),
              Math.random() * maxOffset * (Math.random() < 0.5 ? -1 : 1)
            );

            scrollOffsets.push(0, 0, 0);

            const color = new THREE.Color(1, 0, 1);
            color.lerp(new THREE.Color(0, 0, 1), vertex.y / objectHeight);

            colors.push(color.r, color.g, color.b);

            const particle = createParticle();
            particle.position.copy(vertex);
            obj.add(particle);
          }
        }
      });

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      particleGeometry.setAttribute(
        "initialPosition",
        new THREE.Float32BufferAttribute(initialPositions, 3)
      );
      particleGeometry.setAttribute(
        "offset",
        new THREE.Float32BufferAttribute(offsets, 3)
      );
      particleGeometry.setAttribute(
        "scrollOffset",
        new THREE.Float32BufferAttribute(scrollOffsets, 3)
      );
      particleGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );

      const particleMaterial = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        map: new THREE.TextureLoader().load("assets/images/white_circle.png"),
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.302,
        depthTest: true,
        depthWrite: false,
        alphaTest: 0.3,
      });

      const particleSystem = new THREE.Points(
        particleGeometry,
        particleMaterial
      );
      particleSystem.position.y += positionY;
      particleSystem.position.x += positionX;
      scene.add(particleSystem);

      resolve({ particleSystem, offsets });
    });
  });
}
