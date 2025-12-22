import { io, type Socket } from 'socket.io-client';
import { getApiOrigin } from './api';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (socket) return socket;

  socket = io(getApiOrigin(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectChatSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
