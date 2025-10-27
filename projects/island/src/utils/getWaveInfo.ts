import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { AllWaterUniforms } from "../types";

type PartialWaterUniforms = Pick<
  AllWaterUniforms,
  | "uFbmSpeed"
  | "uWaveSpeed"
  | "uWaveDirection"
  | "uWaveSteepness"
  | "uWaveLength"
>;

const simplex = createNoise2D();

function fbm(p: THREE.Vector2): number {
  let total = 0.0, amplitude = 1.0, frequency = 1.0;
  const lacunarity = 2.3, gain = 0.4, octaves = 5;
  let maxValue = 0.0;
  for (let i = 0; i < octaves; i++) {
    total += simplex(p.x * frequency, p.y * frequency) * amplitude;
    maxValue += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return total / maxValue;
}

function angleToDirection(angle: number): { x: number; y: number } {


  const rad = ((angle - 90) * Math.PI) / 180.0;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

type GerstnerWaveOpts = { direction: { x: number; y: number }; steepness: number; length: number };

function gerstnerWave(point: THREE.Vector3, opts: GerstnerWaveOpts, time: number): THREE.Vector3 {
  const k = (2 * Math.PI) / opts.length;
  const a = opts.steepness / k;
  const d_dot_p = point.x * opts.direction.x + point.z * opts.direction.y;
  const f = k * (d_dot_p - time);
  const offset = new THREE.Vector3();
  offset.x = opts.direction.x * a * Math.cos(f);
  offset.z = opts.direction.y * a * Math.cos(f);
  offset.y = a * Math.sin(f);
  return offset;
}

export function getDisplacedPosition(position: [number, number, number], time: number, uniforms: PartialWaterUniforms): THREE.Vector3 {
  const point = new THREE.Vector3(position[0], position[1], position[2]);
  const totalDisplacement = new THREE.Vector3(0, 0, 0);

  const noiseInput = time * uniforms.uFbmSpeed.value;
  const fbmNoisePoint = new THREE.Vector2(point.x * 0.5 + noiseInput, point.z * 0.5 + noiseInput);
  totalDisplacement.y += (fbm(fbmNoisePoint) + 1.0) / 2.0 * 0.5;

  const waveTime = time * uniforms.uWaveSpeed.value;
  const directions = uniforms.uWaveDirection.value;
  const steepness = uniforms.uWaveSteepness.value;
  const length = uniforms.uWaveLength.value;

  const dirA = angleToDirection(directions.x);
  const optsA = { direction: dirA, steepness: steepness, length: length };
  totalDisplacement.add(gerstnerWave(point, optsA, waveTime));

  const dirB = angleToDirection(directions.y);
  const optsB = { direction: dirB, steepness: steepness * 0.5, length: length * 0.5 };
  totalDisplacement.add(gerstnerWave(point, optsB, waveTime));

  const dirC = angleToDirection(directions.z);
  const optsC = { direction: dirC, steepness: steepness * 0.25, length: length * 0.25 };
  totalDisplacement.add(gerstnerWave(point, optsC, waveTime));

  return new THREE.Vector3().copy(point).add(totalDisplacement);
}


function getWaveNormal(position: [number, number, number], time: number, uniforms: PartialWaterUniforms): THREE.Vector3 {
  const center = getDisplacedPosition(position, time, uniforms);
  const offset = 0.1;
  const pointX = getDisplacedPosition([position[0] + offset, position[1], position[2]], time, uniforms);
  const pointZ = getDisplacedPosition([position[0], position[1], position[2] + offset], time, uniforms);
  return new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(pointZ, center),
    new THREE.Vector3().subVectors(pointX, center)
  ).normalize();
}


function getWaveVelocity(position: [number, number, number], time: number, uniforms: PartialWaterUniforms): THREE.Vector3 {
  const dt = 0.01;
  const p1 = getDisplacedPosition(position, time, uniforms);
  const p2 = getDisplacedPosition(position, time - dt, uniforms);

  return new THREE.Vector3().subVectors(p1, p2).divideScalar(dt);
}



export function getAveragedWaveInfo(
  centerPosition: [number, number, number],
  dimensions: { length: number, width: number },
  time: number,
  uniforms: PartialWaterUniforms
): { position: THREE.Vector3; normal: THREE.Vector3; velocity: THREE.Vector3 } {

  const halfLength = dimensions.length / 2;
  const halfWidth = dimensions.width / 2;
  const samplePoints: [number, number, number][] = [
    [centerPosition[0], 0, centerPosition[2]],
    [centerPosition[0], 0, centerPosition[2] + halfLength],
    [centerPosition[0], 0, centerPosition[2] - halfLength],
    [centerPosition[0] - halfWidth, 0, centerPosition[2]],
    [centerPosition[0] + halfWidth, 0, centerPosition[2]],
  ];

  const positions: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const velocities: THREE.Vector3[] = [];


  samplePoints.forEach(point => {
    positions.push(getDisplacedPosition(point, time, uniforms));
    normals.push(getWaveNormal(point, time, uniforms));
    velocities.push(getWaveVelocity(point, time, uniforms));
  });


  const averagedPosition = new THREE.Vector3();
  positions.forEach(pos => averagedPosition.add(pos));
  averagedPosition.divideScalar(positions.length);


  averagedPosition.x = positions[0].x;
  averagedPosition.z = positions[0].z;


  const averagedNormal = new THREE.Vector3();
  normals.forEach(norm => averagedNormal.add(norm));
  averagedNormal.divideScalar(normals.length).normalize();


  const averagedVelocity = new THREE.Vector3();
  velocities.forEach(vel => averagedVelocity.add(vel));
  averagedVelocity.divideScalar(velocities.length);

  return { position: averagedPosition, normal: averagedNormal, velocity: averagedVelocity };
}