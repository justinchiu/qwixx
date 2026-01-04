import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Color,
  rollDice,
  canMarkNumber,
  markNumber,
  addPenalty,
  calculateScore,
  isGameOver,
  getValidWhiteMarks,
  getValidColorMarks,
} from '@qwixx/shared';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getRoomBySocketId,
  getPlayerIdBySocketId,
  checkAndLockRow,
} from './rooms.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function checkWhitePhaseComplete(io: TypedServer, room: ReturnType<typeof getRoom>) {
  if (!room || room.state.phase !== 'white-phase') return;

  const allActed = room.state.players.every(p => room.state.whitePhaseActions[p.id]);
  if (allActed) {
    room.state.phase = 'color-phase';
    io.to(room.code).emit('state-updated', room.state);
  }
}

export function setupHandlers(io: TypedServer) {
  io.on('connection', (socket: TypedSocket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', (playerName: string) => {
      const { room, playerId } = createRoom(playerName, socket.id);
      socket.join(room.code);
      socket.emit('room-created', room.code, playerId);
      socket.emit('state-updated', room.state);
      console.log(`Room ${room.code} created by ${playerName}`);
    });

    socket.on('join-room', (roomCode: string, playerName: string) => {
      const result = joinRoom(roomCode, playerName, socket.id);
      if (!result) {
        socket.emit('error', 'Could not join room. It may not exist, be full, or already started.');
        return;
      }

      const { room, playerId } = result;
      socket.join(room.code);
      socket.emit('room-joined', playerId);

      const newPlayer = room.state.players.find((p) => p.id === playerId)!;
      socket.to(room.code).emit('player-joined', newPlayer);
      io.to(room.code).emit('state-updated', room.state);
      console.log(`${playerName} joined room ${room.code}`);
    });

    socket.on('rejoin-room', (roomCode: string, odlPlayerId: string) => {
      const room = getRoom(roomCode);
      if (!room) {
        socket.emit('error', 'Room no longer exists');
        return;
      }

      // Check if player exists in room
      const player = room.state.players.find((p) => p.id === odlPlayerId);
      if (!player) {
        socket.emit('error', 'Player no longer in room');
        return;
      }

      // Update socket mapping
      room.playerSockets.set(odlPlayerId, socket.id);
      socket.join(room.code);
      socket.emit('room-rejoined', room.state);
      console.log(`${player.name} rejoined room ${room.code}`);
    });

    socket.on('leave-room', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      if (!playerId) {
        return;
      }

      socket.leave(room.code);
      socket.emit('room-left');

      const updatedRoom = leaveRoom(room.code, playerId);
      if (updatedRoom) {
        io.to(room.code).emit('player-left', playerId);
        io.to(room.code).emit('state-updated', updatedRoom.state);
      }
      console.log(`Player left room ${room.code}`);
    });

    socket.on('start-game', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      const player = room.state.players.find((p) => p.id === playerId);
      if (!player?.isHost) {
        socket.emit('error', 'Only the host can start the game');
        return;
      }

      if (room.state.players.length < 2) {
        socket.emit('error', 'Need at least 2 players to start');
        return;
      }

      room.state.phase = 'rolling';
      room.state.currentPlayerIndex = 0;
      io.to(room.code).emit('game-started', room.state);
      console.log(`Game started in room ${room.code}`);
    });

    socket.on('roll-dice', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      if (room.state.phase !== 'rolling') {
        socket.emit('error', 'Cannot roll dice now');
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      const currentPlayer = room.state.players[room.state.currentPlayerIndex];
      if (currentPlayer.id !== playerId) {
        socket.emit('error', 'Not your turn');
        return;
      }

      room.state.dice = rollDice();
      room.state.phase = 'white-phase';
      room.state.whitePhaseActions = {};
      room.state.colorPhaseAction = false;

      io.to(room.code).emit('dice-rolled', room.state.dice);
      io.to(room.code).emit('state-updated', room.state);
      console.log(`Dice rolled in room ${room.code}:`, room.state.dice);
    });

    socket.on('mark-number', (color: Color, number: number) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      const player = room.state.players.find((p) => p.id === playerId);
      if (!player) {
        socket.emit('error', 'Player not found');
        return;
      }

      const currentPlayer = room.state.players[room.state.currentPlayerIndex];
      const isActivePlayer = currentPlayer.id === playerId;

      if (room.state.phase === 'white-phase') {
        // Anyone can mark during white phase
        if (room.state.whitePhaseActions[playerId!]) {
          socket.emit('error', 'You already acted this phase');
          return;
        }

        // Validate the mark is a valid white sum
        const validMarks = getValidWhiteMarks(player.sheet, room.state.dice!, room.state.lockedRows);
        const isValid = validMarks.some((m) => m.color === color && m.number === number);
        if (!isValid) {
          socket.emit('error', 'Invalid move');
          return;
        }

        player.sheet = markNumber(player.sheet, color, number);
        room.state.whitePhaseActions[playerId!] = true;
        checkAndLockRow(room.state, color);

        // Check if all players have acted - auto transition to color phase
        io.to(room.code).emit('state-updated', room.state);
        checkWhitePhaseComplete(io, room);
        return;

      } else if (room.state.phase === 'color-phase') {
        // Only active player can mark during color phase
        if (!isActivePlayer) {
          socket.emit('error', 'Not your turn');
          return;
        }

        if (room.state.colorPhaseAction) {
          socket.emit('error', 'You already acted this phase');
          return;
        }

        // Validate the mark is a valid color sum
        const validMarks = getValidColorMarks(player.sheet, room.state.dice!, room.state.lockedRows);
        const isValid = validMarks.some((m) => m.color === color && m.number === number);
        if (!isValid) {
          socket.emit('error', 'Invalid move');
          return;
        }

        player.sheet = markNumber(player.sheet, color, number);
        room.state.colorPhaseAction = true;
        checkAndLockRow(room.state, color);

      } else {
        socket.emit('error', 'Cannot mark numbers now');
        return;
      }

      // Check for game over
      if (isGameOver(room.state)) {
        room.state.phase = 'ended';
        const scores: Record<string, number> = {};
        for (const p of room.state.players) {
          scores[p.id] = calculateScore(p.sheet);
        }
        io.to(room.code).emit('game-ended', room.state, scores);
        return;
      }

      io.to(room.code).emit('state-updated', room.state);
    });

    socket.on('pass-white-phase', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      if (room.state.phase !== 'white-phase') {
        socket.emit('error', 'Not in white phase');
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      if (room.state.whitePhaseActions[playerId!]) {
        socket.emit('error', 'You already acted this phase');
        return;
      }

      room.state.whitePhaseActions[playerId!] = true;
      io.to(room.code).emit('state-updated', room.state);
      checkWhitePhaseComplete(io, room);
    });

    socket.on('end-turn', () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const playerId = getPlayerIdBySocketId(room, socket.id);
      const currentPlayer = room.state.players[room.state.currentPlayerIndex];

      if (currentPlayer.id !== playerId) {
        socket.emit('error', 'Not your turn');
        return;
      }

      if (room.state.phase !== 'color-phase') {
        socket.emit('error', 'Cannot end turn now');
        return;
      }

      // Check if active player needs a penalty
      const activePlayerMarkedWhite = room.state.whitePhaseActions[playerId!];
      const activePlayerMarkedColor = room.state.colorPhaseAction;

      if (!activePlayerMarkedWhite && !activePlayerMarkedColor) {
        // Active player marked nothing - penalty
        currentPlayer.sheet = addPenalty(currentPlayer.sheet);
      }

      // Check for game over
      if (isGameOver(room.state)) {
        room.state.phase = 'ended';
        const scores: Record<string, number> = {};
        for (const p of room.state.players) {
          scores[p.id] = calculateScore(p.sheet);
        }
        io.to(room.code).emit('game-ended', room.state, scores);
        return;
      }

      // Next player's turn
      room.state.currentPlayerIndex = (room.state.currentPlayerIndex + 1) % room.state.players.length;
      room.state.phase = 'rolling';
      room.state.dice = null;
      room.state.whitePhaseActions = {};
      room.state.colorPhaseAction = false;

      io.to(room.code).emit('state-updated', room.state);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const room = getRoomBySocketId(socket.id);
      if (room) {
        const playerId = getPlayerIdBySocketId(room, socket.id);
        if (playerId) {
          const updatedRoom = leaveRoom(room.code, playerId);
          if (updatedRoom) {
            io.to(room.code).emit('player-left', playerId);
            io.to(room.code).emit('state-updated', updatedRoom.state);
          }
        }
      }
    });
  });
}
