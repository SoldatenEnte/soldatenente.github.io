// src/components/ActionButtons.tsx
import './ActionButtons.css';
import { useGameState } from '../context/GameStateContext';
import { isMobile } from '../utils/isMobile';

export function ActionButtons() {
    const { state, dispatch } = useGameState();
    const { gameMode, nearIslandId, mapMode } = state;

    const handleMapToggle = () => {
        dispatch({ type: 'TOGGLE_MAP' });
    };

    const handleDock = () => {
        if (!nearIslandId) return;
        dispatch({ type: 'ENTER_ISLAND', payload: nearIslandId });
    };

    // FIX: Add JS check to ensure buttons only appear on mobile devices.
    if (!isMobile || gameMode !== 'ocean' || mapMode !== 'minimap') {
        return null;
    }

    return (
        <div className="action-buttons-container">
            {nearIslandId && (
                <button className="action-button" onClick={handleDock}>
                    Dock
                </button>
            )}
            <button className="action-button" onClick={handleMapToggle}>
                Map
            </button>
        </div>
    );
}