import { Player, calculateScore } from '@qwixx/shared';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string | null;
  activePlayerIndex: number;
  scores?: Record<string, number> | null;
}

export function PlayerList({ players, currentPlayerId, activePlayerIndex, scores }: PlayerListProps) {
  return (
    <div className="player-list-game">
      <h3>Players</h3>
      <ul>
        {players.map((player, index) => {
          const isActive = index === activePlayerIndex;
          const isYou = player.id === currentPlayerId;
          const score = scores ? scores[player.id] : calculateScore(player.sheet);

          return (
            <li key={player.id} className={`${isActive ? 'active' : ''} ${isYou ? 'you' : ''}`}>
              <span className="player-name">
                {player.name}
                {isYou && ' (You)'}
                {isActive && ' - Rolling'}
              </span>
              <span className="player-score">
                Score: {score} | Penalties: {player.sheet.penalties}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
