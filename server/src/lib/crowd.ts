/**
 * MessMate crowd estimator.
 *
 * This is an ESTIMATE built from human signals. It is not occupancy detection,
 * and every response carries `isEstimate: true` so the UI must label it as such.
 *
 * Signals
 *   1. Student reports  : "Low / Moderate / High". Latest report per student only.
 *                         Weight 1, halves every 15 min, dropped after 45 min.
 *   2. Owner update     : latest owner report only. Weight 2, halves every 30 min,
 *                         dropped after 90 min.
 *   3. Verified check-ins: students who scanned the mess QR *and* were geolocated
 *                         near the mess in the last 30 min. Their count is compared with
 *                         seating capacity to give an implied level. Weight 0.3 per
 *                         person (decayed), capped at 1.5, so check-ins support but never
 *                         overpower direct reports.
 *
 * Score = weighted average of the signal levels (LOW=1, MODERATE=2, HIGH=3).
 * If the total weight is below MIN_WEIGHT there is not enough fresh evidence and the
 * level is null ("no recent data") rather than a guess.
 */

export type CrowdLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type CrowdSource = 'STUDENT' | 'OWNER';
export type Confidence = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export const CROWD_CONFIG = {
  studentTtlMin: 45,
  ownerTtlMin: 90,
  studentHalfLifeMin: 15,
  ownerHalfLifeMin: 30,
  checkInHalfLifeMin: 15,
  ownerWeight: 2,
  checkInWindowMin: 30,
  checkInWeightPerPerson: 0.3,
  checkInMaxWeight: 1.5,
  minWeight: 0.2,
  lowBelow: 5 / 3, // score < 1.67  -> LOW
  highFrom: 7 / 3, // score >= 2.33 -> HIGH
  waitMinutes: {
    LOW: { min: 0, max: 5 },
    MODERATE: { min: 5, max: 15 },
    HIGH: { min: 15, max: 30 },
  },
} as const;

export interface ReportInput {
  userId: string;
  source: CrowdSource;
  level: CrowdLevel;
  createdAt: Date;
}

export interface CheckInInput {
  userId: string;
  createdAt: Date;
}

export interface CrowdEstimate {
  level: CrowdLevel | null;
  score: number | null;
  confidence: Confidence;
  waitMinutes: { min: number; max: number } | null;
  lastUpdatedAt: string | null;
  contributors: number;
  basis: { studentReports: number; ownerUpdate: boolean; checkIns: number };
  isEstimate: true;
}

const LEVEL_VALUE: Record<CrowdLevel, number> = { LOW: 1, MODERATE: 2, HIGH: 3 };
const MIN = 60_000;

const decay = (ageMin: number, halfLifeMin: number) => Math.pow(0.5, Math.max(0, ageMin) / halfLifeMin);

export function ttlMinutes(source: CrowdSource): number {
  return source === 'OWNER' ? CROWD_CONFIG.ownerTtlMin : CROWD_CONFIG.studentTtlMin;
}

export function scoreToLevel(score: number): CrowdLevel {
  if (score < CROWD_CONFIG.lowBelow) return 'LOW';
  if (score >= CROWD_CONFIG.highFrom) return 'HIGH';
  return 'MODERATE';
}

/** Implied level from verified check-ins versus seating capacity. */
export function checkInsToScore(count: number, seatingCapacity: number): number {
  const ratio = count / Math.max(1, seatingCapacity);
  if (ratio < 0.25) return 1;
  if (ratio < 0.6) return 2;
  return 3;
}

export function emptyEstimate(): CrowdEstimate {
  return {
    level: null,
    score: null,
    confidence: 'NONE',
    waitMinutes: null,
    lastUpdatedAt: null,
    contributors: 0,
    basis: { studentReports: 0, ownerUpdate: false, checkIns: 0 },
    isEstimate: true,
  };
}

export function estimateCrowd(input: {
  reports: ReportInput[];
  checkIns: CheckInInput[];
  seatingCapacity: number;
  now?: Date;
}): CrowdEstimate {
  const now = (input.now ?? new Date()).getTime();
  const cfg = CROWD_CONFIG;
  const ageMin = (d: Date) => (now - d.getTime()) / MIN;

  // --- reports: drop expired, keep latest per (source, user)
  const latest = new Map<string, ReportInput>();
  for (const r of input.reports) {
    const age = ageMin(r.createdAt);
    if (age < 0 || age > ttlMinutes(r.source)) continue;
    const key = `${r.source}:${r.userId}`;
    const prev = latest.get(key);
    if (!prev || r.createdAt > prev.createdAt) latest.set(key, r);
  }
  // owners: only the single most recent owner update counts, whoever posted it
  const owners = [...latest.values()].filter((r) => r.source === 'OWNER').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const students = [...latest.values()].filter((r) => r.source === 'STUDENT');
  const ownerReport = owners[0];

  let weightSum = 0;
  let valueSum = 0;
  let newest = 0;
  const people = new Set<string>();

  for (const r of students) {
    const w = decay(ageMin(r.createdAt), cfg.studentHalfLifeMin);
    weightSum += w;
    valueSum += w * LEVEL_VALUE[r.level];
    newest = Math.max(newest, r.createdAt.getTime());
    people.add(r.userId);
  }

  if (ownerReport) {
    const w = cfg.ownerWeight * decay(ageMin(ownerReport.createdAt), cfg.ownerHalfLifeMin);
    weightSum += w;
    valueSum += w * LEVEL_VALUE[ownerReport.level];
    newest = Math.max(newest, ownerReport.createdAt.getTime());
  }

  // --- verified check-ins: distinct students inside the window
  const seen = new Map<string, Date>();
  for (const c of input.checkIns) {
    const age = ageMin(c.createdAt);
    if (age < 0 || age > cfg.checkInWindowMin) continue;
    const prev = seen.get(c.userId);
    if (!prev || c.createdAt > prev) seen.set(c.userId, c.createdAt);
  }
  const checkInCount = seen.size;
  if (checkInCount > 0) {
    let decayed = 0;
    for (const [userId, at] of seen) {
      decayed += decay(ageMin(at), cfg.checkInHalfLifeMin);
      newest = Math.max(newest, at.getTime());
      people.add(userId);
    }
    const w = Math.min(cfg.checkInMaxWeight, cfg.checkInWeightPerPerson * decayed);
    weightSum += w;
    valueSum += w * checkInsToScore(checkInCount, input.seatingCapacity);
  }

  const basis = { studentReports: students.length, ownerUpdate: Boolean(ownerReport), checkIns: checkInCount };

  if (weightSum < cfg.minWeight) {
    return { ...emptyEstimate(), basis };
  }

  const score = valueSum / weightSum;
  const level = scoreToLevel(score);

  const points = people.size + (ownerReport ? 2 : 0);
  const confidence: Confidence = points >= 4 ? 'HIGH' : points >= 2 ? 'MEDIUM' : 'LOW';

  return {
    level,
    score: Math.round(score * 100) / 100,
    confidence,
    waitMinutes: { ...cfg.waitMinutes[level] },
    lastUpdatedAt: new Date(newest).toISOString(),
    contributors: people.size + (ownerReport ? 1 : 0),
    basis,
    isEstimate: true,
  };
}
