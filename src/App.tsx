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
import { updatePlayer } from './services/gameService';
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
  const [allGuesses, setAllGuesses] = useState<Record<string, Record<string, number>>>({}); // guesserId -> { targetId -> value }
  const [discussionVoted, setDiscussionVoted] = useState<Record<string, boolean>>({}); // playerId -> true
  const [roundResults, setRoundResults] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<RoundResult[][]>([]); // Full history
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [pastTurnPlayerIds, setPastTurnPlayerIds] = useState<string[]>([]); // Track past theme selectors

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
    setDiscussionVoted(newState.discussionVoted || {});
    setRoundResults(newState.roundResults || []);
    setGameHistory(newState.gameHistory || []);
    setCurrentTurnPlayerId(newState.currentTurnPlayerId || null);
    setPastTurnPlayerIds(newState.pastTurnPlayerIds || []);
  };

  const { isHost, syncState, syncMyPlayer, submitMyAllGuesses, submitSharedMemo, submitDiscussionDone, submitThemeSelect } = useGameSync({
    roomId: roomId || null,
    myPlayerId: myPlayerId || null,
    onStateChange: handleOnlineStateChange
  });

  // --- Effects ---

  useEffect(() => {
    // Host Logic: Check if we should advance from GAME to DISCUSSION or RESULT
    if (roomId && isHost) {
      // Check if all players have voted with complete data
      // Each voter should have placements for all other players (players.length - 1 targets)
      const expectedTargetCount = players.length - 1;
      const allVotedWithCompleteData = players.length > 0 &&
        Object.keys(allGuesses).length === players.length &&
        Object.values(allGuesses).every(placements =>
          Object.keys(placements).length === expectedTargetCount
        );

      if (allVotedWithCompleteData && currentPhase === 'GAME') {
        // Add small delay to ensure Firebase sync is complete
        const timer = setTimeout(() => {
          if (gameSettings.isDiscussionEnabled) {
            updateGameFn({ phase: 'DISCUSSION', discussionVoted: {} });
          } else {
            calculateAndShowResults(allGuesses);
          }
        }, 100);
        return () => clearTimeout(timer);
      }

      if (currentPhase === 'DISCUSSION') {
        const allDiscussed = players.length > 0 && Object.keys(discussionVoted).length === players.length;
        if (allDiscussed) {
          // Add small delay to ensure Firebase sync is complete
          const timer = setTimeout(() => {
            calculateAndShowResults(allGuesses);
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [roomId, isHost, currentPhase, allGuesses, discussionVoted, players.length, gameSettings.isDiscussionEnabled]);


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

  // 二つ名の閾値を人数に応じて調整（4人を基準）
  const calculateTitle = (score: number, playerCount: number = 4) => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // 基準は4人。人数が増えると1ラウンドあたりのスコア変動が大きくなるので閾値を調整
    // 基準閾値（4人時）: -40, -80, -120, -160
    // 例: 6人の場合、倍率 = 6/4 = 1.5 → 閾値は -60, -120, -180, -240
    const scaleFactor = playerCount / 4;

    const threshold1 = -40 * scaleFactor;  // NormalWords
    const threshold2 = -80 * scaleFactor;  // AbnormalWords
    const threshold3 = -120 * scaleFactor; // DangerWords
    const threshold4 = -160 * scaleFactor; // DecoratorWords + DangerWords

    if (score >= 0) return pick(WinnerWords);
    if (score <= threshold4) return pick(DecoratorWords) + pick(DangerWords);
    if (score <= threshold3) return pick(DangerWords);
    if (score <= threshold2) return pick(AbnormalWords);
    if (score <= threshold1) return pick(NormalWords);
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
      // Reset past turn player IDs for new game
      setPastTurnPlayerIds([]);
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
      setPastTurnPlayerIds([]); // Reset for new game
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
      return { ...p, targetNumber: num, handPosition: null }; // Maintain isHost
    });

    // Randomly select Turn Player (Theme Selector) - avoiding past selectors
    let eligiblePlayers = newPlayers.filter(p => !pastTurnPlayerIds.includes(p.id));
    let nextPastTurnPlayerIds = [...pastTurnPlayerIds];

    // If all players have been selected, reset the list
    if (eligiblePlayers.length === 0) {
      eligiblePlayers = newPlayers;
      nextPastTurnPlayerIds = [];
    }

    const turnPlayerIdx = Math.floor(Math.random() * eligiblePlayers.length);
    const nextTurnPlayerId = eligiblePlayers[turnPlayerIdx].id;
    nextPastTurnPlayerIds.push(nextTurnPlayerId);

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
        allGuesses: {},
        currentTurnPlayerId: nextTurnPlayerId,
        pastTurnPlayerIds: nextPastTurnPlayerIds
      });
    } else {
      // Local Update
      setPlayers(newPlayers);
      setThemeCandidates(nextcandidates);
      setUsedThemeTexts(nextUsedTexts);
      setSharedMemos({});
      setAllGuesses({});
      setCurrentTurnPlayerId(nextTurnPlayerId);
      setPastTurnPlayerIds(nextPastTurnPlayerIds);
      setCurrentPhase('SETTING');
    }
  };

  const handleThemeSelected = async (theme: Theme) => {
    const nextUsed = new Set(usedThemeTexts);
    nextUsed.add(theme.text);

    if (roomId) {
      // Anyone (Host or TurnPlayer) can trigger this via the dedicated API
      await submitThemeSelect(theme, Array.from(nextUsed));
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
      // Base score is sum of history (raw game scores) - ensure scoreHistory is an array
      const scoreHistoryArr = Array.isArray(p.scoreHistory) ? p.scoreHistory : [];
      const baseScore = scoreHistoryArr.reduce((a, b) => a + b, 0);
      // Get the latest round's score (last item in history for this player)
      const latestRound = history.length > 0 ? history[history.length - 1] : [];
      const latestResult = latestRound.find((r: RoundResult) => r.playerId === p.id);
      const latestRoundScore = latestResult ? latestResult.scoreGain : 0;
      // Update cumulative score: previous cumulative + this round's score
      const newCumulativeScore = (p.cumulativeScore || 0) + latestRoundScore;
      return { ...p, score: baseScore, cumulativeScore: newCumulativeScore, awards: [] as SpecialAward[], scoreHistory: scoreHistoryArr };
    });

    const awardUpdates: Record<string, SpecialAward[]> = {};
    tempPlayers.forEach(p => awardUpdates[p.id] = []);

    // 2. Special Awards Calculation (Same logic as before)
    // True Understander / Zero Empathy

    // --- New Special Awards Calculation ---
    // 1. Calculate diff stats (Given vs Received)
    const playerGivenStats: Record<string, { diffSum: number, count: number }> = {};
    const playerReceivedStats: Record<string, { diffSum: number, count: number }> = {};

    tempPlayers.forEach(p => {
      playerGivenStats[p.id] = { diffSum: 0, count: 0 };
      playerReceivedStats[p.id] = { diffSum: 0, count: 0 };
    });

    history.forEach(rounds => {
      rounds.forEach((res: RoundResult) => {
        const targetPlayerId = res.playerId;
        const targetNum = res.targetNumber;
        // res.guesses: guesserId -> val

        Object.entries(res.guesses).forEach(([guesserId, val]) => {
          const diff = Math.abs(val - targetNum);

          // Update Given (Guesser stats)
          if (playerGivenStats[guesserId]) {
            playerGivenStats[guesserId].diffSum += diff;
            playerGivenStats[guesserId].count += 1;
          }

          // Update Received (Target stats)
          if (playerReceivedStats[targetPlayerId]) {
            playerReceivedStats[targetPlayerId].diffSum += diff;
            playerReceivedStats[targetPlayerId].count += 1;
          }

          // Perfect Match Check (retain existing logic)
          if (diff === 0 && tempPlayers.find(p => p.id === guesserId)) {
            awardUpdates[guesserId].push({ name: 'ピッタリ賞', description: 'ズレ0で正解した', bonus: 20 });
          }
        });
      });
    });

    // 2. Find winners/losers based on Average Diff
    let minGivenAvg = Infinity; let bestUnderstanderId = '';
    let maxGivenAvg = -1; let worstGuesserId = '';

    let minReceivedAvg = Infinity; let bestResonatorId = '';
    let maxReceivedAvg = -1; let worstResonatorId = '';

    tempPlayers.forEach(p => {
      const given = playerGivenStats[p.id];
      const received = playerReceivedStats[p.id];

      // Given (自分の予想)
      if (given.count > 0) {
        const avg = given.diffSum / given.count;
        // Strict inequality to take first found or update if better? 
        // Using < or > updates each time better is found.
        if (avg < minGivenAvg) { minGivenAvg = avg; bestUnderstanderId = p.id; }
        if (avg > maxGivenAvg) { maxGivenAvg = avg; worstGuesserId = p.id; }
      }

      // Received (他からの予想)
      if (received.count > 0) {
        const avg = received.diffSum / received.count;
        if (avg < minReceivedAvg) { minReceivedAvg = avg; bestResonatorId = p.id; }
        if (avg > maxReceivedAvg) { maxReceivedAvg = avg; worstResonatorId = p.id; }
      }
    });

    // 3. Apply Awards (Avoid duplicating same person for opposite awards if logic allows, 
    // but here criteria are distinct enough. Conflict resolution: unique awards per category?)

    // 真の理解者: Given Diff Min (+20)
    if (bestUnderstanderId) {
      awardUpdates[bestUnderstanderId].push({ name: '真の理解者', description: '自分の予想が最も正確', bonus: 20 });
    }
    // ファーｗｗｗ: Given Diff Max (-20)
    if (worstGuesserId && worstGuesserId !== bestUnderstanderId) {
      awardUpdates[worstGuesserId].push({ name: 'ファーｗｗｗ', description: '自分の予想が最も不正確', bonus: -20 });
    }

    // 共感者: Received Diff Min (+20)
    if (bestResonatorId) {
      awardUpdates[bestResonatorId].push({ name: '共感者', description: '周りからの予想が最も正確', bonus: 20 });
    }
    // 共感性0: Received Diff Max (-20)
    if (worstResonatorId && worstResonatorId !== bestResonatorId) {
      awardUpdates[worstResonatorId].push({ name: '共感性0', description: '周りからの予想が最も不正確', bonus: -20 });
    }

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
      const finalScore = p.score + bonus;
      const newCumulativeScore = (p.cumulativeScore || 0) + bonus;
      if (bonus > 0) {
        const newAwards = [...(p as any).awards, { name: `${idx + 1}位`, description: '順位ボーナス', bonus }];
        return {
          ...p,
          score: finalScore,
          cumulativeScore: newCumulativeScore,
          awards: newAwards,
          title: calculateTitle(finalScore, tempPlayers.length) // Update title based on FINAL score (with all bonuses)
        };
      }
      return {
        ...p,
        score: finalScore,
        cumulativeScore: newCumulativeScore,
        title: calculateTitle(finalScore, tempPlayers.length) // Use final score for title
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
      const currentHistory = Array.isArray(p.scoreHistory) ? p.scoreHistory : [];
      // We push to history, but we don't update 'score' yet because calculateTotalScore will do it from history
      return {
        ...p,
        scoreHistory: [...currentHistory, gain]
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
      // Online Mode - Submit all guesses at once to prevent race conditions
      await submitSharedMemo(myPlayerId!, myWord);
      await submitMyAllGuesses(myPlacements);
      // If discussion, mark done
      if (currentPhase === 'DISCUSSION') {
        await submitDiscussionDone();
      }
      // Note: Phase transitions are handled by the useEffect that monitors allGuesses and discussionVoted
      // This ensures we wait for ALL players to vote before advancing
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

  // Handle force progress by host - fill in random guesses for non-voters
  const handleForceProgress = () => {
    if (!isHost) return;

    // Create a copy of current guesses
    const finalGuesses = { ...allGuesses };

    // For each player who hasn't voted, generate random placements
    players.forEach(player => {
      if (!finalGuesses[player.id]) {
        // Generate random placements for this player
        const randomPlacements: Record<string, number> = {};
        players.forEach(target => {
          if (target.id !== player.id) {
            // Random value between 1 and 100
            randomPlacements[target.id] = Math.floor(Math.random() * 100) + 1;
          }
        });
        finalGuesses[player.id] = randomPlacements;
      }
    });

    // Now proceed with these guesses
    if (currentPhase === 'GAME') {
      if (gameSettings.isDiscussionEnabled) {
        // Go to discussion with filled guesses
        // Reset discussionVoted so all players can vote again in discussion phase
        if (roomId) {
          updateGameFn({ phase: 'DISCUSSION', allGuesses: finalGuesses, discussionVoted: {} });
        } else {
          setAllGuesses(finalGuesses);
          setDiscussionVoted({});
          setCurrentPhase('DISCUSSION');
        }
      } else {
        // Go directly to results
        calculateAndShowResults(finalGuesses);
      }
    } else if (currentPhase === 'DISCUSSION') {
      // Go to results - use the finalGuesses which include random placements for non-voters
      calculateAndShowResults(finalGuesses);
    }
  };

  const handleNextRound = () => {
    if (roomId && !isHost) return;

    const nextRound = roundCount + 1;

    // End of game check
    if (nextRound >= players.length) {
      const finalPlayers = players.map(p => {
        const scoreHistoryArr = Array.isArray(p.scoreHistory) ? p.scoreHistory : [];
        const baseScore = scoreHistoryArr.reduce((a, b) => a + b, 0);
        return {
          ...p,
          score: baseScore,
          scoreHistory: scoreHistoryArr,
          awards: [],
          title: calculateTitle(p.cumulativeScore || 0, players.length)
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
      // Reset players: Only restore MY host status (as owner), reset others
      const resetPlayers: Record<string, Player> = {};
      players.forEach(p => {
        resetPlayers[p.id] = {
          ...p,
          isHost: p.id === myPlayerId, // Restore Owner Host authority
          isReady: false,
          score: 0,
          scoreHistory: [],
          cumulativeScore: 0,
          awards: [],
          title: '新人',
          targetNumber: 0,
          handPosition: null
        };
      });

      updateGameFn({
        phase: 'LOBBY',
        roundCount: 0,
        roundResults: [],
        players: resetPlayers,
        gameHistory: [],
        allGuesses: {},
        sharedMemos: {},
        currentTheme: null,
        usedThemeTexts: [], // Reset used themes
        pastTurnPlayerIds: [] // Reset past turn players
      });
    } else {
      setRoundCount(0);
      setPlayers([]);
      setRoundResults([]);
      setPastTurnPlayerIds([]); // Reset past turn players
      setCurrentPhase('LOBBY');
      // Local mode usually redirects to Entry if players are cleared?
      // Check useEffect for PHASE LOBBY
    }
  };

  const handleUpdateMemo = (pid: string, text: string) => {
    if (roomId) {
      // Allow editing ANY player's memo (Shared whiteboard style)
      submitSharedMemo(pid, text);
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

  // Handle adding NPCs for debug mode
  const NPC_NAMES = ['NPCタロウ', 'NPCハナコ', 'NPCジロウ', 'NPCサクラ', 'NPCケン', 'NPCユキ', 'NPCリュウ', 'NPCミカ'];
  const NPC_COLORS = ['#4ECDC4', '#FFE66D', '#FF6B6B', '#C9B1FF', '#95E1D3', '#F38181', '#AA96DA', '#FCE38A'];

  const handleAddNpc = async (count: number) => {
    if (!isDebug) return;

    const currentNpcCount = players.filter(p => p.isNpc).length;
    const newNpcs: Player[] = [];

    for (let i = 0; i < count && (currentNpcCount + i) < 8; i++) {
      const npcIndex = currentNpcCount + i;
      const npcId = `npc_${Date.now()}_${i}`;
      const newNpc: Player = {
        id: npcId,
        name: NPC_NAMES[npcIndex % NPC_NAMES.length],
        color: NPC_COLORS[npcIndex % NPC_COLORS.length],
        score: 0,
        scoreHistory: [],
        cumulativeScore: 0,
        title: '新人',
        targetNumber: 0,
        handPosition: null,
        isReady: true,
        isHost: false,
        isNpc: true,
        awards: []
      };
      newNpcs.push(newNpc);
    }

    if (newNpcs.length === 0) return;

    if (roomId && isHost) {
      // Online: Add NPCs to Firebase
      for (const npc of newNpcs) {
        await updatePlayer(roomId, npc.id, npc);
      }
    } else {
      // Local mode
      setPlayers(prev => [...prev, ...newNpcs]);
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
          isDebug={isDebug}
          onAddNpc={handleAddNpc}
        />
      );
    case 'SETTING':
      const turnPlayer = players.find(p => p.id === currentTurnPlayerId);
      return (
        <ThemeSelectionScreen
          hostName={turnPlayer?.name || 'Player'}
          isHost={myPlayerId === currentTurnPlayerId}
          gameMode={gameSettings.gameMode}
          candidates={themeCandidates}
          onSelect={handleThemeSelected}
          onLeave={handleLeaveGame}
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
          onForceProgress={handleForceProgress}
          onLeave={handleLeaveGame}
          phase={currentPhase as 'GAME' | 'DISCUSSION'}
          allGuesses={allGuesses}
          sharedMemos={sharedMemos}
          onUpdateMemo={handleUpdateMemo}
          isHost={amIHost}
          discussionVoted={discussionVoted}
          turnPlayerId={currentTurnPlayerId}
        />
      );
    case 'RESULT':
      return (
        <ResultScreen
          players={players}
          results={roundResults}
          onNextRound={handleNextRound}
          onLeave={handleLeaveGame}
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
          isDebug={isDebug}
        />
      );
    default:
      return <div>Loading...</div>;
  }
}

export default App;
