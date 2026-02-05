import { RankingList } from '../ui/RankingList';
import type { Player } from '../../types/game';

interface FinalResultScreenProps {
    players: Player[];
    onBackToLobby: () => void;
}

export const FinalResultScreen: React.FC<FinalResultScreenProps> = ({ players, onBackToLobby }) => {
    return (
        <div className="container" style={{ textAlign: 'center' }}>
            {/* Title handled inside RankingList or header */}

            <RankingList players={players} showTitle={true} isDebug={true} />

            <button
                className="btn-primary"
                onClick={onBackToLobby}
                style={{ fontSize: '1.2rem', padding: '1rem 3rem', marginTop: '2rem' }}
            >
                ロビーに戻る
            </button>
        </div>
    );
};
