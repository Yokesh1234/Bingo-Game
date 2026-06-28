export interface Player {
  id: string;          // Persistent session ID
  socketId: string;    // Current active socket connection ID
  name: string;
  board: number[][];   // 5x5 grid of numbers (1-25)
  ready: boolean;      // True when they have submitted their 5x5 board
  completedLines: number;
  isOnline: boolean;
}

export type GameState = 'BOARD_CREATION' | 'PLAYING' | 'FINISHED';

export interface Room {
  code: string;
  players: Player[];
  gameState: GameState;
  markedNumbers: number[]; // Ordered list of marked numbers
  turnIndex: number;       // Index of the player whose turn it is
  winners: string[];       // Array of player IDs who won
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
