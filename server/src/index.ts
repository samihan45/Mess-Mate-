import http from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { initSocket } from './realtime.js';
import { startSweeper } from './services/sweeper.js';
import { prisma } from './db.js';

const app = createApp();
const server = http.createServer(app);
initSocket(server);
const stopSweeper = startSweeper();

server.listen(config.PORT, () => {
  console.log(`MessMate API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  stopSweeper();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
