// src/utils/useKeyToggle.ts
import { useState, useEffect, useCallback } from "react";

export const useKeyToggle = (key: string, initialState = true) => {
    const [isOn, setIsOn] = useState(initialState);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === key.toLowerCase()) {
                setIsOn(prev => !prev);
            }
        },
        [key]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    return isOn;
};