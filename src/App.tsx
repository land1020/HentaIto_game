import { useState, useEffect } from 'react';
import './index.css';
import { EntryScreen } from './components/screens/EntryScreen';
import { LobbyScreen, type GameSettings } from './components/screens/LobbyScreen';
import { GameScreen } from './components/screens/GameScreen';
import { ThemeSelectionScreen } from './components/screens/ThemeSelectionScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { FinalResultScreen } from './components/screens/FinalResultScreen';
import type { Player, GamePhase, RoundResult, SpecialAward } from './types/game';
import { NormalWords, WinnerWords, AbnormalWords, DangerWords, DecoratorWords } from './data/wordList';
import { THEMES, type Theme } from './data/themes';
import { useGameSync } from './hooks/useGameSync';
import type { GameState } from './services/gameService';
import { saveSession, getSession, clearSession } from './services/sessionManager';

function App() {
  // --- Game State ---
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('LOBBY');

  // Local User Info
  const [myPlayerName, setMyPlayerName] = useState('');
  // const [myPlayerColor, setMyPlayerColor] = useState(''); // Removed unused state
  const [roomId, setRoomId] = useState('');
  const [myPlayerId, setMyPlayerId] = useState('');
  const [isDebug, setIsDebug] = useState(false);

  // Game Data
  const [players, setPlayers] = useState<Player[]>([]);
  // Initialize with defaults to avoid null checks
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    gameMode: 'AUTO',
    isDiscussionEnabled: false,
    timerSeconds: 180,
    includeNormalThemes: true,
    includeAbnormalThemes: false
  });
  const [roundCount, setRoundCount] = useState(0); // 0-indexed internally

  // Current Round Data
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [themeCandidates, setThemeCandidates] = useState<Theme[]>([]);
  const [sharedMemos, setSharedMemos] = useState<Record<string, string>>({});
  const [usedThemeTexts, setUsedThemeTexts] = useState<Set<string>>(new Set());

  // Results Data
  const [allGuesses, setAllGuesses] = useState<Record<string, Record<string, number>>>({});
  const [roundResults, setRoundResults] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<RoundResult[][]>([]); // Full history

  // Navigation Logic
  // Initial Entry -> Lobby
  const [entryDone, setEntryDone] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // --- Effects ---

  // Restore Session
  useEffect(() => {
    const session = getSession();
    if (session) {
      setMyPlayerName(session.playerName);
      setRoomId(session.roomId);
      setIsDebug(session.isDebug);
      setMyPlayerId(session.playerId);
      setEntryDone(true);
      setCurrentPhase('LOBBY');
    }
    setIsRestoring(false);
  }, []);

  // --- Online Sync Hook ---
  const handleOnlineStateChange = (newState: GameState) => {
    // Sync local state from remote
    // Safely handle players - convert from object to array, or use empty array
    const playersArray = newState.players ? Object.values(newState.players) : [];
    setPlayers(playersArray);
    setCurrentPhase(newState.phase);
    if (newState.settings) setGameSettings(newState.settings);
    setRoundCount(newState.roundCount || 0);
    if (newState.currentTheme) setCurrentTheme(newState.currentTheme);
    setThemeCandidates(newState.themeCandidates || []);
    setSharedMemos(newState.sharedMemos || {});
    // Reconstruct Set from array
    setUsedThemeTexts(new Set(newState.usedThemeTexts || []));
    setAllGuesses(newState.allGuesses || {});
    setRoundResults(newState.roundResults || []);
    setGameHistory(newState.gameHistory || []);
  };

  const { isHost, syncState, syncMyPlayer, submitMyGuess, submitMyMemo } = useGameSync({
    roomId: roomId || null,
    myPlayerId: myPlayerId || null,
    onStateChange: handleOnlineStateChange
  });

  // --- Effects ---

  useEffect(() => {
    // Host Logic: Check if we should advance from GAME to DISCUSSION or RESULT
    if (roomId && isHost) {
      const allVoted = players.length > 0 && Object.keys(allGuesses).length === players.length;

      if (allVoted) {
        if (currentPhase === 'GAME') {
          if (gameSettings.isDiscussionEnabled) {
            // If not already moving, move to DISCUSSION
            // Add a small delay for UX? Or just go.
            updateGameFn({ phase: 'DISCUSSION' });
          } else {
            // Go to RESULT immediately
            // We need to calculate results on Host and sync them
            // But calculateAndShowResults uses local state setter. 
            // We should adapt it or call it, then it calls updateGameFn inside?
            // Wait... calculateAndShowResults calls setRoundResults, setGameHistory, setPlayers locally.
            // We need an online version of calculateAndShowResults.

            // Let's refactor calculateAndShowResults to RETURN data, then we use updateGameFn.
            // Or just modify 'calculateAndShowResults' to handle online check inside.
            calculateAndShowResults(allGuesses);
          }
        }
      }
    }
  }, [roomId, isHost, currentPhase, allGuesses, players.length, gameSettings.isDiscussionEnabled]);


  // --- Handlers ---

  const handleJoin = (name: string, room: string, debug: boolean, color: string, myPid?: string) => {
    setMyPlayerName(name);
    setRoomId(room);
    setIsDebug(debug);

    if (myPid) {
      setMyPlayerId(myPid);
      // Save session if online
      if (room) {
        saveSession(room, myPid, name, color, debug);
      }
    }

    setEntryDone(true);
    setCurrentPhase('LOBBY');

    if (!room) {
      // Local Mode
      const me: Player = {
        id: 'p1', name: name, color: color, score: 0, scoreHistory: [], cumulativeScore: 0, title: '新人',
        targetNumber: 0, handPosition: null, isReady: true, isHost: true, isNpc: false, awards: []
      };
      setPlayers([me]);
    }
  };

  const handleLeaveGame = () => {
    if (confirm('ゲームを終了して部屋から退出しますか？')) {
      clearSession();
      setEntryDone(false);
      setRoomId('');
      setMyPlayerId('');
      setPlayers([]);
      setCurrentPhase('LOBBY');
      window.location.reload();
    }
  };

  const calculateTitle = (score: number) => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    if (score >= 0) return pick(WinnerWords);
    if (score <= -120) return pick(DecoratorWords) + pick(DangerWords);
    if (score <= -90) return pick(DangerWords);
    if (score <= -60) return pick(AbnormalWords);
    if (score <= -30) return pick(NormalWords);
    return pick(NormalWords);
  };

  // WRAPPER: Update State (Local or Online)
  const updateGameFn = async (updates: Partial<GameState>) => {
    if (roomId) {
      if (isHost) {
        await syncState(updates);
      }
    } else {
      // Local Update
      if (updates.phase) setCurrentPhase(updates.phase);
      if (updates.settings) setGameSettings(updates.settings as GameSettings);
      if (updates.roundCount !== undefined) setRoundCount(updates.roundCount);
      if (updates.currentTheme) setCurrentTheme(updates.currentTheme);
      if (updates.themeCandidates) setThemeCandidates(updates.themeCandidates);
      if (updates.sharedMemos) setSharedMemos(updates.sharedMemos);
      // For Set, we need special handling if we were passing it, but usually we pass array in 'updates'
      if (updates.usedThemeTexts) setUsedThemeTexts(new Set(updates.usedThemeTexts));
      if (updates.allGuesses) setAllGuesses(updates.allGuesses);
    }
  };

  const handleStartGame = (settings: GameSettings, myColor?: string) => {
    // If Online, myColor is already set or passed, but we might update settings.

    if (roomId) {
      if (!isHost) return;

      const usedNumbers = new Set<number>();
      // Ensure we operate on current players from state
      const numPlayers = players.map((p, idx) => {
        let num;
        do { num = Math.floor(Math.random() * 100) + 1; } while (usedNumbers.has(num));
        usedNumbers.add(num);
        return { ...p, targetNumber: num, isHost: idx === 0, handPosition: null, awards: [] };
      });

      // Online: We need to trigger startRound logic here too
      // startRound will handle the rest via updateGameFn
      startRound(numPlayers, 0, settings);

    } else {
      setGameSettings(settings);

      const me: Player = {
        id: 'p1', name: myPlayerName, color: myColor || '#FF6B6B', score: 0, scoreHistory: [], cumulativeScore: 0,
        title: '新人', targetNumber: 0, handPosition: null, isReady: true, isHost: true, isNpc: false, awards: []
      };

      const npcs: Player[] = [];
      if (isDebug) {
        npcs.push({
          id: 'npc1', name: 'NPCタロウ', color: '#4ECDC4', score: 0, scoreHistory: [], cumulativeScore: 0, title: '新人',
          targetNumber: 0, handPosition: null, isReady: true, isHost: false, isNpc: true, awards: []
        });
        npcs.push({
          id: 'npc2', name: 'NPCハナコ', color: '#FFE66D', score: 0, scoreHistory: [], cumulativeScore: 0, title: '新人',
          targetNumber: 0, handPosition: null, isReady: true, isHost: false, isNpc: true, awards: []
        });
      }

      const allPlayers = [me, ...npcs];
      setPlayers(allPlayers);
      setRoundCount(0);
      startRound(allPlayers, 0, settings);
    }
  };

  // Helper to pick candidates based on settings (and history)
  const pickThemeCandidates = (settings: GameSettings) => {
    let pool: Theme[] = [];

    // Add Normal Themes
    if (settings.includeNormalThemes) {
      pool = [...pool, ...THEMES.filter(t => t.genre === 'NORMAL')];
    }

    // Add Abnormal Themes
    if (settings.includeAbnormalThemes) {
      pool = [...pool, ...THEMES.filter(t => t.genre === 'ABNORMAL')];
    }

    // Fallback if no genre selected (should be prevented by UI, but safe guard)
    if (pool.length === 0) {
      // Default to Normal if nothing selected
      pool = THEMES.filter(t => t.genre === 'NORMAL');
      if (pool.length === 0) pool = [...THEMES]; // Absolute fallback
    }

    // Filter out used themes
    // Note: usedThemeTexts is from closure, which might be stale if called in loop?
    // But pickThemeCandidates is called from startRound, which is key context.
    // However, if we need to reset, we need to know WHICH genre was exhausted.
    // For simplicity: If available pool size < 2, we consider it exhausted.

    // Check available valid themes (Pool - Used)
    const availablePool = pool.filter(t => !usedThemeTexts.has(t.text));

    let selectionPool = availablePool;

    // Reset Logic: If not enough themes left to pick 2 (or just empty), we consider the pool exhausted.
    // We will handle the actual state update for 'usedThemeTexts' in 'startRound'.
    // For this function call, if exhausted, we just pick from the full pool.
    if (selectionPool.length < 2) {
      selectionPool = pool;
    }

    const candidates: Theme[] = [];
    const tempThemes = [...selectionPool];

    for (let i = 0; i < 2; i++) {
      if (tempThemes.length === 0) break;
      const idx = Math.floor(Math.random() * tempThemes.length);
      candidates.push(tempThemes[idx]);
      tempThemes.splice(idx, 1);
    }

    return candidates;
  };

  const startRound = (currentPlayers: Player[], rIndex: number, settings?: GameSettings) => {
    const currentSettings = settings || gameSettings;

    // 1. Assign Numbers (Locally calculated by Host)
    const usedNumbers = new Set<number>();
    const newPlayers = currentPlayers.map(p => {
      let num;
      do { num = Math.floor(Math.random() * 100) + 1; } while (usedNumbers.has(num));
      usedNumbers.add(num);
      return { ...p, targetNumber: num, isHost: false, handPosition: null };
    });

    const hostIdx = rIndex % newPlayers.length;
    newPlayers[hostIdx].isHost = true;

    // 2. Prepare Theme Selection
    let pool: Theme[] = [];
    if (currentSettings.includeNormalThemes) pool = [...pool, ...THEMES.filter(t => t.genre === 'NORMAL')];
    if (currentSettings.includeAbnormalThemes) pool = [...pool, ...THEMES.filter(t => t.genre === 'ABNORMAL')];
    if (pool.length === 0) pool = THEMES.filter(t => t.genre === 'NORMAL');

    const availableCount = pool.filter(t => !usedThemeTexts.has(t.text)).length;
    let nextcandidates: Theme[] = [];
    let nextUsedTexts = new Set(usedThemeTexts);

    if (availableCount < 2) {
      const poolTexts = new Set(pool.map(t => t.text));
      // Reset used texts for current pool
      nextUsedTexts = new Set([...nextUsedTexts].filter(t => !poolTexts.has(t)));

      const tempThemes = [...pool];
      for (let i = 0; i < 2; i++) {
        if (tempThemes.length === 0) break;
        const idx = Math.floor(Math.random() * tempThemes.length);
        nextcandidates.push(tempThemes[idx]);
        tempThemes.splice(idx, 1);
      }
    } else {
      nextcandidates = pickThemeCandidates(currentSettings);
    }

    // UPDATE STATE
    if (roomId && isHost) {
      // Online Host Update
      const playersObj: Record<string, Player> = {};
      newPlayers.forEach(p => playersObj[p.id] = p);

      updateGameFn({
        players: playersObj,
        phase: 'SETTING',
        themeCandidates: nextcandidates,
        usedThemeTexts: Array.from(nextUsedTexts),
        settings: currentSettings,
        roundCount: rIndex,
        sharedMemos: {},
        allGuesses: {}
      });
    } else {
      // Local Update
      setPlayers(newPlayers);
      setThemeCandidates(nextcandidates);
      setUsedThemeTexts(nextUsedTexts);
      setSharedMemos({});
      setAllGuesses({});
      setCurrentPhase('SETTING');
    }
  };

  const handleThemeSelected = (theme: Theme) => {
    const nextUsed = new Set(usedThemeTexts);
    nextUsed.add(theme.text);

    if (roomId && isHost) {
      updateGameFn({
        currentTheme: theme,
        phase: 'GAME',
        usedThemeTexts: Array.from(nextUsed)
      });
    } else {
      setUsedThemeTexts(nextUsed);
      setCurrentTheme(theme);
      setCurrentPhase('GAME');
    }
  };

  // Helper: Generate/Collect all votes (including NPCs)
  const generateVotes = (myPlacements: Record<string, number>): Record<string, Record<string, number>> => {
    const votes: Record<string, Record<string, number>> = {};

    // My Vote
    votes['p1'] = myPlacements;

    // NPC Votes
    players.forEach(guesser => {
      if (guesser.id === 'p1') return; // Skip me

      votes[guesser.id] = {};
      players.forEach(target => {
        if (guesser.id === target.id) return; // Don't guess self

        // NPC guess logic
        let error = Math.floor(Math.random() * 20) - 10;
        if (Math.random() > 0.8) error = Math.floor(Math.random() * 60) - 30;
        let guess = target.targetNumber + error;
        guess = Math.max(1, Math.min(100, guess));
        votes[guesser.id][target.id] = guess;
      });
    });
    return votes;
  };

  // Helper: Calculate total score with awards and rank bonuses
  const calculateTotalScore = (currentPlayers: Player[], history: RoundResult[][]) => {
    // 1. Calculate Base Scores & Initialize Awards
    // Also update cumulativeScore (previous cumulative + this round's raw score)
    let tempPlayers = currentPlayers.map(p => {
      // Base score is sum of history (raw game scores)
      const baseScore = p.scoreHistory.reduce((a, b) => a + b, 0);
      // Get the latest round's score (last item in history for this player)
      const latestRound = history.length > 0 ? history[history.length - 1] : [];
      const latestResult = latestRound.find((r: RoundResult) => r.playerId === p.id);
      const latestRoundScore = latestResult ? latestResult.scoreGain : 0;
      // Update cumulative score: previous cumulative + this round's score
      const newCumulativeScore = p.cumulativeScore + latestRoundScore;
      return { ...p, score: baseScore, cumulativeScore: newCumulativeScore, awards: [] as SpecialAward[] };
    });

    const awardUpdates: Record<string, SpecialAward[]> = {};
    tempPlayers.forEach(p => awardUpdates[p.id] = []);

    // 2. Special Awards Calculation (Same logic as before)
    // True Understander / Zero Empathy
    let bestGuesserId = '';
    let worstGuesserId = '';
    let minTotalDiff = Infinity;
    let maxTotalDiff = -1;

    tempPlayers.forEach(guesser => {
      let myTotalDiff = 0;
      history.forEach(round => {
        round.forEach((res: RoundResult) => {
          if (res.playerId === guesser.id) return;
          const myGuess = res.guesses[guesser.id];
          if (myGuess !== undefined) {
            myTotalDiff += Math.abs(myGuess - res.targetNumber);
          }
        });
      });

      if (myTotalDiff < minTotalDiff) {
        minTotalDiff = myTotalDiff;
        bestGuesserId = guesser.id;
      }
      if (myTotalDiff > maxTotalDiff) {
        maxTotalDiff = myTotalDiff;
        worstGuesserId = guesser.id;
      }
    });

    if (bestGuesserId) {
      awardUpdates[bestGuesserId].push({ name: '真の理解者', description: '他プレイヤーとのズレが最も少なかった', bonus: 50 });
    }
    if (worstGuesserId && worstGuesserId !== bestGuesserId) {
      awardUpdates[worstGuesserId].push({ name: '共感性0', description: '他プレイヤーとのズレが最も大きかった', bonus: -50 });
    }

    // Perfect Match
    tempPlayers.forEach(guesser => {
      history.forEach(round => {
        round.forEach((res: RoundResult) => {
          if (res.playerId === guesser.id) return;
          const myGuess = res.guesses[guesser.id];
          if (myGuess === res.targetNumber) {
            awardUpdates[guesser.id].push({ name: 'ピッタリ賞', description: 'ズレ0で正解した', bonus: 20 });
          }
        });
      });
    });

    // 3. Apply Awards & Sort for Ranking
    tempPlayers = tempPlayers.map(p => {
      const myAwards = awardUpdates[p.id] || [];
      const awardBonus = myAwards.reduce((sum, a) => sum + a.bonus, 0);
      return {
        ...p,
        score: p.score + awardBonus,
        awards: myAwards
      };
    });

    // Sort descending
    tempPlayers.sort((a, b) => b.score - a.score);

    // 4. Apply Rank Bonuses (100, 50, 30) - Per Round? Or Accumulated?
    // "Result announcement every time... rank score addition"
    // If we re-calculate from scratch every time, we should only add "Current Rank Bonus" to the display score,
    // NOT "Sum of all previous rank bonuses".
    // Because if we sum proper index-based bonuses every round, the score would explode?
    // User said "Final result... (at the end) NO special awards or rank addition".
    // This implies that the score at the end IS the score.
    // So we should add rank bonus to the score now.

    // However, if we recalculate baseScore from scoreHistory (raw scores),
    // we lose the "Rank Bonus" from previous rounds if we don't store it.
    // So "Rank Bonus" should probably be treated as a "Current Standing Bonus" that is transient?
    // OR we should save "Rank Bonus" into scoreHistory? No, scoreHistory is for raw game gain.

    // Interpretation: Rank Bonus is added to the "Current Total Score" for display/final checking.
    // It is valid for the current standing.
    // So logic: Base + Awards + RankBonus = CurrentTotal.

    const rankBonuses = [100, 50, 30];
    tempPlayers = tempPlayers.map((p, idx) => {
      const bonus = rankBonuses[idx] || 0;
      if (bonus > 0) {
        const newAwards = [...(p as any).awards, { name: `${idx + 1}位`, description: '順位ボーナス', bonus }];
        return {
          ...p,
          score: p.score + bonus,
          awards: newAwards,
          title: calculateTitle(p.cumulativeScore) // Update title based on cumulative score
        };
      }
      return {
        ...p,
        title: calculateTitle(p.cumulativeScore) // Use cumulative score for title
      };
    });

    return tempPlayers;
  };

  const calculateAndShowResults = (finalGuesses: Record<string, Record<string, number>>) => {
    const currentResults: any[] = [];

    players.forEach(player => {
      // 1. Incoming Guesses (Others guessing me)
      // "How well did I convey my theme?"
      const guessesForMe: Record<string, number> = {};
      let incomingDiff = 0;

      Object.keys(finalGuesses).forEach(guesserId => {
        const val = finalGuesses[guesserId][player.id];
        if (val !== undefined && guesserId !== player.id) {
          guessesForMe[guesserId] = val;
          incomingDiff += Math.abs(val - player.targetNumber);
        }
      });

      // 2. Outgoing Guesses (Me guessing others)
      // "How well did I understand others?"
      let outgoingDiff = 0;
      const myGuesses = finalGuesses[player.id] || {};
      Object.entries(myGuesses).forEach(([targetId, val]) => {
        const target = players.find(p => p.id === targetId);
        if (target) {
          outgoingDiff += Math.abs(val - target.targetNumber);
        }
      });

      const totalDiff = incomingDiff + outgoingDiff;
      const scoreGain = -Math.round(totalDiff);
      const incomingScore = -Math.round(incomingDiff);
      const outgoingScore = -Math.round(outgoingDiff);

      currentResults.push({
        playerId: player.id,
        targetNumber: player.targetNumber,
        guesses: guessesForMe,
        scoreGain,
        incomingScore,
        outgoingScore
      });
    });

    setRoundResults(currentResults);

    // Create temp updated players with raw score history updated
    let tempPlayers = players.map(p => {
      const res = currentResults.find((r: any) => r.playerId === p.id);
      const gain = res ? res.scoreGain : 0;
      // We push to history, but we don't update 'score' yet because calculateTotalScore will do it from history
      return {
        ...p,
        scoreHistory: [...p.scoreHistory, gain]
      };
    });

    // Temp history including this round
    const newHistory = [...gameHistory, currentResults];
    // Recalculate everything (Awards, Ranks)
    const finalPlayers = calculateTotalScore(tempPlayers, newHistory);

    if (roomId && isHost) {
      const playersObj: Record<string, Player> = {};
      finalPlayers.forEach(p => playersObj[p.id] = p);

      updateGameFn({
        roundResults: currentResults,
        gameHistory: newHistory,
        players: playersObj,
        phase: 'RESULT'
      });
    } else {
      setRoundResults(currentResults);
      setGameHistory(newHistory); // Commit history state
      setPlayers(finalPlayers);
      setCurrentPhase('RESULT');
    }
  };

  const handleVote = async (myPlacements: Record<string, number>, myWord: string) => {
    if (roomId) {
      // Online Mode
      await submitMyMemo(myWord);
      for (const [targetId, val] of Object.entries(myPlacements)) {
        await submitMyGuess(targetId, val);
      }

      // Handle phase transitions
      if (currentPhase === 'DISCUSSION') {
        // In DISCUSSION phase, after submitting final votes, host calculates results
        if (isHost) {
          // Wait a moment for votes to sync, then calculate
          setTimeout(() => {
            // Use current allGuesses merged with my latest placements
            const finalGuesses = { ...allGuesses, [myPlayerId]: myPlacements };
            calculateAndShowResults(finalGuesses);
          }, 500);
        }
      }
      // For GAME phase, the useEffect handles the transition
    } else {
      // Local Mode
      setSharedMemos(prev => ({ ...prev, p1: myWord }));
      let currentGuesses = generateVotes(myPlacements);

      if (currentPhase === 'GAME') {
        if (gameSettings.isDiscussionEnabled) {
          setAllGuesses(currentGuesses);
          setCurrentPhase('DISCUSSION');
        } else {
          calculateAndShowResults(currentGuesses);
        }
      } else if (currentPhase === 'DISCUSSION') {
        const finalGuesses = { ...allGuesses, p1: myPlacements };
        calculateAndShowResults(finalGuesses);
      }
    }
  };

  const handleNextRound = () => {
    if (roomId && !isHost) return;

    const nextRound = roundCount + 1;

    // End of game check
    if (nextRound >= players.length) {
      const finalPlayers = players.map(p => {
        const baseScore = p.scoreHistory.reduce((a, b) => a + b, 0);
        return {
          ...p,
          score: baseScore,
          awards: [],
          title: calculateTitle(p.cumulativeScore)
        };
      });

      finalPlayers.sort((a, b) => b.score - a.score);

      if (roomId && isHost) {
        const playersObj: Record<string, Player> = {};
        finalPlayers.forEach(p => playersObj[p.id] = p);
        updateGameFn({
          players: playersObj,
          phase: 'FINAL_RESULT'
        });
      } else {
        setRoundCount(nextRound);
        setPlayers(finalPlayers);
        setCurrentPhase('FINAL_RESULT');
      }
      return;
    }

    if (roomId && isHost) {
      startRound(players, nextRound);
    } else {
      setRoundCount(nextRound);
      startRound(players, nextRound);
    }
  };

  const handleBackToLobby = () => {
    if (roomId && isHost) {
      updateGameFn({
        phase: 'LOBBY',
        roundCount: 0,
        roundResults: [], // Clear on server? structure of partial update might need fix
        // Simplified: Just phase change creates visual reset
      });
    } else {
      setRoundCount(0);
      setPlayers([]);
      setRoundResults([]);
      setCurrentPhase('LOBBY');
    }
  };

  const handleUpdateMemo = (pid: string, text: string) => {
    if (roomId) {
      if (pid === myPlayerId) {
        submitMyMemo(text);
      }
    } else {
      setSharedMemos(prev => ({ ...prev, [pid]: text }));
    }
  };

  const handleUpdateColor = async (color: string) => {
    if (roomId && myPlayerId) {
      await syncMyPlayer({ color });
    } else {
      // Local: update my player in list
      setPlayers(prev => prev.map(p => p.id === 'p1' ? { ...p, color } : p));
    }
  };

  // --- Render ---

  if (isRestoring) {
    return <div className="loading-screen">Session Restoring...</div>;
  }

  if (!entryDone) {
    return <EntryScreen onJoin={handleJoin} />;
  }

  // Find host (Logic update: trust state)
  const hostPlayer = players.find(p => p.isHost) || players[0];
  const amIHost = roomId ? isHost : (hostPlayer?.id === 'p1');

  switch (currentPhase) {
    case 'LOBBY':
      return (
        <LobbyScreen
          roomId={roomId}
          players={players}
          myPlayerId={myPlayerId || 'p1'}
          onStartGame={handleStartGame}
          onUpdateColor={handleUpdateColor}
          onLeave={handleLeaveGame}
        />
      );
    case 'SETTING':
      return (
        <ThemeSelectionScreen
          hostName={hostPlayer?.name || 'Host'}
          isHost={amIHost}
          gameMode={gameSettings.gameMode}
          candidates={themeCandidates}
          onSelect={handleThemeSelected}
        />
      );
    case 'GAME':
    case 'DISCUSSION':
      return (
        <GameScreen
          players={players}
          myId={myPlayerId || 'p1'}
          theme={currentTheme}
          onVote={handleVote}
          phase={currentPhase as 'GAME' | 'DISCUSSION'}
          allGuesses={allGuesses}
          sharedMemos={sharedMemos}
          onUpdateMemo={handleUpdateMemo}
        />
      );
    case 'RESULT':
      return (
        <ResultScreen
          players={players}
          results={roundResults}
          onNextRound={handleNextRound}
          isHost={amIHost}
          isLastRound={roundCount >= players.length - 1}
          theme={currentTheme}
          sharedMemos={sharedMemos}
          isDebug={isDebug}
        />
      );
    case 'FINAL_RESULT':
      return (
        <FinalResultScreen
          players={players}
          onBackToLobby={handleBackToLobby}
        />
      );
    default:
      return <div>Loading...</div>;
  }
}

export default App;
