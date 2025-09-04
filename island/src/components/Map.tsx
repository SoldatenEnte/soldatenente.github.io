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

    // FIX: Add handler to close the map
    const handleClose = () => {
        dispatch({ type: 'TOGGLE_MAP' });
    };

    return (
        // FIX: Add onClick to the overlay to close it on mobile
        <div className={`map-overlay ${show ? 'visible' : ''}`} onClick={handleClose}>
            {/* Stop propagation so clicking the map content doesn't close it */}
            <div className="map-content" onClick={(e) => e.stopPropagation()}>
                <div className="map-image-container" ref={imageContainerRef}>
                    <img src={asset("map-texture.png")} alt="World Map" />
                </div>
                <div className="map-player-icon" ref={playerIconRef} />
            </div>
            <div className="map-instructions">Press [M] to close Map</div>
            {/* FIX: Add a visible close button for mobile */}
            <button className="map-close-button" onClick={handleClose}>
                &times;
            </button>
        </div>
    );
});