// src/hooks/useSceneControls.ts
export const useSceneControls = () => {
    return {
        waterLevel: 0.1,
        fogEnabled: true,
        fogColor: "#23859e",
        fogNear: 10,
        fogFar: 500,
        aoEnabled: true,
        shadowBias: -0.0004,
        normalBias: 0.02,
    };
};