// src/hooks/useWaterControls.ts
import * as THREE from "three";
import { AllWaterUniforms, IUniform } from "../types.ts";

export const useWaterControls = () => {
    // Hardcoded values that were previously in Leva
    const waterControls = {
        uWaveSteepness: 0.1,
        uWaveLength: 40,
        uWaveSpeed: 5,
        uWaveDirection: [45.0, 0, 0],
        uWaterShallowColor: "#b9e4ef",
        uWaterDeepColor: "#023b3d",
        uWaterDepth: 1.2,
        uWaveCrestStart: 0,
        uWaveCrestEnd: 2,
        uWaveCrestColor: "#59bcd5",
        uFoamColor: "#ffffff",
        uFoamSpeed: 0.1,
        uFoamTiling: 4.8,
        uFoamDistortion: 1.41,
    };

    const uniforms: { [key: string]: IUniform<any> } = {};
    for (const [key, value] of Object.entries(waterControls)) {
        uniforms[key] = {
            value: key.toLowerCase().includes("color")
                ? new THREE.Color(value as string)
                : key === "uWaveDirection"
                    ? new THREE.Vector3(...(value as [number, number, number]))
                    : value,
        };
    }

    // Add static uniforms
    uniforms.uPlaneSize = { value: 2000.0 };
    uniforms.uFbmSpeed = { value: 0.01 };
    uniforms.uReflectionStrength = { value: 0.3 };
    uniforms.uReflectionMix = { value: 0.5 };
    uniforms.uReflectionFresnelPower = { value: 5.0 };
    uniforms.uHorizonColor = { value: new THREE.Color("#abeaff") };
    uniforms.uHorizonDistance = { value: 6.0 };
    uniforms.uFoamAlpha = { value: 1 };
    uniforms.uFoamBlend = { value: 1 };
    uniforms.uNormalsScale = { value: 1.2 };
    uniforms.uNormalsSpeed = { value: 0.1 };
    uniforms.uNormalsStrength = { value: 1.4 };
    uniforms.uFoamIntersectionFade = { value: 1.8 };
    uniforms.uFoamIntersectionCutoff = { value: 0.8 };
    uniforms.uFogNear = { value: 0.0 };
    uniforms.uFogFar = { value: 0.0 };

    const waterUniforms = uniforms as AllWaterUniforms;

    return { waterUniforms };
};