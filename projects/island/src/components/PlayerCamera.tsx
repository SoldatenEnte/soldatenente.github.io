import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useRef, useState, useEffect, useLayoutEffect, RefObject } from "react";
import { INACTIVITY_TIMEOUT } from "../config/constants";
import { isMobile } from "../utils/isMobile";

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
    islandRefs: RefObject<THREE.Group | null>[];
    isPaused: boolean;
    gameMode: string;
};

const a = new THREE.Vector3();
const b = new THREE.Vector3();

export function PlayerCamera({ shipRef, controlsRef, waterLevel, islandRefs, isPaused, gameMode }: PlayerCameraProps) {
    const { camera } = useThree();
    const lastShipPosition = useRef(new THREE.Vector3());
    const [isIdle, setIsIdle] = useState(true);
    const [isMobileIdle, setIsMobileIdle] = useState(true);
    const idleTimerRef = useRef<number | null>(null);
    const raycaster = useRef(new THREE.Raycaster()).current;

    const prevIsPaused = usePrevious(isPaused);
    const prevGameMode = usePrevious(gameMode);

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

    useEffect(() => {
        if (!isMobile || !isMobileIdle) return;

        const handleFirstTouch = () => {
            setIsMobileIdle(false);
        };

        window.addEventListener('touchstart', handleFirstTouch, { once: true });

        return () => {
            window.removeEventListener('touchstart', handleFirstTouch);
        };
    }, [isMobileIdle]);

    useLayoutEffect(() => {
        if (prevIsPaused && !isPaused && controlsRef.current && shipRef.current) {
            const shipPosition = shipRef.current.position;
            const cameraPivot = new THREE.Vector3(shipPosition.x, waterLevel + 5.0, shipPosition.z);
            controlsRef.current.target.copy(cameraPivot);
            controlsRef.current.update();
        }
    }, [isPaused, prevIsPaused, controlsRef, shipRef, waterLevel]);

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

    useFrame((state) => {
        if (!shipRef.current || !controlsRef.current) return;

        const shipPosition = shipRef.current.position;
        const cameraPivotHeight = 5.0;
        const cameraPivot = a.set(shipPosition.x, waterLevel + cameraPivotHeight, shipPosition.z);

        if (isMobile) {
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

            const islandObjects = islandRefs.map(ref => ref.current).filter((obj): obj is THREE.Group => obj !== null);
            if (islandObjects.length > 0) {
                const intersects = raycaster.intersectObjects(islandObjects, true);
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