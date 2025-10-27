import * as THREE from 'three';
import { asset } from '../utils/assetUrl';
import { Project } from '../types';

/**
 * The single source of truth for all project island data.
 * To add a new island, simply add a new object to this array.
 */
export const PROJECTS: Project[] = [
    {
        id: 'eneida',
        name: 'Project Eneida',
        description: "An interactive portfolio terminal with commands, mini-games, and a windowing system.",
        position: new THREE.Vector3(0, -1.5, -300),
        rotationY: -Math.PI / 4,
        scale: 1.8,
        modelUrl: asset("eneida_island.glb"),
        imageUrl: asset("projects/eneida_thumbnail.webp"),
        projectUrl: "https://ducklin.de/projects/eneida",
        collisionRadius: 95,
        slowdownRadius: 110,
    },
    {
        id: 'useek',
        name: 'Project Useek',
        description: "A pirate-styled adventure puzzle game where you solve challenges to find a final code.",
        position: new THREE.Vector3(250, -1.5, 150),
        rotationY: Math.PI / 0.2,
        scale: 2.375,
        modelUrl: asset("useek_island.glb"),
        imageUrl: asset("projects/useek_thumbnail.webp"),
        projectUrl: "https://ducklin.de/projects/useek",
        collisionRadius: 70,
        slowdownRadius: 80,
    },
    // --- Future Projects ---
    // {
    //     id: 'duckslayer',
    //     name: 'Duck Slayer',
    //     description: "Description for Duck Slayer.",
    //     position: new THREE.Vector3(-200, -1.5, -50),
    //     rotationY: 0,
    //     scale: 2,
    //     modelUrl: asset("duckslayer_island.glb"),
    //     imageUrl: asset("projects/duckslayer_screenshot.png"),
    //     projectUrl: "#",
    //     collisionRadius: 75,
    //     slowdownRadius: 90,
    // },
];