import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from './config';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) socket = io(API_BASE || undefined, { transports: ['websocket', 'polling'], reconnectionDelayMax: 10_000 });
  return socket;
}

/** Mount once near the app root. Refreshes cached data when the server pushes a change. */
export function useLiveUpdates(): boolean {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['messes'] });
      qc.invalidateQueries({ queryKey: ['mess'] });
    };
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    setConnected(s.connected);
    s.on('connect', on);
    s.on('disconnect', off);
    s.on('crowd:update', refresh);
    s.on('menu:update', refresh);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
      s.off('crowd:update', refresh);
      s.off('menu:update', refresh);
    };
  }, [qc]);

  return connected;
}
