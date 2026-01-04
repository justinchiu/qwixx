export type Color = 'red' | 'yellow' | 'green' | 'blue';

export interface DiceRoll {
  white1: number;
  white2: number;
  red: number;
  yellow: number;
  green: number;
  blue: number;
}

export interface RowState {
  marked: number[];
  locked: boolean;
}

export interface PlayerSheet {
  red: RowState;
  yellow: RowState;
  green: RowState;
  blue: RowState;
  penalties: number;
}

export interface Player {
  id: string;
  name: string;
  sheet: PlayerSheet;
  isHost: boolean;
}

export type GamePhase = 'waiting' | 'rolling' | 'white-phase' | 'color-phase' | 'ended';

export interface GameState {
  roomCode: string;
  players: Player[];
  currentPlayerIndex: number;
  dice: DiceRoll | null;
  phase: GamePhase;
  lockedRows: Color[];
  whitePhaseActions: Record<string, boolean>; // playerId -> has acted
  colorPhaseAction: boolean; // has active player acted
}

// Row configurations - Red and Yellow go 2-12, Green and Blue go 12-2
export const ROW_NUMBERS: Record<Color, number[]> = {
  red: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  yellow: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  green: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  blue: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
};

// Scoring table: number of marks -> score
export const SCORING: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 6,
  4: 10,
  5: 15,
  6: 21,
  7: 28,
  8: 36,
  9: 45,
  10: 55,
  11: 66,
  12: 78,
};

// Socket event types
export interface ClientToServerEvents {
  'create-room': (playerName: string) => void;
  'join-room': (roomCode: string, playerName: string) => void;
  'start-game': () => void;
  'roll-dice': () => void;
  'mark-number': (color: Color, number: number) => void;
  'pass-white-phase': () => void;
  'end-turn': () => void;
}

export interface ServerToClientEvents {
  'room-created': (roomCode: string, playerId: string) => void;
  'room-joined': (playerId: string) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'game-started': (state: GameState) => void;
  'dice-rolled': (dice: DiceRoll) => void;
  'state-updated': (state: GameState) => void;
  'game-ended': (finalState: GameState, scores: Record<string, number>) => void;
  'error': (message: string) => void;
}
