import { createContext, useReducer, useContext, ReactNode } from 'react';

type GameMode = 'intro' | 'dialogue' | 'ocean' | 'island' | 'transitioning';

type State = {
    gameMode: GameMode;
    projectRendered: boolean;
    mapMode: 'minimap' | 'full';
    isNearIsland: boolean;
};

type Action =
    | { type: 'START_GAME' }
    | { type: 'DIALOGUE_COMPLETE' } // New action
    | { type: 'TOGGLE_MAP' }
    | { type: 'ENTER_ISLAND' }
    | { type: 'RETURN_TO_OCEAN' }
    | { type: 'TRANSITION_COMPLETE' }
    | { type: 'SET_NEAR_ISLAND'; payload: boolean };

const initialState: State = {
    gameMode: 'intro',
    projectRendered: false,
    mapMode: 'minimap',
    isNearIsland: false,
};

function gameReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'START_GAME':
            if (state.gameMode !== 'intro') return state;
            return { ...state, gameMode: 'dialogue' }; // Transition to dialogue first
        case 'DIALOGUE_COMPLETE':
            if (state.gameMode !== 'dialogue') return state;
            return { ...state, gameMode: 'ocean' }; // Then transition to the ocean
        case 'TOGGLE_MAP':
            if (state.gameMode !== 'ocean') return state;
            return { ...state, mapMode: state.mapMode === 'minimap' ? 'full' : 'minimap' };
        case 'SET_NEAR_ISLAND':
            return { ...state, isNearIsland: action.payload };
        case 'ENTER_ISLAND':
            if (state.gameMode !== 'ocean' || !state.isNearIsland) return state;
            return { ...state, gameMode: 'transitioning' };
        case 'RETURN_TO_OCEAN':
            if (state.gameMode !== 'island') return state;
            return { ...state, gameMode: 'transitioning' };
        case 'TRANSITION_COMPLETE':
            if (state.projectRendered) {
                return { ...state, gameMode: 'ocean', projectRendered: false };
            } else {
                return { ...state, gameMode: 'island', projectRendered: true };
            }
        default:
            return state;
    }
}

type GameContextType = {
    state: State;
    dispatch: React.Dispatch<Action>;
};

const GameStateContext = createContext<GameContextType | null>(null);

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    return <GameStateContext.Provider value={{ state, dispatch }}>{children}</GameStateContext.Provider>;
};

export const useGameState = () => {
    const context = useContext(GameStateContext);
    if (!context) {
        throw new Error('useGameState must be used within a GameStateProvider');
    }
    return context;
};