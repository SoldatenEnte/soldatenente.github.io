import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, forwardRef } from "react";
import * as THREE from "three";
import { asset } from "./utils/assetUrl"; // Import the helper

const islandUrl = asset("island.glb"); // Define the URL outside the component

type IslandModelProps = React.JSX.IntrinsicElements['group'] & { shadows?: boolean };

export const IslandModel = forwardRef<THREE.Group, IslandModelProps>(
  ({ shadows = true, ...props }, ref) => {
    const { scene } = useGLTF(islandUrl); // Use the correct URL

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
useGLTF.preload(islandUrl); // Preload with the correct URL