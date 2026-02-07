import React from 'react';
import type { Player } from '../../types/game';

interface RankingListProps {
    players: Player[];
    showTitle?: boolean; // "最終結果" などのタイトルを表示するかどうか
    isDebug?: boolean;
    roundResults?: any[]; // ラウンド結果（指定した場合はラウンドスコアでランキング）
}

export const RankingList: React.FC<RankingListProps> = ({ players, showTitle = false, isDebug = false, roundResults }) => {
    // ラウンド結果がある場合は、そのラウンドのスコアでソート
    // ない場合は累計スコア（score）でソート
    const rankedPlayers = roundResults
        ? [...players].sort((a, b) => {
            const aResult = roundResults.find(r => r.playerId === a.id);
            const bResult = roundResults.find(r => r.playerId === b.id);
            const aScore = aResult ? aResult.scoreGain : 0;
            const bScore = bResult ? bResult.scoreGain : 0;
            return bScore - aScore;
        })
        : [...players].sort((a, b) => b.score - a.score);

    return (
        <div style={{ width: '100%' }}>
            {showTitle && <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>最終結果</h1>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {rankedPlayers.map((p, index) => {
                    const isWinner = index === 0;
                    // Cast to final player structure if needed, or assume awards exist
                    const awards = (p as any).awards || [];

                    // ラウンドモードの場合はラウンドスコアを表示
                    const roundResult = roundResults?.find(r => r.playerId === p.id);
                    const displayScore = roundResults ? (roundResult?.scoreGain ?? 0) : p.score;

                    return (
                        <div key={p.id} style={{
                            background: isWinner ? 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)' : 'white',
                            color: isWinner ? 'black' : 'inherit',
                            padding: '1rem 1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)',
                            transform: isWinner ? 'scale(1.02)' : 'none',
                            border: isWinner ? '4px solid white' : '1px solid #eee',
                            position: 'relative',
                            overflow: 'visible'
                        }}>
                            {isWinner && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '10px',
                                    fontSize: '2rem',
                                    transform: 'rotate(20deg)',
                                    zIndex: 10
                                }}>
                                    👑
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '30px' }}>{index + 1}位</span>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', background: p.color,
                                        border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            {p.title && p.title !== '新人' ? `${p.title} ${p.name}` : p.name}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: roundResults && displayScore >= 0 ? 'inherit' : (roundResults ? 'var(--color-primary)' : 'inherit') }}>
                                        {roundResults && displayScore > 0 ? '+' : ''}{displayScore}点
                                    </div>
                                    {/* ラウンドモード時は累計スコアを表示 */}
                                    {roundResults && (
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                                            累計: {p.cumulativeScore ?? p.score}点
                                        </div>
                                    )}
                                    {isDebug && !roundResults && (
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                            (累計: {p.cumulativeScore})
                                        </div>
                                    )}
                                </div>
                            </div>

                            {awards.length > 0 && (
                                <div style={{
                                    marginTop: '0.8rem',
                                    paddingTop: '0.5rem',
                                    borderTop: isWinner ? '1px solid rgba(0,0,0,0.1)' : '1px solid #eee',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    justifyContent: 'center'
                                }}>
                                    {awards.map((a: any, idx: number) => (
                                        <div key={idx} style={{
                                            background: a.bonus > 0 ? '#4CAF50' : '#F44336',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <span>{a.name}</span>
                                            <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0 4px', borderRadius: '4px' }}>
                                                {a.bonus > 0 ? '+' : ''}{a.bonus}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
