import { useGame } from '../context/GameContext';
import { ScoreRow } from './ScoreRow';
import { DiceDisplay } from './DiceDisplay';
import { PlayerList } from './PlayerList';
import {
  Color,
  getValidWhiteMarks,
  getValidColorMarks,
  calculateScore,
} from '@qwixx/shared';

export function GameBoard() {
  const {
    gameState,
    playerId,
    connected,
    rollDice,
    markNumber,
    passWhitePhase,
    endTurn,
    scores,
    error,
    clearError,
  } = useGame();

  if (!gameState || !playerId) {
    return null;
  }

  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  if (!currentPlayer) {
    return <div>Error: Player not found</div>;
  }

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = activePlayer.id === playerId;
  const sheet = currentPlayer.sheet;

  // Calculate available numbers for each row
  const getAvailableNumbers = (color: Color): number[] => {
    if (!gameState.dice) return [];

    if (gameState.phase === 'white-phase') {
      // Check if player already acted in white phase
      if (gameState.whitePhaseActions[playerId]) return [];

      const validMarks = getValidWhiteMarks(sheet, gameState.dice, gameState.lockedRows);
      return validMarks.filter((m) => m.color === color).map((m) => m.number);
    }

    if (gameState.phase === 'color-phase' && isMyTurn) {
      // Check if already acted in color phase
      if (gameState.colorPhaseAction) return [];

      const validMarks = getValidColorMarks(sheet, gameState.dice, gameState.lockedRows);
      return validMarks.filter((m) => m.color === color).map((m) => m.number);
    }

    return [];
  };

  const handleMark = (color: Color, number: number) => {
    markNumber(color, number);
  };

  const hasActedWhitePhase = gameState.whitePhaseActions[playerId];
  const canPass = gameState.phase === 'white-phase' && !hasActedWhitePhase;
  const canEndTurn = isMyTurn && gameState.phase === 'color-phase';

  // Game over screen
  if (gameState.phase === 'ended') {
    const sortedPlayers = [...gameState.players].sort((a, b) => {
      const scoreA = scores ? scores[a.id] : calculateScore(a.sheet);
      const scoreB = scores ? scores[b.id] : calculateScore(b.sheet);
      return scoreB - scoreA;
    });

    return (
      <div className="game-over">
        <h1>Game Over!</h1>
        <div className="final-scores">
          {sortedPlayers.map((player, index) => {
            const score = scores ? scores[player.id] : calculateScore(player.sheet);
            const isYou = player.id === playerId;
            return (
              <div key={player.id} className={`final-score ${isYou ? 'you' : ''}`}>
                <span className="rank">#{index + 1}</span>
                <span className="name">{player.name} {isYou && '(You)'}</span>
                <span className="score">{score} points</span>
              </div>
            );
          })}
        </div>
        <button onClick={() => window.location.reload()}>Play Again</button>
      </div>
    );
  }

  return (
    <div className="game-board">
      <div className="game-header">
        <h2>Room: {gameState.roomCode}</h2>
        <div className="phase-indicator">
          {gameState.phase === 'rolling' && (
            isMyTurn ? 'Your turn - Roll the dice!' : `Waiting for ${activePlayer.name} to roll...`
          )}
          {gameState.phase === 'white-phase' && (
            <>
              White Phase - {hasActedWhitePhase ? 'Waiting for others...' : 'Mark a number or Pass'}
              {' '}({Object.keys(gameState.whitePhaseActions).length}/{gameState.players.length} done)
            </>
          )}
          {gameState.phase === 'color-phase' && (
            isMyTurn ? 'Color Phase - Your turn to mark or pass' : `Color Phase - ${activePlayer.name}'s turn`
          )}
        </div>
      </div>

      <div className="game-content">
        <div className="sheet-section">
          <h3>Your Score Sheet</h3>
          <div className="score-sheet">
            {(['red', 'yellow', 'green', 'blue'] as Color[]).map((color) => (
              <ScoreRow
                key={color}
                color={color}
                row={sheet[color]}
                availableNumbers={getAvailableNumbers(color)}
                onMark={(num) => handleMark(color, num)}
                globallyLocked={gameState.lockedRows.includes(color)}
              />
            ))}
          </div>
          <div className="penalties">
            Penalties: {Array(4).fill(0).map((_, i) => (
              <span key={i} className={`penalty-box ${i < sheet.penalties ? 'filled' : ''}`}>
                {i < sheet.penalties ? 'X' : ''}
              </span>
            ))}
            <span className="penalty-value">(-5 each)</span>
          </div>
          <div className="current-score">
            Current Score: {calculateScore(sheet)}
          </div>
        </div>

        <div className="side-panel">
          <DiceDisplay dice={gameState.dice} />

          <div className="action-buttons">
            {gameState.phase === 'rolling' && isMyTurn && (
              <button onClick={rollDice} className="roll-button">
                Roll Dice
              </button>
            )}
            {canPass && (
              <button onClick={passWhitePhase} className="pass-button">
                Pass (Don't Mark)
              </button>
            )}
            {canEndTurn && (
              <button onClick={endTurn} className="end-turn-button">
                End Turn
              </button>
            )}
          </div>

          <PlayerList
            players={gameState.players}
            currentPlayerId={playerId}
            activePlayerIndex={gameState.currentPlayerIndex}
          />
        </div>
      </div>

      {error && (
        <div className="error-toast">
          {error}
          <button onClick={clearError}>X</button>
        </div>
      )}
    </div>
  );
}
