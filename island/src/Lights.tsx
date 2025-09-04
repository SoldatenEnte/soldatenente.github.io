import React from "react";
import * as THREE from "three";

type LightsProps = {
  shadowBias: number;
  normalBias: number;
};

export const Lights = React.memo(React.forwardRef<THREE.DirectionalLight, LightsProps>(
  ({ shadowBias, normalBias }, ref) => {
    return (
      <>
        <hemisphereLight intensity={2.0} color="white" groundColor="#8d8d8d" />
        <directionalLight
          ref={ref}
          color="orange"
          intensity={7.5}
          position={[-30, 40, -30]}
          castShadow
          // FIX: Revert to original shadow map size to restore PC performance
          shadow-mapSize={4096}
          shadow-bias={shadowBias}
          shadow-normalBias={normalBias}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-100, 100, 100, -100, 1, 100]}
          />
        </directionalLight>
      </>
    );
  }
));

Lights.displayName = "Lights";