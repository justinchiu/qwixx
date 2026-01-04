import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  GameState,
  Player,
  DiceRoll,
  Color,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@qwixx/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface GameContextType {
  socket: TypedSocket | null;
  connected: boolean;
  playerId: string | null;
  roomCode: string | null;
  gameState: GameState | null;
  error: string | null;
  scores: Record<string, number> | null;
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  rollDice: () => void;
  markNumber: (color: Color, number: number) => void;
  passWhitePhase: () => void;
  endTurn: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({
  children,
  socket,
  connected,
}: {
  children: React.ReactNode;
  socket: TypedSocket | null;
  connected: boolean;
}) {
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem('qwixx-playerId');
  });
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    return sessionStorage.getItem('qwixx-roomCode');
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [hasTriedRejoin, setHasTriedRejoin] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', (code, id) => {
      setRoomCode(code);
      setPlayerId(id);
      sessionStorage.setItem('qwixx-roomCode', code);
      sessionStorage.setItem('qwixx-playerId', id);
    });

    socket.on('room-joined', (id) => {
      setPlayerId(id);
      sessionStorage.setItem('qwixx-playerId', id);
      // roomCode is set via state-updated
    });

    socket.on('room-rejoined', (state) => {
      setGameState(state);
      setRoomCode(state.roomCode);
      setError(null);
      console.log('Successfully rejoined room');
    });

    socket.on('player-joined', (_player) => {
      // State update will come via state-updated
    });

    socket.on('player-left', (_id) => {
      // State update will come via state-updated
    });

    socket.on('room-left', () => {
      setPlayerId(null);
      setRoomCode(null);
      setGameState(null);
      setScores(null);
      sessionStorage.removeItem('qwixx-roomCode');
      sessionStorage.removeItem('qwixx-playerId');
    });

    socket.on('game-started', (state) => {
      setGameState(state);
      setRoomCode(state.roomCode);
    });

    socket.on('dice-rolled', (_dice) => {
      // State update will come via state-updated
    });

    socket.on('state-updated', (state) => {
      setGameState(state);
      setRoomCode(state.roomCode);
      sessionStorage.setItem('qwixx-roomCode', state.roomCode);
    });

    socket.on('game-ended', (state, finalScores) => {
      setGameState(state);
      setScores(finalScores);
    });

    socket.on('error', (message) => {
      setError(message);
      // If room no longer exists or player not found, clear session
      if (message.includes('no longer exists') || message.includes('no longer in room')) {
        setPlayerId(null);
        setRoomCode(null);
        setGameState(null);
        setScores(null);
        sessionStorage.removeItem('qwixx-roomCode');
        sessionStorage.removeItem('qwixx-playerId');
      }
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-rejoined');
      socket.off('room-left');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
      socket.off('dice-rolled');
      socket.off('state-updated');
      socket.off('game-ended');
      socket.off('error');
    };
  }, [socket]);

  // Try to rejoin room on connect if we have stored session
  useEffect(() => {
    if (!socket || !connected || hasTriedRejoin) return;

    const storedRoomCode = sessionStorage.getItem('qwixx-roomCode');
    const storedPlayerId = sessionStorage.getItem('qwixx-playerId');

    if (storedRoomCode && storedPlayerId && !gameState) {
      console.log('Attempting to rejoin room:', storedRoomCode);
      socket.emit('rejoin-room', storedRoomCode, storedPlayerId);
      setHasTriedRejoin(true);
    }
  }, [socket, connected, hasTriedRejoin, gameState]);

  const createRoom = useCallback(
    (playerName: string) => {
      socket?.emit('create-room', playerName);
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      socket?.emit('join-room', code, playerName);
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    socket?.emit('leave-room');
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('start-game');
  }, [socket]);

  const rollDice = useCallback(() => {
    socket?.emit('roll-dice');
  }, [socket]);

  const markNumber = useCallback(
    (color: Color, number: number) => {
      socket?.emit('mark-number', color, number);
    },
    [socket]
  );

  const passWhitePhase = useCallback(() => {
    socket?.emit('pass-white-phase');
  }, [socket]);

  const endTurn = useCallback(() => {
    socket?.emit('end-turn');
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <GameContext.Provider
      value={{
        socket,
        connected,
        playerId,
        roomCode,
        gameState,
        error,
        scores,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        rollDice,
        markNumber,
        passWhitePhase,
        endTurn,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
