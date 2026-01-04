import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@qwixx/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: TypedSocket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
