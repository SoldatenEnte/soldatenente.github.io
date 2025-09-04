import { useState } from "react";
import "./Intro.css";
import { useGameState } from "../context/GameStateContext";
import soundManager from "../hooks/useSoundManager";
import { asset } from "../utils/assetUrl"; // Import the helper

export function Intro() {
    const { state, dispatch } = useGameState();
    const [isMounted, setIsMounted] = useState(true);

    const isFading = state.gameMode !== 'intro';

    const handleClick = () => {
        if (state.gameMode === 'intro') {
            soundManager.initializeSounds();
            dispatch({ type: 'START_GAME' });
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
                <img src={asset("logo.svg")} alt="Loading Logo" /> {/* Use helper here */}
            </div>
            {!isFading && <div className="click-to-begin">Click to Begin</div>}
        </div>
    );
}