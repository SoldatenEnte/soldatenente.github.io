import { useState, useCallback } from "react";
import * as THREE from "three";
import { DuckData } from "../types";

const INITIAL_DUCK_POSITIONS: [number, number, number][] = [
    [50, 0, 50],
    [-80, 0, 120],
    [100, 0, -150],
    [-150, 0, -200],
    [200, 0, -50],
];

const initialDucks: DuckData[] = INITIAL_DUCK_POSITIONS.map((pos, i) => ({
    id: i,
    position: new THREE.Vector3(...pos),
    status: 'IDLE',
    followIndex: null,
}));

export const useDucks = () => {
    const [ducks, setDucks] = useState<DuckData[]>(initialDucks);
    const [followingCount, setFollowingCount] = useState(0);

    const collectDuck = useCallback((id: number) => {
        setDucks(prevDucks => {
            let wasCollected = false;
            const newDucks = prevDucks.map((duck): DuckData => { // Ensure map returns DuckData
                if (duck.id === id && duck.status === 'IDLE') {
                    wasCollected = true;
                    return {
                        ...duck,
                        status: 'FOLLOWING', // This is now correctly typed
                        followIndex: followingCount,
                    };
                }
                return duck;
            });

            if (wasCollected) {
                setFollowingCount(prev => prev + 1);
                return newDucks;
            }
            return prevDucks;
        });
    }, [followingCount]);

    return { ducks, collectDuck };
};