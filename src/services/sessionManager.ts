export interface GameSession {
    roomId: string;
    playerId: string;
    playerName: string;
    playerColor: string;
    isDebug: boolean;
    timestamp: number;
}

const SESSION_KEY = 'hentaito_session';

export const saveSession = (
    roomId: string,
    playerId: string,
    playerName: string,
    playerColor: string,
    isDebug: boolean
) => {
    const session: GameSession = {
        roomId,
        playerId,
        playerName,
        playerColor,
        isDebug,
        timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getSession = (): GameSession | null => {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data) as GameSession;
    } catch {
        return null;
    }
};

export const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
};
