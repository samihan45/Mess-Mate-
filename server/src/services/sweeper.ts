import { prisma } from '../db.js';
import { CROWD_CONFIG } from '../lib/crowd.js';
import { getCrowdMap } from './crowdService.js';
import { emitCrowdUpdate } from '../realtime.js';

const lastLevel = new Map<string, string>();

/**
 * Crowd estimates decay with time, so a mess can change from HIGH to "no recent data"
 * without anyone posting anything. Every minute we recompute messes with recent activity and
 * push a socket event when the visible level changes. Rows older than 24 h are purged.
 */
export async function sweepOnce(now: Date = new Date()) {
  const since = new Date(now.getTime() - Math.max(CROWD_CONFIG.ownerTtlMin, 120) * 60_000);
  const [fromReports, fromCheckIns] = await Promise.all([
    prisma.crowdReport.findMany({ where: { createdAt: { gt: since } }, select: { messId: true }, distinct: ['messId'] }),
    prisma.checkIn.findMany({ where: { createdAt: { gt: since } }, select: { messId: true }, distinct: ['messId'] }),
  ]);
  const ids = [...new Set([...fromReports, ...fromCheckIns, ...[...lastLevel.keys()].map((messId) => ({ messId }))].map((r) => r.messId))];
  if (ids.length) {
    const messes = await prisma.mess.findMany({ where: { id: { in: ids } }, select: { id: true, seatingCapacity: true } });
    const map = await getCrowdMap(messes, now);
    for (const [id, est] of map) {
      const key = est.level ?? 'NONE';
      const prev = lastLevel.get(id) ?? 'NONE';
      if (prev !== key) await emitCrowdUpdate(id);
      if (key === 'NONE') lastLevel.delete(id);
      else lastLevel.set(id, key);
    }
  }
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  await prisma.crowdReport.deleteMany({ where: { expiresAt: { lt: dayAgo } } });
  await prisma.checkIn.deleteMany({ where: { createdAt: { lt: dayAgo } } });
}

export function startSweeper(intervalMs = 60_000) {
  const timer = setInterval(() => {
    sweepOnce().catch((err) => console.error('[sweeper]', err));
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
