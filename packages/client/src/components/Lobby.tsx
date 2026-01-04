import { useState } from 'react';
import { useGame } from '../context/GameContext';

export function Lobby() {
  const { connected, roomCode, gameState, playerId, createRoom, joinRoom, leaveRoom, startGame, error, clearError } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');

  const currentPlayer = gameState?.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;

  if (!connected) {
    return <div className="lobby">Connecting to server...</div>;
  }

  // Check if we're trying to rejoin
  const storedRoomCode = sessionStorage.getItem('qwixx-roomCode');
  const storedPlayerId = sessionStorage.getItem('qwixx-playerId');
  if (storedRoomCode && storedPlayerId && !gameState && !error) {
    return <div className="lobby">Reconnecting to game...</div>;
  }

  // In waiting room
  if (roomCode && gameState?.phase === 'waiting') {
    return (
      <div className="lobby">
        <h2>Waiting Room</h2>
        <div className="room-code">
          Room Code: <strong>{roomCode}</strong>
        </div>
        <div className="player-list">
          <h3>Players ({gameState.players.length}/5)</h3>
          <ul>
            {gameState.players.map((player) => (
              <li key={player.id}>
                {player.name} {player.isHost && '(Host)'} {player.id === playerId && '(You)'}
              </li>
            ))}
          </ul>
        </div>
        {isHost && gameState.players.length >= 2 && (
          <button onClick={startGame} className="start-button">
            Start Game
          </button>
        )}
        {isHost && gameState.players.length < 2 && (
          <p className="waiting-message">Waiting for more players...</p>
        )}
        {!isHost && <p className="waiting-message">Waiting for host to start...</p>}
        <button onClick={leaveRoom} className="leave-button">
          {isHost ? 'Cancel Game' : 'Leave Room'}
        </button>
      </div>
    );
  }

  // Initial screen
  if (mode === 'initial') {
    return (
      <div className="lobby">
        <h1>Qwixx</h1>
        <div className="lobby-buttons">
          <button onClick={() => setMode('create')}>Create Game</button>
          <button onClick={() => setMode('join')}>Join Game</button>
        </div>
      </div>
    );
  }

  // Create game form
  if (mode === 'create') {
    const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (playerName.trim()) {
        createRoom(playerName.trim());
      }
    };

    return (
      <div className="lobby">
        <h2>Create Game</h2>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" disabled={!playerName.trim()}>
            Create
          </button>
          <button type="button" onClick={() => setMode('initial')}>
            Back
          </button>
        </form>
        {error && (
          <div className="error">
            {error}
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  // Join game form
  if (mode === 'join') {
    const handleJoin = (e: React.FormEvent) => {
      e.preventDefault();
      if (playerName.trim() && joinCode.trim()) {
        joinRoom(joinCode.trim().toUpperCase(), playerName.trim());
      }
    };

    return (
      <div className="lobby">
        <h2>Join Game</h2>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <input
            type="text"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button type="submit" disabled={!playerName.trim() || !joinCode.trim()}>
            Join
          </button>
          <button type="button" onClick={() => setMode('initial')}>
            Back
          </button>
        </form>
        {error && (
          <div className="error">
            {error}
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
