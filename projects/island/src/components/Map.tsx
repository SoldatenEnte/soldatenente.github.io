import React from 'react';
import './Map.css';
import { asset } from '../utils/assetUrl';
import { useGameState } from '../context/GameStateContext';

type MapProps = {
    show: boolean;
    playerIconRef: React.RefObject<HTMLDivElement | null>;
    imageContainerRef: React.RefObject<HTMLDivElement | null>;
};

export const Map = React.memo(function Map({ show, playerIconRef, imageContainerRef }: MapProps) {
    const { dispatch } = useGameState();

    const closeMap = () => {
        dispatch({ type: 'TOGGLE_MAP' });
    };

    // FIX: Create a dedicated handler for the button to prevent default actions
    // and stop the event from bubbling up to the overlay.
    const handleButtonClose = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        closeMap();
    };

    // This handler remains for the map content itself.
    const stopPropagation = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    return (
        // Tapping the background overlay will close the map.
        <div className={`map-overlay ${show ? 'visible' : ''}`} onPointerUp={closeMap}>
            {/* Tapping the map content will do nothing. */}
            <div className="map-content" onPointerUp={stopPropagation}>
                <div className="map-image-container" ref={imageContainerRef}>
                    <img src={asset("map-texture.png")} alt="World Map" />
                </div>
                <div className="map-player-icon" ref={playerIconRef} />
            </div>
            <div className="map-instructions">Press [M] to close Map</div>
            {/* FIX: Use the new, more robust handler for the button. */}
            <button className="map-close-button" onPointerUp={handleButtonClose}>
                &times;
            </button>
        </div>
    );
});