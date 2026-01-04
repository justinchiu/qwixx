import {
  GameState,
  Player,
  Color,
  createEmptySheet,
  generateRoomCode,
} from '@qwixx/shared';

export interface Room {
  code: string;
  state: GameState;
  playerSockets: Map<string, string>; // playerId -> socketId
}

const rooms = new Map<string, Room>();

export function createRoom(hostName: string, socketId: string): { room: Room; playerId: string } {
  let code = generateRoomCode();
  // Ensure unique code
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const playerId = crypto.randomUUID();
  const host: Player = {
    id: playerId,
    name: hostName,
    sheet: createEmptySheet(),
    isHost: true,
  };

  const state: GameState = {
    roomCode: code,
    players: [host],
    currentPlayerIndex: 0,
    dice: null,
    phase: 'waiting',
    lockedRows: [],
    whitePhaseActions: {},
    colorPhaseAction: false,
  };

  const room: Room = {
    code,
    state,
    playerSockets: new Map([[playerId, socketId]]),
  };

  rooms.set(code, room);
  return { room, playerId };
}

export function joinRoom(
  code: string,
  playerName: string,
  socketId: string
): { room: Room; playerId: string } | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  // Can't join if game already started
  if (room.state.phase !== 'waiting') {
    return null;
  }

  // Max 5 players
  if (room.state.players.length >= 5) {
    return null;
  }

  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: playerName,
    sheet: createEmptySheet(),
    isHost: false,
  };

  room.state.players.push(player);
  room.playerSockets.set(playerId, socketId);

  return { room, playerId };
}

export function leaveRoom(code: string, playerId: string): Room | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  room.state.players = room.state.players.filter((p) => p.id !== playerId);
  room.playerSockets.delete(playerId);

  // If no players left, delete the room
  if (room.state.players.length === 0) {
    rooms.delete(code);
    return null;
  }

  // If host left, assign new host
  if (!room.state.players.some((p) => p.isHost)) {
    room.state.players[0].isHost = true;
  }

  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getRoomBySocketId(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    for (const sid of room.playerSockets.values()) {
      if (sid === socketId) {
        return room;
      }
    }
  }
  return undefined;
}

export function getPlayerIdBySocketId(room: Room, socketId: string): string | undefined {
  for (const [playerId, sid] of room.playerSockets.entries()) {
    if (sid === socketId) {
      return playerId;
    }
  }
  return undefined;
}

export function updatePlayerSocket(room: Room, playerId: string, socketId: string): void {
  room.playerSockets.set(playerId, socketId);
}

export function checkAndLockRow(state: GameState, color: Color): boolean {
  // Check if any player has locked this row
  for (const player of state.players) {
    if (player.sheet[color].locked && !state.lockedRows.includes(color)) {
      state.lockedRows.push(color);
      return true;
    }
  }
  return false;
}
