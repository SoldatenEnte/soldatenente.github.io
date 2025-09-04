import React, { forwardRef } from "react";
import { asset } from "../utils/assetUrl"; // Import the helper

type MinimapProps = {
    show: boolean;
    rotatorRef: React.RefObject<HTMLDivElement | null>;
    translatorRef: React.RefObject<HTMLDivElement | null>;
};

export const Minimap = React.memo(forwardRef<HTMLDivElement, MinimapProps>(({ show, rotatorRef, translatorRef }, ref) => {
    const containerClasses = `minimap-container ${!show ? 'hidden' : ''}`;

    return (
        <div className={containerClasses} ref={ref}>
            <div className="minimap-rotator" ref={rotatorRef}>
                <div className="minimap-translator" ref={translatorRef}>
                    <img
                        // FIX: Use the asset helper for the image path
                        src={asset("map-texture.png")}
                        className="minimap-image"
                        alt="Map of the island"
                    />
                </div>
                <div className="compass">
                    <div className="compass-letter north">N</div>
                    <div className="compass-letter east">E</div>
                    <div className="compass-letter south">S</div>
                    <div className="compass-letter west">W</div>
                </div>
            </div>
            <div className="player-icon" />
            <div className="minimap-bezel" />
        </div>
    );
}));

Minimap.displayName = "Minimap";