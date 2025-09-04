// src/components/TouchControls.tsx
import { useRef, useState } from 'react';
import './TouchControls.css';
import { usePlayerControls } from '../context/PlayerControlsContext';
import { useGameState } from '../context/GameStateContext';

// FIX: Create separate dead zones to make forward movement easier.
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
        controlsRef.current.forward = false;
        controlsRef.current.backward = false;
        controlsRef.current.left = false;
        controlsRef.current.right = false;
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

        // FIX: Use the new, separate dead zones for input
        controlsRef.current.forward = normalizedY > Y_DEAD_ZONE;
        controlsRef.current.backward = normalizedY < -Y_DEAD_ZONE;
        controlsRef.current.left = normalizedX < -X_DEAD_ZONE;
        controlsRef.current.right = normalizedX > X_DEAD_ZONE;
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