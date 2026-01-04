import { useSocket } from './hooks/useSocket';
import { GameProvider, useGame } from './context/GameContext';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';

function GameContent() {
  const { gameState } = useGame();

  // Show game board if game is in progress
  if (gameState && gameState.phase !== 'waiting') {
    return <GameBoard />;
  }

  // Show lobby otherwise
  return <Lobby />;
}

function App() {
  const { socket, connected } = useSocket();

  return (
    <GameProvider socket={socket} connected={connected}>
      <div className="app">
        <GameContent />
      </div>
    </GameProvider>
  );
}

export default App;
