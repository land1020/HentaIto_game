import React, { useState } from 'react';
import type { Player } from '../../types/game';
import { ValueSlider } from '../ui/ValueSlider';
import type { Theme } from '../../data/themes';

interface GameScreenProps {
    players: Player[];
    myId: string;
    theme: Theme;
    onVote: (placements: Record<string, number>, myWord: string) => void;
    // isDiscussion removed as it is handled by phase
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
    // isDiscussion removed
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
                    <div className="badge-animation" style={{
                        display: 'inline-block',
                        background: '#FF4081',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        marginBottom: '8px',
                        boxShadow: '0 2px 5px rgba(255, 64, 129, 0.4)'
                    }}>
                        議論中：再調整チャンス（1回のみ）
                    </div>
                )}
                <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>お題: {theme.text}</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.9rem' }}>
                    <span>1: {themeMin}</span>
                    <span>100: {themeMax}</span>
                </div>
            </div>

            {/* My Info */}
            <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-primary)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold' }}>
                        {myPlayer.title && myPlayer.title !== '新人' ? `${myPlayer.title} ${myPlayer.name}` : myPlayer.name}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{myPlayer.targetNumber}</span>
                </div>
                <input
                    className="input-field"
                    placeholder="数字に合う言葉を入力 (メモ)"
                    value={myWord}
                    onChange={handleMyWordChange}
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
                                    padding: '0.5rem',
                                    background: isSelected ? '#fff' : '#f9f9f9',
                                    border: isSelected ? `2px solid ${p.color}` : '1px solid #ddd',
                                    borderRadius: 'var(--radius-sm)',
                                    boxShadow: isSelected ? 'var(--shadow-pop)' : 'none',
                                    marginBottom: '0.5rem',
                                    position: 'relative',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color, marginRight: '4px' }}></div>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {p.title && p.title !== '新人' ? `${p.title} ${p.name}` : p.name}
                                    </span>
                                    {isPlaced && !phase && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'green' }}>✓ {placements[p.id]}</span>}
                                    {isPlaced && phase === 'DISCUSSION' && <span style={{ marginLeft: 'auto', fontSize: '1rem', fontWeight: 'bold', color: 'green' }}>✓ {placements[p.id]}</span>}
                                </div>

                                <div style={{ width: '100%', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
                                    <input
                                        className="input-field"
                                        style={{
                                            fontSize: '0.8rem',
                                            padding: '4px',
                                            margin: '0 0 4px 0',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            background: 'rgba(255,255,255,0.5)'
                                        }}
                                        placeholder="(メモ)"
                                        value={sharedMemos?.[p.id] || ''}
                                        onChange={(e) => onUpdateMemo?.(p.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
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
        </div>
    );
};
