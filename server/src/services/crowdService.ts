import { prisma } from '../db.js';
import { CROWD_CONFIG, emptyEstimate, estimateCrowd, type CrowdEstimate } from '../lib/crowd.js';

export async function getCrowdMap(
  messes: { id: string; seatingCapacity: number }[],
  now: Date = new Date(),
): Promise<Map<string, CrowdEstimate>> {
  const out = new Map<string, CrowdEstimate>();
  if (messes.length === 0) return out;
  const ids = messes.map((m) => m.id);

  const [reports, checkIns] = await Promise.all([
    prisma.crowdReport.findMany({
      where: { messId: { in: ids }, expiresAt: { gt: now } },
      select: { messId: true, userId: true, source: true, level: true, createdAt: true },
    }),
    prisma.checkIn.findMany({
      where: {
        messId: { in: ids },
        geoVerified: true,
        createdAt: { gt: new Date(now.getTime() - CROWD_CONFIG.checkInWindowMin * 60_000) },
      },
      select: { messId: true, userId: true, createdAt: true },
    }),
  ]);

  const reportsByMess = new Map<string, typeof reports>();
  const checkInsByMess = new Map<string, typeof checkIns>();

  for (const report of reports) {
    const items = reportsByMess.get(report.messId) ?? [];
    items.push(report);
    reportsByMess.set(report.messId, items);
  }

  for (const checkIn of checkIns) {
    const items = checkInsByMess.get(checkIn.messId) ?? [];
    items.push(checkIn);
    checkInsByMess.set(checkIn.messId, items);
  }

  for (const m of messes) {
    out.set(
      m.id,
      estimateCrowd({
        reports: reportsByMess.get(m.id) ?? [],
        checkIns: checkInsByMess.get(m.id) ?? [],
        seatingCapacity: m.seatingCapacity,
        now,
      }),
    );
  }
  return out;
}

export async function getCrowdFor(mess: { id: string; seatingCapacity: number }): Promise<CrowdEstimate> {
  return (await getCrowdMap([mess])).get(mess.id) ?? emptyEstimate();
}
