import React from 'react';
import type { Player } from '../../types/game';
import { ValueSlider } from '../ui/ValueSlider';
import { RankingList } from '../ui/RankingList';

interface ResultScreenProps {
    players: Player[];
    results: any[];
    onNextRound: () => void;
    onLeave: () => void;
    isHost: boolean;
    isLastRound?: boolean;
    theme: { text: string; min: string; max: string };
    sharedMemos?: Record<string, string>;
    isDebug?: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ players, results, onNextRound, onLeave, isHost, isLastRound = false, theme, sharedMemos = {}, isDebug = false }) => {
    // Sort results by score gain (descending)
    const sortedResults = [...results].sort((a, b) => b.scoreGain - a.scoreGain);

    return (
        <div className="container" style={{ paddingTop: '2.5rem' }}>
            <h2 className="title">結果発表</h2>

            {/* Current Standing / Projected Final Result */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
                    --- 今回のラウンド結果 ---
                </div>
                <RankingList players={players} showTitle={false} isDebug={isDebug} roundResults={results} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '4px' }}>今回のお題</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{theme.text}</div>
            </div>

            {/* Overall Correct Positions */}
            <div style={{
                marginBottom: '2rem',
                background: 'var(--color-white)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                border: '4px solid var(--color-accent)',
                position: 'relative',
                zIndex: 10
            }}>
                <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--color-text)', fontSize: '1.2rem' }}>正解の配置</h3>
                <div style={{ pointerEvents: 'none' }}>
                    <ValueSlider
                        value={null}
                        onChange={() => { }}
                        otherIcons={players.map(p => ({
                            id: p.id,
                            value: p.targetNumber,
                            color: p.color,
                            label: p.name
                        }))}
                        minLabel="弱い"
                        maxLabel="強い"
                        disabled={true}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                {sortedResults.map((res, index) => {
                    const player = players.find(p => p.id === res.playerId);
                    if (!player) return null;
                    const memo = sharedMemos[player.id];

                    // Prepare icons for visualization: True position + Guesses
                    const icons = [
                        // Others' guesses for this player
                        ...Object.entries(res.guesses).map(([guesserId, val]) => {
                            const guesser = players.find(p => p.id === guesserId);
                            return guesser ? {
                                id: guesserId,
                                value: val,
                                color: guesser.color,
                                label: guesser.name
                            } : null;
                        }).filter(i => i !== null)
                    ] as any[];

                    // Marker for THIS player's correct answer only
                    const markers = [{
                        value: player.targetNumber,
                        color: player.color
                    }];

                    return (
                        <div key={res.playerId} style={{
                            background: `linear-gradient(135deg, ${player.color}11 0%, ${player.color}22 100%)`,
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '0.8rem',
                            boxShadow: 'var(--shadow-sm)',
                            border: `2px solid ${player.color}`,
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', marginRight: '8px' }}>{index + 1}位</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        {player.title && player.title !== '新人' ? `${player.title} ${player.name}` : player.name}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '6px' }}>正解: {res.targetNumber}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: res.scoreGain >= 0 ? 'var(--color-primary)' : 'blue' }}>
                                        {res.scoreGain > 0 ? '+' : ''}{res.scoreGain}点
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '2px', textAlign: 'right' }}>
                                        <div>他からの予想: {res.incomingScore ?? 0}点</div>
                                        <div>自分の予想: {res.outgoingScore ?? 0}点</div>
                                    </div>
                                    {isDebug && (
                                        <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                            (累計: {player.cumulativeScore})
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Memo Display */}
                            {memo && (
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#555',
                                    background: '#f5f5f5',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    borderLeft: `3px solid ${player.color}`
                                }}>
                                    {memo}
                                </div>
                            )}

                            {/* Visualization for this player's target */}
                            <div style={{ pointerEvents: 'none', transform: 'scale(1)', transformOrigin: 'left top' }}>
                                <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '2px' }}>みんなからの予想</div>
                                <ValueSlider
                                    value={null}
                                    onChange={() => { }}
                                    otherIcons={[
                                        ...icons,
                                        // Include the target player themselves in icons list for consistent styling
                                        {
                                            id: player.id,
                                            value: res.targetNumber,
                                            color: player.color, // Use actual player color
                                            label: player.name
                                        }
                                    ]}
                                    minLabel=""
                                    maxLabel=""
                                    disabled={true}
                                    compact={true}
                                    markers={markers}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {isHost && (
                <button className={isLastRound ? "btn-accent" : "btn-primary"} style={{ width: '100%' }} onClick={onNextRound}>
                    {isLastRound ? "最終結果発表へ" : "次のゲームへ"}
                </button>
            )}

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
