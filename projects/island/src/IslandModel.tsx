import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, forwardRef } from "react";
import * as THREE from "three";

type IslandModelProps = React.JSX.IntrinsicElements['group'] & {
  shadows?: boolean;
  modelUrl: string;
};

export const IslandModel = forwardRef<THREE.Group, IslandModelProps>(
  ({ shadows = true, modelUrl, ...props }, ref) => {
    const { scene } = useGLTF(modelUrl);

    useLayoutEffect(() => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = shadows;
          child.receiveShadow = shadows;
        }
      });
    }, [scene, shadows]);

    return <primitive object={scene.clone()} ref={ref} {...props} />;
  }
);

IslandModel.displayName = "IslandModel";