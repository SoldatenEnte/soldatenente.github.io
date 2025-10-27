// src/components/TouchControls.tsx
import { useRef, useState } from 'react';
import './TouchControls.css';
import { usePlayerControls } from '../context/PlayerControlsContext';
import { useGameState } from '../context/GameStateContext';

// Create separate dead zones to make forward movement easier.
// A larger X dead zone means the stick must be moved further horizontally to register a turn.
const Y_DEAD_ZONE = 0.1;
const X_DEAD_ZONE = 0.3;

export function TouchControls() {
    const controlsRef = usePlayerControls();
    const handleRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { state } = useGameState();

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setIsDragging(true);
        updateJoystick(e.touches[0]);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        updateJoystick(e.touches[0]);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (handleRef.current) {
            handleRef.current.style.transform = `translate(0px, 0px)`;
        }
        // FIX: Reset all control values, including analog ones
        controlsRef.current.forward = false;
        controlsRef.current.backward = false;
        controlsRef.current.left = false;
        controlsRef.current.right = false;
        controlsRef.current.x = 0;
        controlsRef.current.y = 0;
    };

    const updateJoystick = (touch: React.Touch) => {
        if (!handleRef.current?.parentElement) return;

        const baseElement = handleRef.current.parentElement;
        const handleElement = handleRef.current;

        const baseRect = baseElement.getBoundingClientRect();
        const radius = baseElement.clientWidth / 2;
        const handleRadius = handleElement.clientWidth / 2;

        const baseX = baseRect.left + radius;
        const baseY = baseRect.top + radius;

        let dx = touch.clientX - baseX;
        let dy = touch.clientY - baseY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > radius - handleRadius) {
            dx = (dx / distance) * (radius - handleRadius);
            dy = (dy / distance) * (radius - handleRadius);
        }

        handleElement.style.transform = `translate(${dx}px, ${dy}px)`;

        const normalizedX = dx / (radius - handleRadius);
        const normalizedY = -dy / (radius - handleRadius);

        // FIX: Set analog x and y values instead of booleans
        controlsRef.current.y = Math.abs(normalizedY) > Y_DEAD_ZONE ? normalizedY : 0;
        controlsRef.current.x = Math.abs(normalizedX) > X_DEAD_ZONE ? normalizedX : 0;

        // Clear boolean flags to prevent conflicts
        controlsRef.current.forward = false;
        controlsRef.current.backward = false;
        controlsRef.current.left = false;
        controlsRef.current.right = false;
    };

    if (state.gameMode !== 'ocean' || state.mapMode !== 'minimap') {
        return null;
    }

    return (
        <div className="touch-controls-container">
            <div
                className="joystick-base"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                <div ref={handleRef} className="joystick-handle" />
            </div>
        </div>
    );
}