import * as THREE from "three";

export class Planet {
  constructor(vertices, indices) {
    this.geometry = new THREE.BufferGeometry();
    this.updateGeometry(vertices, indices);

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");

    const spriteGradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    spriteGradient.addColorStop(0.44, "rgba(0, 30, 80, 0.0)");
    spriteGradient.addColorStop(0.47, "rgba(40, 100, 255, 0.28)");
    spriteGradient.addColorStop(0.55, "rgba(20, 50, 180, 0.12)");
    spriteGradient.addColorStop(0.7, "rgba(5, 10, 40, 0.002)");
    spriteGradient.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
    context.fillStyle = spriteGradient;
    context.fillRect(0, 0, 128, 128);

    const spriteMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.glowSprite = new THREE.Sprite(spriteMat);
    this.glowSprite.scale.set(43, 43, 1);
    this.mesh.add(this.glowSprite);

    const innerGeo = new THREE.IcosahedronGeometry(10.05, 16);

    const innerMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vPosition = mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float dotNV = dot(vNormal, viewDir);
          float fresnel = pow(1.0 - max(0.0, dotNV), 2.5);
          gl_FragColor = vec4(0.1, 0.6, 0.9, fresnel * 0.75);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.innerGlowMesh = new THREE.Mesh(innerGeo, innerMat);
    this.mesh.add(this.innerGlowMesh);
  }

  updateGeometry(vertices, indices) {
    const posArray = new Float32Array(indices.length * 3);
    const normArray = new Float32Array(indices.length * 3);
    const colorArray = new Float32Array(indices.length * 3);

    for (let idx = 0; idx < indices.length; idx++) {
      const v_idx = indices[idx] * 12;
      posArray[idx * 3] = vertices[v_idx];
      posArray[idx * 3 + 1] = vertices[v_idx + 1];
      posArray[idx * 3 + 2] = vertices[v_idx + 2];

      normArray[idx * 3] = vertices[v_idx + 3];
      normArray[idx * 3 + 1] = vertices[v_idx + 4];
      normArray[idx * 3 + 2] = vertices[v_idx + 5];

      colorArray[idx * 3] = vertices[v_idx + 8];
      colorArray[idx * 3 + 1] = vertices[v_idx + 9];
      colorArray[idx * 3 + 2] = vertices[v_idx + 10];
    }

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(posArray, 3),
    );
    this.geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(normArray, 3),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colorArray, 3),
    );

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
