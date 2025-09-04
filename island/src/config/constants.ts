import * as THREE from 'three';

// --- Timing & Durations ---
export const FADE_DURATION = 1500;
export const PROJECT_FADE_DURATION = 1000;
export const INACTIVITY_TIMEOUT = 5000;

// --- Gameplay & World ---
export const WORLD_BOUNDARY = 450;
export const MAP_ISLAND_Z_OFFSET = -300;
export const ISLAND_POSITION = new THREE.Vector3(0, 0, MAP_ISLAND_Z_OFFSET);
export const ISLAND_INTERACTION_RADIUS = 80;
export const ISLAND_COLLISION_RADIUS = 55;
export const DUCK_COLLECTION_RADIUS = 15;

// --- UI & Map ---
export const MINIMAP_WORLD_SIZE = 1000;
export const MINIMAP_IMAGE_SIZE_PX = 400;
export const MINIMAP_PIXELS_PER_UNIT = MINIMAP_IMAGE_SIZE_PX / MINIMAP_WORLD_SIZE;
export const MAP_WORLD_SIZE = 1000;
export const MAP_IMAGE_SIZE_PX = 800;
export const MAP_PIXELS_PER_UNIT = MAP_IMAGE_SIZE_PX / MAP_WORLD_SIZE;

// --- Duck Behavior ---
export const DUCK_FOLLOW_SPEED = 2;
export const DUCK_FOLLOW_OFFSETS: [number, number, number][] = [
    [-5, 0, 12],
    [5, 0, 12],
    [-10, 0, 20],
    [10, 0, 20],
    [0, 0, 20],
];