import * as THREE from "three";
import * as React from "react";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree, RootState } from "@react-three/fiber";
import CSM from "three-custom-shader-material";
import { patchShaders } from "gl-noise/build/glNoise.m";

import HSVLerp from "./HSVLerp.ts";
import Fresnel from "./Fresnel.ts";
import DistortUv from "./DistortUv.ts";
import Blend from "./Blend.ts";
import { usePlanarReflections } from "./usePlanarReflections.ts";
import { AllWaterUniforms } from "../../types.ts";
import { asset } from "../../utils/assetUrl.ts"; // Import the helper

import vertexShader from "./water.vert?raw";
import fragmentShader from "./water.frag?raw";

type WaterProps = React.JSX.IntrinsicElements['group'] & {
  waterUniforms: Omit<
    AllWaterUniforms,
    | "uReflectionEnabled" | "uReflectedTexture" | "uReflectionTextureMatrix" | "uDepthTexture"
    | "uCameraNearFar" | "uResolution" | "uTime" | "uFoamTexture" | "uNormalsTexture"
  >;
  fogColor: string;
  fogNear: number;
  fogFar: number;
};

const finalFragmentShader = fragmentShader
  .replace("#include <hsv_lerp>", HSVLerp)
  .replace("#include <fresnel>", Fresnel)
  .replace("#include <distort_uv>", DistortUv)
  .replace("#include <blend>", Blend);

export function Water({ waterUniforms, fogColor, fogNear, fogFar, ...props }: WaterProps) {
  const waterRef = React.useRef<THREE.Mesh>(null);
  const { size, viewport, scene, gl, camera } = useThree();

  const depthFBO = React.useMemo(() => {
    const w = size.width * viewport.dpr;
    const h = size.height * viewport.dpr;
    const target = new THREE.WebGLRenderTarget(w, h);
    target.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
    return target;
  }, [size, viewport]);

  const hasReflection = true;

  // FIX: Use the asset helper for texture paths
  const [foamTexture, normalsTexture] = useTexture([asset("foam.png"), asset("normal.jpg")]);
  const planarReflections = usePlanarReflections(waterRef, hasReflection);

  const uniforms = React.useMemo(
    () => ({
      ...waterUniforms,
      ...planarReflections.uniforms,
      uDepthTexture: { value: depthFBO.depthTexture },
      uCameraNearFar: { value: new THREE.Vector2() },
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uFoamTexture: { value: foamTexture },
      uNormalsTexture: { value: normalsTexture },
    }),
    [depthFBO, foamTexture, normalsTexture, planarReflections, waterUniforms]
  );

  React.useEffect(() => {
    uniforms.uHorizonColor.value.set(fogColor);
    uniforms.uFogNear.value = fogNear;
    uniforms.uFogFar.value = fogFar;
  }, [fogColor, fogNear, fogFar, uniforms]);

  useFrame((state: RootState) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uCameraNearFar.value.x = camera.near;
    uniforms.uCameraNearFar.value.y = camera.far;
    uniforms.uResolution.value.x = size.width * viewport.dpr;
    uniforms.uResolution.value.y = size.height * viewport.dpr;

    if (waterRef.current) waterRef.current.visible = false;
    gl.setRenderTarget(depthFBO);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    if (waterRef.current) waterRef.current.visible = true;

    planarReflections.render(state);
  });

  return (
    <group {...props}>
      <mesh receiveShadow rotation-x={-Math.PI / 2} ref={waterRef} renderOrder={1}>
        <planeGeometry args={[2000, 2000, 256, 256]} />
        <CSM
          baseMaterial={THREE.MeshStandardMaterial}
          key={vertexShader + finalFragmentShader}
          uniforms={uniforms}
          vertexShader={patchShaders(vertexShader)}
          fragmentShader={patchShaders(finalFragmentShader)}
          patchMap={{
            csm_FragNormal: {
              "#include <normal_fragment_maps>": `normal = csm_FragNormal;`,
            },
          }}
          roughness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}