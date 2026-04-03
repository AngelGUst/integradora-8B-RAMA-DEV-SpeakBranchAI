// ─── Skill / CEFR ────────────────────────────────────────────────────────────
export type Skill     = 'grammar' | 'vocabulary' | 'reading' | 'listening';
export type CefrZone  = 'atmosfera' | 'orbita' | 'vacio';

// ─── Exercises ───────────────────────────────────────────────────────────────
export interface Option {
  id:      string;
  text:    string;
  correct: boolean;
}

export interface Exercise {
  id:       string;
  skill:    Skill;
  prompt:   string;
  audio?:   string;          // path for listening exercises
  options:  Option[];
  hint?:    string;
}

export interface Checkpoint {
  id:         number;         // 1-9
  altitudePct: number;        // 0-100 — where in the world this lives
  zone:        CefrZone;
  exercise:    Exercise;
  cleared:     boolean;
}

// ─── Game state ───────────────────────────────────────────────────────────────
export type GamePhase =
  | 'intro'           // cinematic zoom-in
  | 'flying'          // spaceship ascending
  | 'checkpoint'      // exercise overlay open
  | 'result_correct'  // brief green flash, ship ascends
  | 'result_wrong'    // brief red flash, ship descends
  | 'victory'         // reached the station
  | 'gameover';       // fuel ran out

export interface GameState {
  phase:          GamePhase;
  altitude:       number;     // 0-100  (0 = ground, 100 = station)
  fuel:           number;     // 0-100
  score:          number;
  streak:         number;
  lives:          number;     // 3 → 0
  checkpoints:    Checkpoint[];
  activeCheckpoint: Checkpoint | null;
  worldOffsetPct: number;     // camera scroll (0-100, drives world translateY)
  shipTilt:       number;     // degrees — positive = lean right on ascend
  thrusterOn:     boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'TICK'; delta: number }
  | { type: 'OPEN_CHECKPOINT'; checkpoint: Checkpoint }
  | { type: 'ANSWER'; correct: boolean }
  | { type: 'DISMISS_RESULT' }
  | { type: 'RESET' };
