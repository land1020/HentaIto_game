import React, { useState } from 'react';
import type { Theme } from '../../data/themes';

interface ThemeSelectionScreenProps {
    hostName: string;
    isHost: boolean;
    gameMode: 'AUTO' | 'ORIGINAL';
    candidates: Theme[];
    onSelect: (theme: Theme) => void;
    onLeave: () => void;
}

export const ThemeSelectionScreen: React.FC<ThemeSelectionScreenProps> = ({
    hostName,
    isHost,
    gameMode,
    candidates,
    onSelect,
    onLeave
}) => {
    const [customTheme, setCustomTheme] = useState<Theme>({ text: '', min: '弱い', max: '強い', genre: 'NORMAL' });

    if (!isHost) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <h2 className="title" style={{ fontSize: '2rem' }}>お題設定中...</h2>
                <div style={{ fontSize: '1.2rem', color: '#666', marginTop: '2rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{hostName}</span> さんがお題を決めています
                </div>
                <div className="animate-bounce" style={{ marginTop: '2rem', fontSize: '2rem' }}>
                    🤔
                </div>
                <button
                    onClick={onLeave}
                    style={{
                        marginTop: '2rem',
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#888',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    🚪 退出する
                </button>
            </div>
        );
    }

    if (gameMode === 'ORIGINAL') {
        const isValid = customTheme.text.trim().length > 0 && customTheme.min.trim().length > 0 && customTheme.max.trim().length > 0;
        return (
            <div className="container">
                <h2 className="title">お題を決めてください</h2>

                <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>お題の内容</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="例: 無人島に持っていきたいもの"
                            value={customTheme.text}
                            onChange={(e) => setCustomTheme({ ...customTheme, text: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>最小値 (0側)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="例: いらない"
                                value={customTheme.min}
                                onChange={(e) => setCustomTheme({ ...customTheme, min: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>最大値 (100側)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="例: 必須"
                                value={customTheme.max}
                                onChange={(e) => setCustomTheme({ ...customTheme, max: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <button
                        className="btn-primary"
                        style={{ width: '100%' }}
                        disabled={!isValid}
                        onClick={() => onSelect(customTheme)}
                    >
                        このお題で決定
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
                        🚪 退出する
                    </button>
                </div>
            </div>
        );
    }

    // AUTO Mode
    return (
        <div className="container">
            <h2 className="title">お題を選択</h2>
            <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
                どちらかのお題を選んでください
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {candidates.map((theme, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSelect(theme)}
                        style={{
                            background: 'white',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)',
                            border: '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>{theme.text}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            <span>{theme.min}</span>
                            <div style={{ flex: 1, height: '2px', background: '#eee', margin: '10px 1rem' }}></div>
                            <span>{theme.max}</span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onLeave}
                style={{
                    width: '100%',
                    marginTop: '2rem',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                }}
            >
                🚪 退出する
            </button>
        </div>
    );
};
