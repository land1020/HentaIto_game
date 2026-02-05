export type PlayerId = string;
export type RoomId = string;

export type GamePhase =
  | 'LOBBY'
  | 'SETTING' // 親がお題設定中
  | 'GAME'    // お題決定後、スライダー配置中
  | 'DISCUSSION' // 議論フェーズ
  | 'VOTE'    // 投票完了待ち
  | 'RESULT'  // 結果発表
  | 'FINAL_RESULT'; // 最終結果

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  icon?: string; // Optional icon identifier

  // Game state specific
  handPosition: number | null; // 0-100 position set by player
  targetNumber: number; // The number assigned to this player (1-100)

  // Scoring
  score: number;
  scoreHistory: number[]; // History of scores per round
  cumulativeScore: number; // Cumulative score across all games (for title calculation)

  // Titles
  title: string; // 二つ名

  // Flags
  isReady: boolean;
  isHost: boolean;
  isNpc: boolean;
  awards?: SpecialAward[];
}

export interface GameState {
  roomId: RoomId;
  players: Player[];
  currentPhase: GamePhase;

  // Current Round Info
  currentTurnPlayerId: PlayerId | null; // 親
  theme: string; // お題
  themeRangeMin: string; // 弱い言葉 (1)
  themeRangeMax: string; // 強い言葉 (100)

  // Settings
  timerSeconds: number;
  isDiscussionEnabled: boolean;
  gameMode: 'AUTO' | 'ORIGINAL';
}

export interface RoundResult {
  playerId: string;
  targetNumber: number;
  guesses: Record<string, number>; // guesserId -> val
  scoreGain: number;
}

export interface SpecialAward {
  name: string;
  description: string;
  bonus: number;
}

export interface FinalPlayerStats extends Player {
  awards: SpecialAward[];
}
