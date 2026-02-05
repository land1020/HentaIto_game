import React, { useState } from 'react';
import type { Player } from '../../types/game';

const COLORS = [
    { name: '赤', code: '#FF5252' },
    { name: '青', code: '#448AFF' },
    { name: '緑', code: '#66BB6A' },
    { name: '黄', code: '#FFD740' },
    { name: '紫', code: '#E040FB' },
    { name: '茶', code: '#8D6E63' },
    { name: '白', code: '#FFFFFF' },
    { name: '灰', code: '#9E9E9E' },
    { name: '黄緑', code: '#C6FF00' },
    { name: '桃', code: '#FF4081' },
    { name: '水', code: '#18FFFF' },
];

interface LobbyScreenProps {
    roomId: string;
    playerName: string;
    isDebug: boolean;
    onStartGame: (settings: GameSettings, myColor: string) => void;
}

export interface GameSettings {
    gameMode: 'AUTO' | 'ORIGINAL';
    isDiscussionEnabled: boolean;
    timerSeconds: number;
    includeNormalThemes: boolean;
    includeAbnormalThemes: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ roomId, playerName, isDebug, onStartGame }) => {
    const [myColor, setMyColor] = useState(COLORS[0].code);

    // Mock participants state
    // In a real app, this would be updated via websocket or polling
    // For local UI feedback, update "p1" color when myColor changes
    const participants: Player[] = [
        {
            id: 'p1',
            name: playerName,
            color: myColor,
            score: 0,
            scoreHistory: [],
            title: '新人',
            targetNumber: 0,
            handPosition: null,
            isReady: true,
            isHost: true,
            isNpc: false,
            cumulativeScore: 0
        },
        // Add NPCs if debug mode
        ...(isDebug ? [
            {
                id: 'npc1',
                name: 'NPCタロウ',
                color: '#4ECDC4',
                score: 0,
                scoreHistory: [],
                title: 'ロボ',
                targetNumber: 0,
                handPosition: null,
                isReady: true,
                isHost: false,
                isNpc: true,
                cumulativeScore: 0
            },
            {
                id: 'npc2',
                name: 'NPCハナコ',
                color: '#FFE66D',
                score: 0,
                scoreHistory: [],
                title: 'メカ',
                targetNumber: 0,
                handPosition: null,
                isReady: true,
                isHost: false,
                isNpc: true,
                cumulativeScore: 0
            }
        ] : [])
    ];

    const [settings, setSettings] = useState<GameSettings>({
        gameMode: 'AUTO',
        isDiscussionEnabled: false,
        timerSeconds: 180,
        includeNormalThemes: true,
        includeAbnormalThemes: false
    });

    return (
        <div className="container" style={{ paddingTop: '2.5rem' }}>
            {/* Header / Logo */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', marginTop: 0 }}>
                    <span className="title-henta">Henta</span>
                    <span className="title-ito">Ito</span>
                </h1>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#666', background: 'rgba(255,255,255,0.7)', display: 'inline-block', padding: '4px 16px', borderRadius: '20px' }}>
                    ロビー (部屋: {roomId})
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3>あなたのカラー</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    {COLORS.map((c) => (
                        <button
                            key={c.code}
                            onClick={() => setMyColor(c.code)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: c.code,
                                border: myColor === c.code ? '4px solid var(--color-text)' : '2px solid #ddd',
                                transform: myColor === c.code ? 'scale(1.1)' : 'scale(1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3>参加者リスト ({participants.length}人)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {participants.map(p => (
                        <div key={p.id} style={{
                            background: 'white',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: `8px solid ${p.color}`,
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>{p.title}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{p.name}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {p.isHost && <span style={{ fontSize: '0.7rem', background: 'var(--color-accent)', color: 'var(--color-text)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>HOST</span>}
                                {p.isNpc && <span style={{ fontSize: '0.7rem', background: '#ddd', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>NPC</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}>
                <h3>ゲーム設定</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>お題モード</label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="mode"
                                checked={settings.gameMode === 'AUTO'}
                                onChange={() => setSettings({ ...settings, gameMode: 'AUTO' })}
                            />
                            <span style={{ marginLeft: '4px' }}>自動選出</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="mode"
                                checked={settings.gameMode === 'ORIGINAL'}
                                onChange={() => setSettings({ ...settings, gameMode: 'ORIGINAL' })}
                            />
                            <span style={{ marginLeft: '4px' }}>オリジナル (親入力)</span>
                        </label>
                    </div>

                    {/* Genre Selection (Only for AUTO) */}
                    <div style={{
                        marginLeft: '1rem',
                        padding: '0.8rem',
                        background: settings.gameMode === 'AUTO' ? '#f5f5f5' : '#eee',
                        borderRadius: 'var(--radius-sm)',
                        opacity: settings.gameMode === 'AUTO' ? 1 : 0.5,
                        pointerEvents: settings.gameMode === 'AUTO' ? 'auto' : 'none'
                    }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#555' }}>ジャンル選択 (自動選出時)</div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.includeNormalThemes}
                                    onChange={(e) => setSettings({ ...settings, includeNormalThemes: e.target.checked })}
                                />
                                <span style={{ marginLeft: '4px' }}>ノーマル</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.includeAbnormalThemes}
                                    onChange={(e) => setSettings({ ...settings, includeAbnormalThemes: e.target.checked })}
                                />
                                <span style={{ marginLeft: '4px' }}>アブノーマル</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.isDiscussionEnabled}
                            onChange={(e) => setSettings({ ...settings, isDiscussionEnabled: e.target.checked })}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>議論フェーズあり</span>
                    </label>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>ONにすると、結果発表前にアイコン再調整タイムがあります。</p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>制限時間 (秒)</label>
                    <input
                        type="number"
                        className="input-field"
                        value={settings.timerSeconds}
                        onChange={(e) => setSettings({ ...settings, timerSeconds: Number(e.target.value) })}
                        min={10}
                        max={600}
                        style={{ width: '100px' }}
                    />
                </div>
            </div >

            <button className="btn-primary" style={{ width: '100%' }} onClick={() => onStartGame(settings, myColor)}>
                ゲーム開始
            </button>
        </div >
    );
};
