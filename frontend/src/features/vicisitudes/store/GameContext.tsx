import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { GameState, GameAction, Checkpoint } from '../types/game.types';
import { CHECKPOINTS } from '../data/exercises.data';

// ─── Initial state ────────────────────────────────────────────────────────────
const INITIAL_STATE: GameState = {
  phase:            'intro',
  altitude:         0,
  fuel:             100,
  score:            0,
  streak:           0,
  lives:            3,
  checkpoints:      CHECKPOINTS.map(c => ({ ...c, cleared: false })),
  activeCheckpoint: null,
  worldOffsetPct:   0,
  shipTilt:         0,
  thrusterOn:       false,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
const ASCEND_SPEED  = 0.018;   // altitude % per ms at base speed
const FUEL_DRAIN    = 0.006;   // fuel % per ms while thrusting
const DESCENT_STEP  = 8;       // altitude lost on wrong answer
const ASCEND_BONUS  = 4;       // altitude gained on correct answer

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'START_GAME':
      return { ...INITIAL_STATE, phase: 'flying', checkpoints: CHECKPOINTS.map(c => ({ ...c, cleared: false })) };

    case 'TICK': {
      if (state.phase !== 'flying') return state;

      const { delta } = action;
      const newFuel    = Math.max(0, Math.min(100, state.fuel - FUEL_DRAIN * delta));
      const ascending  = newFuel > 0;
      const newAlt     = Math.min(100, state.altitude + (ascending ? ASCEND_SPEED * delta : 0));
      const tilt       = ascending ? -4 : 4;

      // Check for victory
      if (newAlt >= 100) return { ...state, phase: 'victory', altitude: 100 };

      // Fuel empty → game over
      if (newFuel <= 0 && state.altitude <= 0)
        return { ...state, phase: 'gameover', fuel: 0 };

      // Check checkpoint collision
      const hit = state.checkpoints.find(
        c => !c.cleared && Math.abs(c.altitudePct - newAlt) < 1.2
      );
      if (hit) {
        return {
          ...state,
          phase:            'checkpoint',
          altitude:         newAlt,
          fuel:             newFuel,
          worldOffsetPct:   newAlt,
          thrusterOn:       false,
          shipTilt:         0,
          activeCheckpoint: hit,
        };
      }

      return {
        ...state,
        altitude:       newAlt,
        fuel:           newFuel,
        worldOffsetPct: newAlt,
        shipTilt:       tilt,
        thrusterOn:     ascending,
      };
    }

    case 'OPEN_CHECKPOINT':
      return { ...state, phase: 'checkpoint', activeCheckpoint: action.checkpoint };

    case 'ANSWER': {
      const { correct } = action;
      const streak      = correct ? state.streak + 1 : 0;
      const scoreGain   = correct ? 100 + streak * 20 : 0;
      const fuelBonus   = correct ? 15 : 0;
      const newAlt      = correct
        ? Math.min(100, state.altitude + ASCEND_BONUS)
        : Math.max(0,   state.altitude - DESCENT_STEP);
      const newFuel     = Math.min(100, state.fuel + fuelBonus);
      const lives       = correct ? state.lives : state.lives - 1;

      const checkpoints = state.checkpoints.map(c =>
        c.id === state.activeCheckpoint?.id ? { ...c, cleared: true } : c
      );

      if (lives <= 0) return { ...state, phase: 'gameover', lives: 0, checkpoints };

      return {
        ...state,
        phase:            correct ? 'result_correct' : 'result_wrong',
        altitude:         newAlt,
        fuel:             newFuel,
        score:            state.score + scoreGain,
        streak,
        lives,
        checkpoints,
        activeCheckpoint: null,
        worldOffsetPct:   newAlt,
      };
    }

    case 'DISMISS_RESULT':
      return { ...state, phase: state.altitude >= 100 ? 'victory' : 'flying' };

    case 'RESET':
      return INITIAL_STATE;

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface GameContextValue {
  state:    GameState;
  dispatch: React.Dispatch<GameAction>;
  // convenience helpers
  startGame:       () => void;
  tick:            (delta: number) => void;
  openCheckpoint:  (cp: Checkpoint) => void;
  submitAnswer:    (correct: boolean) => void;
  dismissResult:   () => void;
  reset:           () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const startGame       = useCallback(() => dispatch({ type: 'START_GAME' }),    []);
  const tick            = useCallback((d: number) => dispatch({ type: 'TICK', delta: d }), []);
  const openCheckpoint  = useCallback((cp: Checkpoint) => dispatch({ type: 'OPEN_CHECKPOINT', checkpoint: cp }), []);
  const submitAnswer    = useCallback((correct: boolean) => dispatch({ type: 'ANSWER', correct }), []);
  const dismissResult   = useCallback(() => dispatch({ type: 'DISMISS_RESULT' }), []);
  const reset           = useCallback(() => dispatch({ type: 'RESET' }),          []);

  return (
    <GameContext.Provider value={{ state, dispatch, startGame, tick, openCheckpoint, submitAnswer, dismissResult, reset }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
