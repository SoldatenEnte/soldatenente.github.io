import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import { usePlayerControls } from "../context/PlayerControlsContext.tsx";
import { getAveragedWaveInfo, getDisplacedPosition } from "../utils/getWaveInfo.ts";
import { ShipModel } from "../ShipModel.tsx";
import { AllWaterUniforms } from "../types.ts";
import { WORLD_BOUNDARY, ISLAND_POSITION, ISLAND_COLLISION_RADIUS } from "../config/constants.ts";

type PlayerShipProps = {
    waterUniforms: Pick<
        AllWaterUniforms,
        | "uFbmSpeed" | "uWaveSpeed" | "uWaveDirection" | "uWaveSteepness" | "uWaveLength"
    >;
    waterLevel: number;
    shipScale: number;
    shipDimensions: { length: number; width: number };
    updateSailingSound: (speed: number) => void;
    isPhysicsPaused: boolean;
};

const upVector = new THREE.Vector3(0, 1, 0);
const targetQuaternion = new THREE.Quaternion();
const rotationMatrix = new THREE.Matrix4();
const dampenedNormal = new THREE.Vector3();

const worldPosLeft = new THREE.Vector3();
const worldPosRight = new THREE.Vector3();

export const PlayerShip = forwardRef<THREE.Group, PlayerShipProps>(
    ({ waterUniforms, waterLevel, shipScale, shipDimensions, updateSailingSound, isPhysicsPaused }, ref) => {
        const groupRef = useRef<THREE.Group>(null!);
        useImperativeHandle(ref, () => groupRef.current);

        const wakeSourceRefLeft = useRef<THREE.Object3D>(null!);
        const wakeSourceRefRight = useRef<THREE.Object3D>(null!);
        const projectedWakeTargetRefLeft = useRef<THREE.Object3D>(null!);
        const projectedWakeTargetRefRight = useRef<THREE.Object3D>(null!);
        const airWakeTargetRefLeft = useRef<THREE.Object3D>(null!);
        const airWakeTargetRefRight = useRef<THREE.Object3D>(null!);

        const [wakeOpacity, setWakeOpacity] = useState(0);
        const currentSpeed = useRef(0);

        const controls = usePlayerControls();
        const physics = useRef({
            position: new THREE.Vector3(0, 5, 0),
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(0, Math.PI, 0),
            angularVelocity: new THREE.Vector3(),
        }).current;
        const shipParams = useRef({
            thrust: 45.0,
            turnSpeed: 3.0,
            linearDrag: 0.98,
            angularDrag: 0.97,
            rotationStability: 0.7,
            animationSmoothing: 2.0,
            waterInfluence: 0.2,
        }).current;

        useFrame(({ clock }, delta) => {
            const dt = Math.min(delta, 1 / 30);

            if (isPhysicsPaused) {
                physics.velocity.multiplyScalar(0.9);
                currentSpeed.current = physics.velocity.length();
                updateSailingSound(currentSpeed.current);
                const newOpacity = THREE.MathUtils.lerp(wakeOpacity, 0.0, dt * 2.0);
                setWakeOpacity(newOpacity);
                return;
            }

            const time = clock.getElapsedTime();
            const { forward, backward, left, right } = controls.current;
            const basePosition: [number, number, number] = [physics.position.x, 0, physics.position.z];

            const { position: wavePosition, normal: waveNormal, velocity: waterVelocity } = getAveragedWaveInfo(basePosition, shipDimensions, time, waterUniforms);
            wavePosition.y += waterLevel;

            physics.velocity.lerp(waterVelocity, dt * shipParams.waterInfluence);

            const acceleration = new THREE.Vector3();
            const forwardVector = new THREE.Vector3(0, 0, 1).applyEuler(physics.rotation);
            if (forward) {
                acceleration.add(forwardVector.multiplyScalar(shipParams.thrust));
            } else if (backward) {
                acceleration.sub(forwardVector.multiplyScalar(shipParams.thrust * 0.5));
            }
            physics.velocity.add(acceleration.multiplyScalar(dt));
            physics.velocity.multiplyScalar(shipParams.linearDrag);

            const potentialPosition = physics.position.clone().add(physics.velocity.clone().multiplyScalar(dt));
            const distToIsland = potentialPosition.distanceTo(ISLAND_POSITION);

            if (distToIsland < ISLAND_COLLISION_RADIUS) {
                const pushoutVector = potentialPosition.clone().sub(ISLAND_POSITION).normalize();
                const correctedPosition = ISLAND_POSITION.clone().add(pushoutVector.multiplyScalar(ISLAND_COLLISION_RADIUS));
                physics.position.copy(correctedPosition);
                physics.velocity.multiplyScalar(0.9);
            } else {
                potentialPosition.x = THREE.MathUtils.clamp(potentialPosition.x, -WORLD_BOUNDARY, WORLD_BOUNDARY);
                potentialPosition.z = THREE.MathUtils.clamp(potentialPosition.z, -WORLD_BOUNDARY, WORLD_BOUNDARY);
                physics.position.copy(potentialPosition);
            }

            currentSpeed.current = physics.velocity.length();
            updateSailingSound(currentSpeed.current);

            const turnFactor = Math.max(0.1, Math.min(1, currentSpeed.current / 2));
            const angularAcceleration = new THREE.Vector3();
            if (left) angularAcceleration.y += shipParams.turnSpeed * turnFactor;
            if (right) angularAcceleration.y -= shipParams.turnSpeed * turnFactor;
            physics.angularVelocity.add(angularAcceleration.multiplyScalar(dt));
            physics.angularVelocity.multiplyScalar(shipParams.angularDrag);
            physics.rotation.y += physics.angularVelocity.y * dt;

            const targetPosition = wavePosition;
            groupRef.current.position.lerp(targetPosition, dt * shipParams.animationSmoothing);
            dampenedNormal.lerpVectors(waveNormal, upVector, shipParams.rotationStability).normalize();
            const lookAtTarget = groupRef.current.position.clone().add(new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, physics.rotation.y, 0)));
            rotationMatrix.lookAt(groupRef.current.position, lookAtTarget, dampenedNormal);
            targetQuaternion.setFromRotationMatrix(rotationMatrix);
            groupRef.current.quaternion.slerp(targetQuaternion, dt * shipParams.animationSmoothing);

            const targetOpacity = currentSpeed.current > 0.5 ? 1.0 : 0.0;
            const newOpacity = THREE.MathUtils.lerp(wakeOpacity, targetOpacity, dt * 2.0);
            setWakeOpacity(newOpacity);

            if (wakeSourceRefLeft.current && projectedWakeTargetRefLeft.current) {
                wakeSourceRefLeft.current.getWorldPosition(worldPosLeft);
                const projectedLeft = getDisplacedPosition([worldPosLeft.x, 0, worldPosLeft.z], time, waterUniforms);
                projectedWakeTargetRefLeft.current.position.set(projectedLeft.x, projectedLeft.y + waterLevel, projectedLeft.z);
            }
            if (wakeSourceRefRight.current && projectedWakeTargetRefRight.current) {
                wakeSourceRefRight.current.getWorldPosition(worldPosRight);
                const projectedRight = getDisplacedPosition([worldPosRight.x, 0, worldPosRight.z], time, waterUniforms);
                projectedWakeTargetRefRight.current.position.set(projectedRight.x, projectedRight.y + waterLevel, projectedRight.z);
            }
        });

        return (
            <>
                <group ref={groupRef}>
                    <ShipModel scale={shipScale} />
                    <object3D ref={wakeSourceRefLeft} position={[-1.65 * shipScale, 0.5, 3.0 * shipScale]} />
                    <object3D ref={wakeSourceRefRight} position={[1.65 * shipScale, 0.5, 3.0 * shipScale]} />
                    <object3D ref={airWakeTargetRefLeft} position={[-2.2 * shipScale, 6.25 * shipScale, 0.5 * shipScale]} />
                    <object3D ref={airWakeTargetRefRight} position={[2.2 * shipScale, 6.25 * shipScale, 0.5 * shipScale]} />
                </group>

                <object3D ref={projectedWakeTargetRefLeft} />
                <object3D ref={projectedWakeTargetRefRight} />

                {wakeOpacity > 0.01 && (
                    <>
                        <group renderOrder={2}>
                            <Trail
                                target={projectedWakeTargetRefLeft}
                                width={16 * shipScale}
                                length={20 * shipScale}
                                color={"#ffffff"}
                                attenuation={(t) => Math.pow(t, 2) * wakeOpacity}
                            />
                            <Trail
                                target={projectedWakeTargetRefRight}
                                width={16 * shipScale}
                                length={20 * shipScale}
                                color={"#ffffff"}
                                attenuation={(t) => Math.pow(t, 2) * wakeOpacity}
                            />
                        </group>
                        <Trail
                            target={airWakeTargetRefLeft}
                            width={6 * shipScale}
                            length={4 * shipScale}
                            color={"#ffffff"}
                            attenuation={(t) => Math.pow(t, 2) * wakeOpacity * 0.6}
                        />
                        <Trail
                            target={airWakeTargetRefRight}
                            width={6 * shipScale}
                            length={4 * shipScale}
                            color={"#ffffff"}
                            attenuation={(t) => Math.pow(t, 2) * wakeOpacity * 0.6}
                        />
                    </>
                )}
            </>
        );
    }
);

PlayerShip.displayName = "PlayerShip";