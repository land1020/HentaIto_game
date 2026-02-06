import { ref, set, get, update, onValue, remove } from "firebase/database";
import { database } from "../firebase";
import type { Player, GamePhase, RoundResult } from "../types/game";
import type { Theme } from "../data/themes";

export interface GameState {
    hostId: string;
    phase: GamePhase;
    players: Record<string, Player>;
    settings: any; // GameSettings
    roundCount: number;
    currentTheme: Theme | null;
    themeCandidates: Theme[];
    usedThemeTexts: string[]; // Store as array for DB
    currentTurnPlayerId?: string | null;
    sharedMemos: Record<string, string>;
    allGuesses: Record<string, Record<string, number>>;
    discussionVoted?: Record<string, boolean>;
    roundResults: any[];
    gameHistory: RoundResult[][];
    lastUpdated: number;
}

// Generate a random 4-digit room ID
export const generateRoomId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const checkRoomExists = async (roomId: string): Promise<boolean> => {
    const snapshot = await get(ref(database, 'rooms/' + roomId));
    return snapshot.exists();
};

export const createRoom = async (hostName: string, hostColor: string, customRoomId?: string): Promise<{ roomId: string, playerId: string }> => {
    const roomId = customRoomId || generateRoomId();
    const playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const hostPlayer: Player = {
        id: playerId,
        name: hostName,
        color: hostColor,
        score: 0,
        scoreHistory: [],
        cumulativeScore: 0,
        title: '新人',
        targetNumber: 0,
        handPosition: null, // 0-100 position set by player
        isReady: false,
        isHost: true,
        isNpc: false,
        awards: []
    };

    const initialGameState: GameState = {
        hostId: playerId,
        phase: 'LOBBY',
        players: {
            [playerId]: hostPlayer
        },
        settings: {
            gameMode: 'AUTO',
            isDiscussionEnabled: false,
            timerSeconds: 180,
            includeNormalThemes: true,
            includeAbnormalThemes: false
        },
        roundCount: 0,
        currentTheme: null,
        themeCandidates: [],
        usedThemeTexts: [],
        sharedMemos: {},
        allGuesses: {},
        roundResults: [],
        gameHistory: [],
        lastUpdated: Date.now()
    };

    await set(ref(database, 'rooms/' + roomId), initialGameState);
    return { roomId, playerId };
};

export const joinRoom = async (roomId: string, playerName: string, playerColor: string): Promise<{ success: boolean, playerId?: string, error?: string }> => {
    const roomRef = ref(database, 'rooms/' + roomId);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        return { success: false, error: "Room not found" };
    }

    const gameState = snapshot.val() as GameState;

    if (gameState.phase !== 'LOBBY') {
        return { success: false, error: "Game already started" };
    }

    const playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newPlayer: Player = {
        id: playerId,
        name: playerName,
        color: playerColor,
        score: 0,
        scoreHistory: [],
        cumulativeScore: 0,
        title: '新人',
        targetNumber: 0,
        handPosition: null,
        isReady: false,
        isHost: false,
        isNpc: false,
        awards: []
    };

    await set(ref(database, `rooms/${roomId}/players/${playerId}`), newPlayer);
    return { success: true, playerId };
};

export const subscribeToRoom = (roomId: string, callback: (data: GameState | null) => void) => {
    const roomRef = ref(database, 'rooms/' + roomId);
    return onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
};

export const updateGameState = async (roomId: string, updates: Partial<GameState>) => {
    const roomRef = ref(database, 'rooms/' + roomId);
    updates.lastUpdated = Date.now();
    await update(roomRef, updates);
};

export const updatePlayer = async (roomId: string, playerId: string, updates: Partial<Player>) => {
    const playerRef = ref(database, `rooms/${roomId}/players/${playerId}`);
    await update(playerRef, updates);
};

export const deleteRoom = async (roomId: string) => {
    await remove(ref(database, 'rooms/' + roomId));
};

export const submitGuess = async (roomId: string, guesserId: string, targetId: string, value: number) => {
    // rooms/roomId/allGuesses/guesserId/targetId = value
    const path = `rooms/${roomId}/allGuesses/${guesserId}`;
    await update(ref(database, path), { [targetId]: value });
};

export const submitMemo = async (roomId: string, playerId: string, memo: string) => {
    const path = `rooms/${roomId}/sharedMemos`;
    await update(ref(database, path), { [playerId]: memo });
};

export const submitDiscussionCompletion = async (roomId: string, playerId: string) => {
    const path = `rooms/${roomId}/discussionVoted`;
    await update(ref(database, path), { [playerId]: true });
};
