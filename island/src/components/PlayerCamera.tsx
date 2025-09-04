import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { INACTIVITY_TIMEOUT } from "../config/constants";
import { isMobile } from "../utils/isMobile";

// Helper hook to track the previous value of a prop or state
function usePrevious(value: any) {
    const ref = useRef<any>(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

type PlayerCameraProps = {
    shipRef: React.RefObject<THREE.Group | null>;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    waterLevel: number;
    islandRef: React.RefObject<THREE.Group | null>;
    isPaused: boolean;
    gameMode: string;
};

const a = new THREE.Vector3();
const b = new THREE.Vector3();

export function PlayerCamera({ shipRef, controlsRef, waterLevel, islandRef, isPaused, gameMode }: PlayerCameraProps) {
    const { camera } = useThree();
    const lastShipPosition = useRef(new THREE.Vector3());
    const [isIdle, setIsIdle] = useState(true);
    const [isMobileIdle, setIsMobileIdle] = useState(true);
    const idleTimerRef = useRef<number | null>(null);
    const raycaster = useRef(new THREE.Raycaster()).current;

    const prevIsPaused = usePrevious(isPaused);
    const prevGameMode = usePrevious(gameMode);

    // This effect correctly resets the idle state whenever the player enters the ocean scene.
    useEffect(() => {
        if (gameMode === 'ocean' && prevGameMode !== 'ocean') {
            if (isMobile) {
                setIsMobileIdle(true);
            } else {
                setIsIdle(true);
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            }
        }
    }, [gameMode, prevGameMode]);


    // FIX: This is the corrected logic. This effect now depends on `isMobileIdle`.
    // It will re-run and correctly add the listener whenever the idle state is re-activated.
    useEffect(() => {
        if (!isMobile || !isMobileIdle) return;

        const handleFirstTouch = () => {
            setIsMobileIdle(false);
        };

        // Use { once: true } to automatically remove the listener after it fires once.
        window.addEventListener('touchstart', handleFirstTouch, { once: true });

        // The cleanup function handles the case where the component unmounts before a touch.
        return () => {
            window.removeEventListener('touchstart', handleFirstTouch);
        };
    }, [isMobileIdle]); // The dependency array is the key to the fix.


    useLayoutEffect(() => {
        if (prevIsPaused && !isPaused && controlsRef.current && shipRef.current) {
            const shipPosition = shipRef.current.position;
            const cameraPivot = new THREE.Vector3(shipPosition.x, waterLevel + 5.0, shipPosition.z);
            controlsRef.current.target.copy(cameraPivot);
            controlsRef.current.update();
        }
    }, [isPaused, prevIsPaused, controlsRef, shipRef, waterLevel]);

    // This desktop-only effect remains unchanged and correct.
    useEffect(() => {
        if (isMobile) return;

        const controls = controlsRef.current;
        const handleUserActivity = () => {
            if (isPaused) return;
            setIsIdle(false);
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            idleTimerRef.current = window.setTimeout(() => {
                setIsIdle(true);
            }, INACTIVITY_TIMEOUT);
        };

        window.addEventListener("keydown", handleUserActivity);
        controls?.addEventListener('start', handleUserActivity);

        return () => {
            window.removeEventListener("keydown", handleUserActivity);
            controls?.removeEventListener('start', handleUserActivity);
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
        };
    }, [controlsRef, isPaused]);

    // The useFrame logic is now correct because the `isMobileIdle` state it depends on
    // is being managed properly.
    useFrame((state) => {
        if (!shipRef.current || !controlsRef.current) return;

        const shipPosition = shipRef.current.position;
        const cameraPivotHeight = 5.0;
        const cameraPivot = a.set(shipPosition.x, waterLevel + cameraPivotHeight, shipPosition.z);

        if (isMobile) {
            // --- Mobile Camera: Switches from idle to fixed-follow ---
            if (isMobileIdle) {
                const time = state.clock.getElapsedTime();
                const angle = time * 0.1;
                const radius = 45;
                const height = 18;
                const idlePosition = b.set(
                    shipPosition.x + Math.sin(angle) * radius,
                    waterLevel + height,
                    shipPosition.z + Math.cos(angle) * radius
                );
                camera.position.lerp(idlePosition, 0.02);
            } else {
                const idealOffset = new THREE.Vector3(0, 18, 45);
                idealOffset.applyQuaternion(shipRef.current.quaternion);
                const idealPosition = new THREE.Vector3().copy(shipPosition).add(idealOffset);
                const idealDirection = new THREE.Vector3().subVectors(idealPosition, cameraPivot).normalize();
                const currentDistance = camera.position.distanceTo(cameraPivot);
                const targetPosition = cameraPivot.clone().add(idealDirection.multiplyScalar(currentDistance));
                camera.position.lerp(targetPosition, 0.05);
            }
            controlsRef.current.target.copy(cameraPivot);

        } else {
            // --- Desktop Camera: Orbiting with idle animation ---
            const delta = b.subVectors(shipPosition, lastShipPosition.current);
            if (!isPaused) {
                camera.position.add(delta);
            }

            if (isIdle && !isPaused) {
                const time = state.clock.getElapsedTime();
                const angle = time * 0.1;
                const radius = 40;
                const height = 15;
                const idlePosition = b.set(
                    shipPosition.x + Math.sin(angle) * radius,
                    waterLevel + height,
                    shipPosition.z + Math.cos(angle) * radius
                );
                camera.position.lerp(idlePosition, 0.02);
            }

            const desiredDistance = camera.position.distanceTo(cameraPivot);
            const direction = b.subVectors(camera.position, cameraPivot).normalize();

            raycaster.set(cameraPivot, direction);
            raycaster.far = desiredDistance;

            if (islandRef.current) {
                const intersects = raycaster.intersectObject(islandRef.current, true);
                if (intersects.length > 0) {
                    const intersectionDistance = intersects[0].distance;
                    const newDistance = Math.max(8, intersectionDistance - 2.0);
                    camera.position.copy(cameraPivot).add(direction.multiplyScalar(newDistance));
                }
            }
            controlsRef.current.target.copy(cameraPivot);
        }

        lastShipPosition.current.copy(shipPosition);

        if (!isPaused) {
            controlsRef.current.update();
        }
    });

    return null;
}