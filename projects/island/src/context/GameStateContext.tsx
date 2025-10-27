import { createContext, useReducer, useContext, ReactNode } from 'react';

type GameMode = 'intro' | 'dialogue' | 'ocean' | 'island' | 'transitioning';

type State = {
    gameMode: GameMode;
    isLoading: boolean;
    isLoaded: boolean;
    projectRendered: boolean;
    mapMode: 'minimap' | 'full';
    nearIslandId: string | null;
    currentIslandId: string | null;
};

type Action =
    | { type: 'START_LOADING' }
    | { type: 'FINISH_LOADING' }
    | { type: 'DIALOGUE_COMPLETE' }
    | { type: 'TOGGLE_MAP' }
    | { type: 'ENTER_ISLAND'; payload: string }
    | { type: 'RETURN_TO_OCEAN' }
    | { type: 'TRANSITION_COMPLETE' }
    | { type: 'SET_NEAR_ISLAND'; payload: string | null };

const initialState: State = {
    gameMode: 'intro',
    isLoading: false,
    isLoaded: false,
    projectRendered: false,
    mapMode: 'minimap',
    nearIslandId: null,
    currentIslandId: null,
};

function gameReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'START_LOADING':
            if (state.gameMode !== 'intro' || state.isLoading) return state;
            return { ...state, isLoading: true };

        case 'FINISH_LOADING':
            if (!state.isLoading || state.isLoaded) return state;
            return { ...state, isLoading: false, isLoaded: true, gameMode: 'dialogue' };

        case 'DIALOGUE_COMPLETE':
            if (state.gameMode !== 'dialogue') return state;
            return { ...state, gameMode: 'ocean' };

        case 'TOGGLE_MAP':
            if (state.gameMode !== 'ocean') return state;
            return { ...state, mapMode: state.mapMode === 'minimap' ? 'full' : 'minimap' };
        case 'SET_NEAR_ISLAND':
            return { ...state, nearIslandId: action.payload };
        case 'ENTER_ISLAND':
            if (state.gameMode !== 'ocean' || !state.nearIslandId) return state;
            return { ...state, gameMode: 'transitioning', currentIslandId: action.payload };
        case 'RETURN_TO_OCEAN':
            if (state.gameMode !== 'island') return state;
            return { ...state, gameMode: 'transitioning' };
        case 'TRANSITION_COMPLETE':
            if (state.projectRendered) {
                return { ...state, gameMode: 'ocean', projectRendered: false, currentIslandId: null };
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