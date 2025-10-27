import { useState } from "react";
import "./Intro.css";
import { useGameState } from "../context/GameStateContext";
import soundManager from "../hooks/useSoundManager";
import { asset } from "../utils/assetUrl";

export function Intro() {
    const { state, dispatch } = useGameState();
    const { gameMode, isLoading, isLoaded } = state;
    const [isMounted, setIsMounted] = useState(true);

    const isFading = isLoaded;

    const handleClick = () => {
        if (gameMode === 'intro' && !isLoading) {
            soundManager.initializeSounds();
            dispatch({ type: 'START_LOADING' });
        }
    };

    const handleTransitionEnd = () => {
        if (isFading) {
            setIsMounted(false);
        }
    };

    if (!isMounted) {
        return null;
    }

    const overlayClasses = `intro-overlay ${isFading ? 'stage-finished' : ''}`;

    return (
        <div className={overlayClasses} onClick={handleClick} onTransitionEnd={handleTransitionEnd}>
            <div className="logo-container stage-logoFadeIn">
                <img src={asset("logo.svg")} alt="Loading Logo" />
            </div>
            {!isLoading && !isLoaded && <div className="click-to-begin">Click to Begin</div>}
            {isLoading && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                </div>
            )}
        </div>
    );
}