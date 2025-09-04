import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MAP_PIXELS_PER_UNIT, MINIMAP_PIXELS_PER_UNIT } from "../config/constants";
import { isMobile } from "../utils/isMobile";

type UIControllerProps = {
    shipRef: React.RefObject<THREE.Group | null>;
    minimapRotatorRef: React.RefObject<HTMLDivElement | null>;
    minimapTranslatorRef: React.RefObject<HTMLDivElement | null>;
    mapPlayerIconRef: React.RefObject<HTMLDivElement | null>;
    mapImageContainerRef: React.RefObject<HTMLDivElement | null>;
};

const euler = new THREE.Euler();

export function UIController({
    shipRef,
    minimapRotatorRef,
    minimapTranslatorRef,
    mapPlayerIconRef,
    mapImageContainerRef
}: UIControllerProps) {
    useFrame(() => {
        if (!shipRef?.current) return;

        const shipPosition = shipRef.current.position;
        euler.setFromQuaternion(shipRef.current.quaternion, 'YXZ');
        const rotation = euler.y;

        // Minimap logic (no change)
        if (minimapRotatorRef.current && minimapTranslatorRef.current) {
            const translateX = -shipPosition.x * MINIMAP_PIXELS_PER_UNIT;
            const translateY = -shipPosition.z * MINIMAP_PIXELS_PER_UNIT;
            minimapRotatorRef.current.style.transform = `rotate(${rotation}rad)`;
            minimapTranslatorRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
        }

        // --- FIX for Full Map ---
        if (isMobile) {
            // Mobile behavior: Player is centered, map moves
            if (mapImageContainerRef.current) {
                const translateX = -shipPosition.x * MAP_PIXELS_PER_UNIT;
                const translateY = -shipPosition.z * MAP_PIXELS_PER_UNIT;
                mapImageContainerRef.current.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`;
            }
            if (mapPlayerIconRef.current) {
                mapPlayerIconRef.current.style.transform = `translate(-50%, -50%) rotate(${-rotation}rad)`;
            }
        } else {
            // Desktop behavior: Map is fixed, player moves
            if (mapImageContainerRef.current) {
                mapImageContainerRef.current.style.transform = `translate(-50%, -50%)`;
            }
            if (mapPlayerIconRef.current) {
                const translateX = shipPosition.x * MAP_PIXELS_PER_UNIT;
                const translateY = shipPosition.z * MAP_PIXELS_PER_UNIT;
                mapPlayerIconRef.current.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) rotate(${-rotation}rad)`;
            }
        }
    });

    return null;
}