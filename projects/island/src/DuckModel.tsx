import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { asset } from "./utils/assetUrl"; // Import the helper

const duckUrl = asset("duck.glb"); // Define the URL outside the component

type DuckModelProps = React.JSX.IntrinsicElements["group"];

export function DuckModel(props: DuckModelProps) {
    const { scene } = useGLTF(duckUrl); // Use the correct URL

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

useGLTF.preload(duckUrl); // Preload with the correct URL