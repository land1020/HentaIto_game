import React, { useState } from 'react';
import { createRoom, joinRoom, checkRoomExists, deleteRoom } from '../../services/gameService';

interface EntryScreenProps {
    onJoin: (name: string, roomId: string, isDebug: boolean, playerColor: string, myPid?: string) => void;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({ onJoin }) => {
    const [name, setName] = useState('');
    const [roomIdInput, setRoomIdInput] = useState('');
    const [isDebug, setIsDebug] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Random color generator
    const getRandomColor = () => {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#54A0FF', '#5f27cd'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleRoomAction = async () => {
        if (!name.trim()) {
            setError('名前を入力してください');
            return;
        }
        if (!roomIdInput.match(/^\d{4}$/)) {
            setError('部屋番号は4桁の数字で入力してください');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const color = getRandomColor();
            const exists = await checkRoomExists(roomIdInput);

            if (exists) {
                // Join existing room
                const res = await joinRoom(roomIdInput, name, color);
                if (res.success && res.playerId) {
                    onJoin(name, roomIdInput, isDebug, color, res.playerId);
                } else {
                    setError(res.error || 'ルームへの参加に失敗しました');
                    setIsLoading(false);
                }
            } else {
                // Create new room
                const { roomId, playerId } = await createRoom(name, color, roomIdInput);
                onJoin(name, roomId, isDebug, color, playerId);
            }
        } catch (e) {
            console.error(e);
            setError('エラーが発生しました');
            setIsLoading(false);
        }
    };

    const handleLocalPlay = () => {
        if (!name.trim()) {
            setError('名前を入力してください');
            return;
        }
        const color = getRandomColor();
        onJoin(name, '', isDebug, color);
    };

    const handleDeleteRoom = async () => {
        if (!roomIdInput.trim()) return;
        if (!window.confirm(`部屋 ${roomIdInput} の情報を削除しますか？`)) return;

        try {
            setIsLoading(true);
            await deleteRoom(roomIdInput);
            alert(`部屋 ${roomIdInput} を削除しました`);
            setRoomIdInput('');
        } catch (e) {
            console.error(e);
            alert('削除に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const isRoomIdValid = /^\d{4}$/.test(roomIdInput);

    return (
        <div className="entry-screen">
            <h1>HentaIto Online</h1>

            <div className="entry-form">
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        プレイヤー名
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例: 変態っと"
                            maxLength={10}
                            className="input-field"
                        />
                    </label>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        部屋番号 (4桁)
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={roomIdInput}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                                    setRoomIdInput(val);
                                }}
                                placeholder="1234"
                                className="input-field"
                                style={{ flex: 1, letterSpacing: '2px', textAlign: 'center' }}
                            />
                            {roomIdInput && (
                                <button
                                    onClick={handleDeleteRoom}
                                    className="delete-btn"
                                    title="部屋情報を削除"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        className="btn-local"
                        onClick={handleLocalPlay}
                        disabled={!name}
                    >
                        ローカル<br />
                        <span style={{ fontSize: '0.7rem' }}>(1台で)</span>
                    </button>

                    <button
                        className="btn-primary"
                        onClick={handleRoomAction}
                        disabled={isLoading || !name || !isRoomIdValid}
                        style={{ flex: 2 }}
                    >
                        {isLoading ? '処理中...' : '部屋に入る / 作る'}
                        <div style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>
                            (オンライン)
                        </div>
                    </button>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={isDebug}
                            onChange={(e) => setIsDebug(e.target.checked)}
                        />
                        デバッグモード (NPC追加)
                    </label>
                </div>

                {error && <div className="error-msg">{error}</div>}
            </div>

            <style>{`
        .entry-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #2c3e50;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        h1 { font-size: 3rem; margin-bottom: 2rem; font-weight: 800; }
        .entry-form {
          background: rgba(30, 41, 59, 0.9);
          padding: 2rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 320px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        label { display: flex; flex-direction: column; gap: 0.5rem; font-weight: bold; font-size: 0.9rem; color: #cbd5e1; }
        .input-field {
          padding: 0.8rem;
          border-radius: 8px;
          border: 2px solid #475569;
          font-size: 1rem;
          background: #0f172a;
          color: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: #3b82f6;
        }
        .btn-primary {
          padding: 0.8rem;
          background: #3b82f6; /* Blue for online */
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:disabled { background: #475569; cursor: not-allowed; opacity: 0.7; }
        .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }

        .btn-local {
             padding: 0.8rem;
             background: #e74c3c; /* Red for local */
             border: none;
             border-radius: 8px;
             color: white;
             font-size: 1rem;
             font-weight: bold;
             cursor: pointer;
             transition: all 0.2s;
             flex: 1;
        }
        .btn-local:hover { background: #c0392b; transform: translateY(-1px); }
        .btn-local:disabled { background: #475569; cursor: not-allowed; opacity: 0.7; }

        .delete-btn {
            background: #ef4444;
            border: none;
            border-radius: 8px;
            color: white;
            width: 40px;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .delete-btn:hover { background: #dc2626; }

        .checkbox-label {
            flex-direction: row;
            align-items: center;
            font-weight: normal;
            font-size: 0.8rem;
            cursor: pointer;
            color: #94a3b8;
        }
        .error-msg { 
            color: #f87171; 
            text-align: center; 
            font-size: 0.9rem; 
            background: rgba(239, 68, 68, 0.1);
            padding: 0.5rem;
            border-radius: 4px;
        }
      `}</style>
        </div>
    );
};
