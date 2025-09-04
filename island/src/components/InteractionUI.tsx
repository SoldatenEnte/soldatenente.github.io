import { useState, useEffect } from 'react';
import './InteractionUI.css';
import { useGameState } from '../context/GameStateContext';
// FIX: Add the .tsx extension to make the import explicit and resolve the error.
import { ProjectShowcase } from './ProjectShowcase.tsx';
import { isMobile } from '../utils/isMobile';
import { asset } from '../utils/assetUrl'; // Import the helper

export function InteractionUI() {
    const { state, dispatch } = useGameState();
    const { gameMode, isNearIsland, projectRendered } = state;
    const [isProjectContentActive, setIsProjectContentActive] = useState(false);

    useEffect(() => {
        if (gameMode === 'island') {
            const timer = setTimeout(() => {
                setIsProjectContentActive(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsProjectContentActive(false);
        }
    }, [gameMode]);

    const isTransitioning = gameMode === 'transitioning';
    const showProject = gameMode === 'island' || (isTransitioning && projectRendered);

    const promptVisible = isNearIsland && gameMode === 'ocean' && !isMobile;

    const handleReturn = () => {
        dispatch({ type: 'RETURN_TO_OCEAN' });
    };

    return (
        <>
            <div className={`interaction-prompt ${promptVisible ? 'visible' : ''}`}>
                Press [E] to Dock
            </div>

            <div className={`scene-transition ${isTransitioning ? 'active' : ''}`} />

            {showProject && (
                <div className={`project-view ${isProjectContentActive ? 'active' : ''}`}>
                    <ProjectShowcase
                        title="Project Eneida"
                        description="An interactive portfolio terminal inspired by retro-futuristic interfaces. Explore projects, uncover secrets, and even destabilize the system for fun."
                        imageUrl={asset("projects/eneida_screenshot.png")}
                        projectUrl="https://ducklin.de/eneida"
                        onReturn={handleReturn}
                    />
                </div>
            )}
        </>
    );
}