import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { asset } from "./utils/assetUrl"; // Import the helper

const shipUrl = asset("ship.glb"); // Define the URL outside the component

type ShipModelProps = React.JSX.IntrinsicElements["group"];

export function ShipModel(props: ShipModelProps) {
  const { scene } = useGLTF(shipUrl); // Use the correct URL

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene.clone()} {...props} />;
}

useGLTF.preload(shipUrl); // Preload with the correct URL