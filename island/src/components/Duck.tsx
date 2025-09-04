import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import { DuckModel } from "../DuckModel";
import { getDisplacedPosition } from "../utils/getWaveInfo";
import { AllWaterUniforms, DuckData } from "../types";
import { DUCK_COLLECTION_RADIUS, DUCK_FOLLOW_OFFSETS, DUCK_FOLLOW_SPEED } from "../config/constants";

type DuckProps = {
    duckData: DuckData;
    shipRef: React.RefObject<THREE.Group | null>;
    waterUniforms: Pick<AllWaterUniforms, "uFbmSpeed" | "uWaveSpeed" | "uWaveDirection" | "uWaveSteepness" | "uWaveLength">;
    waterLevel: number;
    onCollect: (id: number) => void;
};

const worldPos = new THREE.Vector3();

export function Duck({ duckData, shipRef, waterUniforms, waterLevel, onCollect }: DuckProps) {
    const duckRef = useRef<THREE.Group>(null!);
    const initialPosition = useRef(new THREE.Vector3().copy(duckData.position)).current;
    const wakeSourceRef = useRef<THREE.Object3D>(null!);
    const projectedWakeTargetRef = useRef<THREE.Object3D>(null!);
    const [wakeOpacity, setWakeOpacity] = useState(0);
    const previousPosition = useRef<THREE.Vector3 | null>(null);

    useFrame(({ clock }, delta) => {
        const dt = Math.min(delta, 1 / 30);
        const time = clock.getElapsedTime();
        if (!shipRef.current || !duckRef.current) return;

        let currentSpeed = 0;

        if (duckData.status === 'IDLE') {
            const wavePos = getDisplacedPosition([initialPosition.x, 0, initialPosition.z], time, waterUniforms);
            duckRef.current.position.lerp(wavePos.add(new THREE.Vector3(0, waterLevel - 1.5, 0)), dt * 5);
            duckRef.current.rotation.y += Math.sin(time * 0.5) * 0.005;

            const distanceToShip = duckRef.current.position.distanceTo(shipRef.current.position);
            if (distanceToShip < DUCK_COLLECTION_RADIUS) {
                onCollect(duckData.id);
            }
        } else if (duckData.status === 'FOLLOWING' && duckData.followIndex !== null) {
            const offsetIndex = duckData.followIndex % DUCK_FOLLOW_OFFSETS.length;
            const followOffset = new THREE.Vector3().set(...DUCK_FOLLOW_OFFSETS[offsetIndex]);

            followOffset.applyQuaternion(shipRef.current.quaternion);
            const targetPos = new THREE.Vector3().addVectors(shipRef.current.position, followOffset);

            const waterTarget = getDisplacedPosition([targetPos.x, 0, targetPos.z], time, waterUniforms);
            const finalTarget = waterTarget.add(new THREE.Vector3(0, waterLevel - 1.5, 0));

            duckRef.current.position.lerp(finalTarget, dt * DUCK_FOLLOW_SPEED);
            duckRef.current.lookAt(shipRef.current.position);
        }

        if (previousPosition.current && dt > 0) {
            const displacement = duckRef.current.position.clone().sub(previousPosition.current);
            currentSpeed = displacement.length() / dt;
        }
        previousPosition.current = duckRef.current.position.clone();

        const targetOpacity = duckData.status === 'FOLLOWING' && currentSpeed > 0.1 ? 0.6 : 0.0;
        const newOpacity = THREE.MathUtils.lerp(wakeOpacity, targetOpacity, dt * 2.0);
        setWakeOpacity(newOpacity);

        if (wakeSourceRef.current && projectedWakeTargetRef.current) {
            wakeSourceRef.current.getWorldPosition(worldPos);
            const projectedLeft = getDisplacedPosition([worldPos.x, 0, worldPos.z], time, waterUniforms);
            projectedWakeTargetRef.current.position.set(projectedLeft.x, projectedLeft.y + waterLevel, projectedLeft.z);
        }
    });

    return (
        <>
            <group ref={duckRef} position={initialPosition}>
                <DuckModel scale={1} />
                <object3D ref={wakeSourceRef} position={[0, 0.1, 0.5]} />
            </group>
            <object3D ref={projectedWakeTargetRef} />
            {wakeOpacity > 0.01 && (
                <group renderOrder={1}>
                    <Trail
                        target={projectedWakeTargetRef}
                        width={0}
                        length={1}
                        color={"#ffffff"}
                        attenuation={(t) => Math.pow(t, 2) * wakeOpacity}
                    />
                </group>
            )}
        </>
    );
}