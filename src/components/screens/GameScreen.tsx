import React, { useState } from 'react';
import type { Player } from '../../types/game';
import { ValueSlider } from '../ui/ValueSlider';
import type { Theme } from '../../data/themes';

interface GameScreenProps {
    players: Player[];
    myId: string;
    theme: Theme;
    onVote: (placements: Record<string, number>, myWord: string) => void;
    onLeave: () => void;
    phase?: 'GAME' | 'DISCUSSION';
    allGuesses?: Record<string, Record<string, number>>;
    sharedMemos?: Record<string, string>;
    onUpdateMemo?: (id: string, text: string) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
    players,
    myId,
    theme,
    onVote,
    onLeave,
    phase = 'GAME',
    allGuesses = {},
    sharedMemos = {},
    onUpdateMemo
}) => {
    const myPlayer = players.find(p => p.id === myId);
    const otherPlayers = players.filter(p => p.id !== myId);

    // Initialize placements from allGuesses if in DISCUSSION phase
    const [placements, setPlacements] = useState<Record<string, number>>(() => {
        if (phase === 'DISCUSSION' && allGuesses[myId]) {
            return { ...allGuesses[myId] };
        }
        return {};
    });

    // Keep track of initial placements to detect changes
    const [initialPlacements] = useState<Record<string, number>>(() => {
        if (phase === 'DISCUSSION' && allGuesses[myId]) {
            return { ...allGuesses[myId] };
        }
        return {};
    });

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    // Initialize myWord from sharedMemos if available
    const [myWord, setMyWord] = useState(sharedMemos?.[myId] || '');

    if (!myPlayer) return <div>Error: Player not found</div>;

    // Helper to find which player has been modified
    const getModifiedPlayerId = () => {
        if (phase !== 'DISCUSSION') return null;
        for (const pid of Object.keys(placements)) {
            if (placements[pid] !== initialPlacements[pid]) {
                return pid;
            }
        }
        return null;
    };
    const modifiedPlayerId = getModifiedPlayerId();

    const handleSelectPlayer = (pid: string) => {
        // If in discussion phase and another player was modified, reset them
        if (phase === 'DISCUSSION' && modifiedPlayerId && modifiedPlayerId !== pid) {
            // Reset the previously modified player
            setPlacements(prev => ({
                ...prev,
                [modifiedPlayerId]: initialPlacements[modifiedPlayerId]
            }));
        }
        setSelectedPlayerId(pid);
    };

    const handleSliderChange = (val: number) => {
        if (selectedPlayerId) {
            setPlacements(prev => ({ ...prev, [selectedPlayerId]: val }));
        }
    };

    const handleMyWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setMyWord(val);
        onUpdateMemo?.(myId, val); // Update shared state immediately
    };

    const handleSubmit = () => {
        // Check if all others are placed
        const missing = otherPlayers.filter(p => placements[p.id] === undefined);
        if (missing.length > 0) {
            alert(`まだ配置していないプレイヤーがいます: ${missing.map(p => p.name).join(', ')}`);
            return;
        }
        onVote(placements, myWord);
    };

    const themeMin = theme.min;
    const themeMax = theme.max;

    // Build slider icons

    const sliderIcons = [
        // My fixed icon
        {
            id: myPlayer.id,
            value: myPlayer.targetNumber,
            color: myPlayer.color,
            label: '自分',
        },
        // Add already placed players (excluding selectedPlayerId and myId)
        ...otherPlayers
            .filter(p => p.id !== selectedPlayerId && placements[p.id] !== undefined)
            .map(p => ({
                id: p.id,
                value: placements[p.id],
                color: p.color,
                label: p.name
            }))
    ] as any[];

    return (
        <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                {phase === 'DISCUSSION' && (
                    <div style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #FF4081 0%, #F50057 100%)',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '25px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        marginBottom: '12px',
                        boxShadow: '0 4px 15px rgba(255, 64, 129, 0.4)',
                        border: '2px solid white',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                    }}>
                        🗣️ 議論中：再調整チャンス（1回のみ）
                    </div>
                )}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    marginBottom: '8px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '1.4rem',
                        margin: 0,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        📝 お題: {theme.text}
                    </h2>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#444',
                    fontSize: '0.9rem',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '8px 16px',
                    borderRadius: '8px'
                }}>
                    <span>1️⃣ {themeMin}</span>
                    <span>💯 {themeMax}</span>
                </div>
            </div>

            {/* My Info - with player color */}
            <div style={{
                background: `linear-gradient(135deg, ${myPlayer.color}22 0%, ${myPlayer.color}44 100%)`,
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: `3px solid ${myPlayer.color}`,
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: myPlayer.color,
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}></div>
                        <span style={{ fontWeight: 'bold' }}>
                            {myPlayer.title && myPlayer.title !== '新人' ? `${myPlayer.title} ${myPlayer.name}` : myPlayer.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', background: '#4CAF50', color: 'white', padding: '2px 6px', borderRadius: '8px' }}>あなた</span>
                    </div>
                    <span style={{
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        color: myPlayer.color,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                    }}>{myPlayer.targetNumber}</span>
                </div>
                <input
                    className="input-field"
                    placeholder="数字に合う言葉を入力 (メモ)"
                    value={myWord}
                    onChange={handleMyWordChange}
                    style={{ marginBottom: 0 }}
                />
            </div>

            {/* Other Players / Work Area */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem' }}>みんなの言葉 & 配置</h3>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>
                    {phase === 'DISCUSSION'
                        ? 'みんなの予想が見えています！議論して再調整しましょう（1回のみ）'
                        : '名前をタップしてからスライダーをタップして配置予想！'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {otherPlayers.map(p => {
                        const isSelected = selectedPlayerId === p.id;
                        const isPlaced = placements[p.id] !== undefined;

                        return (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPlayer(p.id)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '0.6rem',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${p.color}33 0%, ${p.color}55 100%)`
                                        : `linear-gradient(135deg, ${p.color}11 0%, ${p.color}22 100%)`,
                                    border: isSelected ? `3px solid ${p.color}` : `2px solid ${p.color}66`,
                                    borderRadius: 'var(--radius-sm)',
                                    boxShadow: isSelected ? `0 4px 12px ${p.color}44` : '0 2px 4px rgba(0,0,0,0.1)',
                                    position: 'relative',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '6px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        background: p.color,
                                        marginRight: '6px',
                                        border: '2px solid white',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }}></div>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', flex: 1 }}>
                                        {p.title && p.title !== '新人' ? `${p.title} ${p.name}` : p.name}
                                    </span>
                                    {isPlaced && (
                                        <span style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            color: 'white',
                                            background: '#4CAF50',
                                            padding: '2px 8px',
                                            borderRadius: '10px'
                                        }}>✓ {placements[p.id]}</span>
                                    )}
                                </div>

                                <input
                                    className="input-field"
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '6px 8px',
                                        margin: 0,
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                    placeholder="メモを入力..."
                                    value={sharedMemos?.[p.id] || ''}
                                    onChange={(e) => onUpdateMemo?.(p.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Slider Area - Show in GAME and DISCUSSION phases */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px', fontWeight: 'bold' }}>
                    {selectedPlayerId
                        ? `${otherPlayers.find(p => p.id === selectedPlayerId)?.name} の位置を決めてください`
                        : 'プレイヤーを選択してください'}
                </div>

                <ValueSlider
                    value={selectedPlayerId ? (placements[selectedPlayerId] || 50) : null}
                    onChange={handleSliderChange}
                    otherIcons={sliderIcons}
                    minLabel={themeMin}
                    maxLabel={themeMax}
                    disabled={!selectedPlayerId}
                    activeColor={selectedPlayerId ? otherPlayers.find(p => p.id === selectedPlayerId)?.color : undefined}
                />
            </div>

            {/* Discussion Phase: Other Players' World Views */}
            {phase === 'DISCUSSION' && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>みんなの予想（世界観）</h3>

                    {otherPlayers.map(guesser => {
                        // Build icons based on THIS guesser's logic
                        const myGuessMap = allGuesses[guesser.id];
                        if (!myGuessMap) return null;

                        const worldIcons = Object.entries(myGuessMap).map(([targetId, val]) => {
                            const target = players.find(p => p.id === targetId);
                            if (!target) return null;
                            return {
                                id: `world-${guesser.id}-${targetId}`,
                                value: val,
                                color: target.color,
                                label: target.name
                            };
                        }).filter(Boolean) as any[];

                        return (
                            <div key={guesser.id} style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: guesser.color, marginRight: '6px' }}></div>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{guesser.name} の予想</span>
                                </div>
                                <ValueSlider
                                    value={null}
                                    onChange={() => { }}
                                    otherIcons={worldIcons}
                                    minLabel=""
                                    maxLabel=""
                                    compact={true}
                                    readOnly={true}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <button className="btn-primary" style={{ width: '100%', background: phase === 'DISCUSSION' ? '#FF4081' : undefined }} onClick={handleSubmit}>
                {phase === 'DISCUSSION' ? '決定して結果を見る（修正不可）' : '投票する'}
            </button>

            <button
                onClick={onLeave}
                style={{
                    width: '100%',
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                }}
            >
                🚪 退出する（入室画面に戻る）
            </button>
        </div>
    );
};
