import { useState, useEffect } from 'react';
import './InteractionUI.css';
import { useGameState } from '../context/GameStateContext';
// FIX: Add the .tsx extension to make the import explicit and resolve the error.
import { ProjectShowcase } from './ProjectShowcase.tsx';
import { isMobile } from '../utils/isMobile';
import { PROJECTS } from '../config/projects';

export function InteractionUI() {
    const { state, dispatch } = useGameState();
    const { gameMode, nearIslandId, currentIslandId, projectRendered } = state;
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

    const currentProject = PROJECTS.find(p => p.id === currentIslandId);
    const nearProject = PROJECTS.find(p => p.id === nearIslandId);

    const isTransitioning = gameMode === 'transitioning';
    const showProject = (gameMode === 'island' || (isTransitioning && projectRendered)) && currentProject;

    const promptVisible = nearProject && gameMode === 'ocean' && !isMobile;
    const promptText = nearProject ? `Press [E] to Dock at ${nearProject.name}` : 'Press [E] to Dock';

    const handleReturn = () => {
        dispatch({ type: 'RETURN_TO_OCEAN' });
    };

    return (
        <>
            <div className={`interaction-prompt ${promptVisible ? 'visible' : ''}`}>
                {promptText}
            </div>

            <div className={`scene-transition ${isTransitioning ? 'active' : ''}`} />

            {showProject && (
                <div className={`project-view ${isProjectContentActive ? 'active' : ''}`}>
                    <ProjectShowcase
                        title={currentProject.name}
                        description={currentProject.description}
                        imageUrl={currentProject.imageUrl}
                        projectUrl={currentProject.projectUrl}
                        onReturn={handleReturn}
                    />
                </div>
            )}
        </>
    );
}