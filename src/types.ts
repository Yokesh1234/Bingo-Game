export interface Player {
  id: string;          // Persistent session ID
  socketId: string;    // Current active socket connection ID
  name: string;
  board: number[][];   // 5x5 grid of numbers (1-25)
  ready: boolean;      // True when they have submitted their 5x5 board
  completedLines: number;
  isOnline: boolean;
  isBot?: boolean;     // Whether the player is an automated bot
}

export type GameState = 'BOARD_CREATION' | 'PLAYING' | 'FINISHED';

export interface Room {
  code: string;
  players: Player[];
  gameState: GameState;
  markedNumbers: number[]; // Ordered list of marked numbers
  turnIndex: number;       // Index of the player whose turn it is
  winners: string[];       // Array of player IDs who won
  isBotGame?: boolean;     // True if playing against PC
}

export interface ClientRoomState extends Omit<Room, 'players'> {
  players: Omit<Player, 'board'> & { board?: number[][] }; // other players' boards may be omitted
  myBoard: number[][];                                     // client's own board
}

export interface GameEvent {
  type: 'join' | 'leave' | 'ready' | 'select' | 'win' | 'restart' | 'disconnect' | 'reconnect' | 'success' | 'system';
  playerName?: string;
  text: string;
  payload?: any;
  timestamp: number;
}

// Multi-Game Types
export type PlatformTheme = 'light' | 'dark';
export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export interface GameStats {
  bingoClassicPlayed: number;
  bingoClassicWins: number;
  bingoCustomPlayed: number;
  bingoCustomWins: number;
  dotsPlayed: number;
  dotsWins: number;
  dotsDraws: number;
}

export interface PlatformSettings {
  theme: PlatformTheme;
  soundEnabled: boolean;
  animationSpeed: AnimationSpeed;
  player1Name: string;
  player1Color: string; // Hex or tailwind class
  player2Name: string;
  player2Color: string;
}

// Custom Bingo Types
export interface BingoSetup {
  rows: number;
  cols: number;
  isBotGame: boolean;
  freeCenter: boolean;
  generationMode: 'random' | 'manual';
  winningPatterns: {
    rows: boolean;
    columns: boolean;
    diagonals: boolean;
    corners: boolean;
    xPattern: boolean;
    plusPattern: boolean;
    customPattern: boolean;
  };
}

// Dots and Boxes Types
export interface DotsSetup {
  rows: number;
  cols: number;
  isBotGame: boolean;
}
