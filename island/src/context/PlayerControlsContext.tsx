// src/context/PlayerControlsContext.tsx
import { createContext, useEffect, useRef, useContext, ReactNode } from 'react';

type ControlState = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
};

type PlayerControlsContextType = React.RefObject<ControlState>;

const PlayerControlsContext = createContext<PlayerControlsContextType | null>(null);

export const PlayerControlsProvider = ({ children }: { children: ReactNode }) => {
    const controlsRef = useRef<ControlState>({
        forward: false,
        backward: false,
        left: false,
        right: false,
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key.toLowerCase()) {
                case "w": case "arrowup": controlsRef.current.forward = true; break;
                case "s": case "arrowdown": controlsRef.current.backward = true; break;
                case "a": case "arrowleft": controlsRef.current.left = true; break;
                case "d": case "arrowright": controlsRef.current.right = true; break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            switch (event.key.toLowerCase()) {
                case "w": case "arrowup": controlsRef.current.forward = false; break;
                case "s": case "arrowdown": controlsRef.current.backward = false; break;
                case "a": case "arrowleft": controlsRef.current.left = false; break;
                case "d": case "arrowright": controlsRef.current.right = false; break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return (
        <PlayerControlsContext.Provider value={controlsRef}>
            {children}
        </PlayerControlsContext.Provider>
    );
};

export const usePlayerControls = () => {
    const context = useContext(PlayerControlsContext);
    if (!context) {
        throw new Error('usePlayerControls must be used within a PlayerControlsProvider');
    }
    return context;
};