import * as THREE from 'three';

export interface IUniform<T> {
    value: T;
}

export type AllWaterUniforms = {
    // From Leva controls
    uWaveSteepness: IUniform<number>;
    uWaveLength: IUniform<number>;
    uWaveSpeed: IUniform<number>;
    uWaveDirection: IUniform<THREE.Vector3>;
    uWaterShallowColor: IUniform<THREE.Color>;
    uWaterDeepColor: IUniform<THREE.Color>;
    uWaterDepth: IUniform<number>;
    uWaveCrestStart: IUniform<number>; // Replaced uWaveFalloff
    uWaveCrestEnd: IUniform<number>;   // Replaced uWaveFalloff
    uWaveCrestColor: IUniform<THREE.Color>;
    uFoamColor: IUniform<THREE.Color>;
    uFoamSpeed: IUniform<number>;
    uFoamTiling: IUniform<number>;
    uFoamDistortion: IUniform<number>;
    // Static uniforms
    uPlaneSize: IUniform<number>;
    uFbmSpeed: IUniform<number>;
    uReflectionStrength: IUniform<number>;
    uReflectionMix: IUniform<number>;
    uReflectionFresnelPower: IUniform<number>;
    uHorizonColor: IUniform<THREE.Color>;
    uHorizonDistance: IUniform<number>;
    uFoamAlpha: IUniform<number>;
    uFoamBlend: IUniform<number>;
    uNormalsScale: IUniform<number>;
    uNormalsSpeed: IUniform<number>;
    uNormalsStrength: IUniform<number>;
    uFoamIntersectionFade: IUniform<number>;
    uFoamIntersectionCutoff: IUniform<number>;
    uFogNear: IUniform<number>;
    uFogFar: IUniform<number>;
    // From planar reflections
    uReflectionEnabled: IUniform<boolean>;
    uReflectedTexture: IUniform<THREE.Texture | null>;
    uReflectionTextureMatrix: IUniform<THREE.Matrix4>;
    // From water component
    uDepthTexture: IUniform<THREE.DepthTexture | null>;
    uCameraNearFar: IUniform<THREE.Vector2>;
    uResolution: IUniform<THREE.Vector2>;
    uTime: IUniform<number>;
    uFoamTexture: IUniform<THREE.Texture | null>;
    uNormalsTexture: IUniform<THREE.Texture | null>;
};

export type PartialWaterUniforms = Pick<
    AllWaterUniforms,
    | 'uWaveSteepness'
    | 'uWaveLength'
    | 'uWaveSpeed'
    | 'uWaveDirection'
    | 'uFbmSpeed'
>;

// Type definition for a single duck's state
export type DuckData = {
    id: number;
    position: THREE.Vector3;
    status: 'IDLE' | 'FOLLOWING';
    followIndex: number | null;
};