import { describe, expect, it } from 'vitest';
import { basisText, formatDistance, timeAgo, waitText } from './format';
import type { CrowdEstimate } from './types';

const est = (over: Partial<CrowdEstimate> = {}): CrowdEstimate => ({
  level: 'MODERATE',
  score: 2,
  confidence: 'MEDIUM',
  waitMinutes: { min: 5, max: 15 },
  lastUpdatedAt: null,
  contributors: 3,
  basis: { studentReports: 2, ownerUpdate: true, checkIns: 0 },
  isEstimate: true,
  ...over,
});

describe('format helpers', () => {
  it('formats distance in metres and kilometres', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(-1)).toBeNull();
    expect(formatDistance(Number.NaN)).toBeNull();
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(1520)).toBe('1.5 km');
  });

  it('describes recency in plain words', () => {
    const now = Date.parse('2026-03-02T06:30:00Z');
    expect(timeAgo(new Date(now - 10_000).toISOString(), now)).toBe('just now');
    expect(timeAgo(new Date(now - 4 * 60_000).toISOString(), now)).toBe('4 min ago');
    expect(timeAgo(new Date(now - 2 * 3600_000).toISOString(), now)).toBe('2 h ago');
    expect(timeAgo('not-a-date', now)).toBe('');
    expect(timeAgo(new Date(now).toISOString(), Number.NaN)).toBe('');
    expect(timeAgo(null, now)).toBe('');
  });

  it('words the wait estimate', () => {
    expect(waitText(est())).toBe('About 5 to 15 min wait');
    expect(waitText(est({ waitMinutes: { min: 0, max: 5 } }))).toBe('Under 5 min wait');
    expect(waitText(est({ waitMinutes: null }))).toBeNull();
    expect(waitText(est({ waitMinutes: { min: -1, max: 5 } }))).toBeNull();
    expect(waitText(est({ waitMinutes: { min: 10, max: 5 } }))).toBeNull();
    expect(waitText(est({ waitMinutes: { min: 5, max: Number.NaN } }))).toBeNull();
  });

  it('explains what an estimate is based on', () => {
    expect(basisText(est())).toBe('2 student reports, owner update');
  });
});
