import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { prisma } from './db.js';
import { getCrowdFor } from './services/crowdService.js';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: config.clientOrigins } });
  io.on('connection', (socket) => {
    socket.on('mess:watch', (messId: unknown) => {
      if (typeof messId === 'string' && messId.length < 40) socket.join(`mess:${messId}`);
    });
    socket.on('mess:unwatch', (messId: unknown) => {
      if (typeof messId === 'string') socket.leave(`mess:${messId}`);
    });
  });
  return io;
}

/** Recompute one mess's crowd estimate and push it to every connected client. */
export async function emitCrowdUpdate(messId: string) {
  if (!io) return;
  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: { id: true, seatingCapacity: true } });
  if (!mess) return;
  const crowd = await getCrowdFor(mess);
  io.emit('crowd:update', { messId, crowd });
}

export function emitMenuUpdate(messId: string) {
  io?.emit('menu:update', { messId });
}
