import { useEffect, useState } from 'react';
import { subscribeToRoom, updateGameState, updatePlayer, type GameState, submitGuess, submitMemo } from '../services/gameService';
import type { Player } from '../types/game';

interface UseGameSyncProps {
    roomId: string | null;
    myPlayerId: string | null;
    onStateChange: (newState: GameState) => void;
}

export const useGameSync = ({ roomId, myPlayerId, onStateChange }: UseGameSyncProps) => {
    // Keep track of the last processed update to avoid loops if needed
    // In this simple model, we just trust the DB as source of truth for clients

    // For Host: We push local state changes to DB
    // For Client: We receive DB changes and update local state

    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = subscribeToRoom(roomId, (data) => {
            if (data) {
                if (myPlayerId && data.hostId === myPlayerId) {
                    setIsHost(true);
                } else {
                    setIsHost(false);
                }
                onStateChange(data);
            } else {
                // Room deleted or empty
                // Optional: Handle room closure
            }
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, [roomId, myPlayerId]);

    const syncState = async (updates: Partial<GameState>) => {
        if (!roomId || !isHost) return;
        await updateGameState(roomId, updates);
    };

    const syncMyPlayer = async (updates: Partial<Player>) => {
        if (!roomId || !myPlayerId) return;
        await updatePlayer(roomId, myPlayerId, updates);
    };

    const submitMyGuess = async (targetId: string, value: number) => {
        if (!roomId || !myPlayerId) return;
        await submitGuess(roomId, myPlayerId, targetId, value);
    };

    const submitSharedMemo = async (targetId: string, memo: string) => {
        if (!roomId || !myPlayerId) return;
        await submitMemo(roomId, targetId, memo);
    };

    return {
        isHost,
        syncState,
        syncMyPlayer,
        submitMyGuess,
        submitSharedMemo
    };
};
