import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@qwixx/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// In production, connect to same host. In dev, connect to localhost:3001
const SOCKET_URL = import.meta.env.PROD ? undefined : 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: TypedSocket = io(SOCKET_URL as string, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    socket.io.on('reconnect', (attempt: number) => {
      console.log('Socket reconnected after', attempt, 'attempts');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
