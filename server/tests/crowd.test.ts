import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCrowd, checkInsToScore, scoreToLevel, type ReportInput } from '../src/lib/crowd.js';

const NOW = new Date('2026-03-02T06:30:00.000Z');
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const student = (userId: string, level: ReportInput['level'], ago: number): ReportInput => ({
  userId,
  source: 'STUDENT',
  level,
  createdAt: minsAgo(ago),
});
const run = (reports: ReportInput[], checkIns: { userId: string; createdAt: Date }[] = [], seatingCapacity = 30) =>
  estimateCrowd({ reports, checkIns, seatingCapacity, now: NOW });

test('no evidence gives no level, never a guess', () => {
  const e = run([]);
  assert.equal(e.level, null);
  assert.equal(e.confidence, 'NONE');
  assert.equal(e.waitMinutes, null);
  assert.equal(e.lastUpdatedAt, null);
  assert.equal(e.isEstimate, true);
});

test('single fresh report is reported with LOW confidence and its timestamp', () => {
  const e = run([student('u1', 'HIGH', 2)]);
  assert.equal(e.level, 'HIGH');
  assert.equal(e.confidence, 'LOW');
  assert.equal(e.lastUpdatedAt, minsAgo(2).toISOString());
  assert.deepEqual(e.waitMinutes, { min: 15, max: 30 });
});

test('reports older than the student TTL are ignored', () => {
  assert.equal(run([student('u1', 'HIGH', 46)]).level, null);
});

test('a lone report that has mostly decayed is not enough evidence', () => {
  // 40 min old: weight 0.5^(40/15) ~ 0.157 < 0.2
  assert.equal(run([student('u1', 'HIGH', 40)]).level, null);
});

test('only the latest report per student counts', () => {
  const e = run([student('u1', 'HIGH', 20), student('u1', 'LOW', 1)]);
  assert.equal(e.level, 'LOW');
  assert.equal(e.basis.studentReports, 1);
});

test('recent reports outweigh older ones', () => {
  const e = run([student('a', 'LOW', 1), student('b', 'LOW', 2), student('c', 'HIGH', 30)]);
  assert.equal(e.level, 'LOW');
});

test('mixed fresh reports average to moderate and confidence rises with contributors', () => {
  const e = run([student('a', 'LOW', 3), student('b', 'HIGH', 3), student('c', 'MODERATE', 3), student('d', 'MODERATE', 3)]);
  assert.equal(e.level, 'MODERATE');
  assert.equal(e.confidence, 'HIGH');
  assert.equal(e.contributors, 4);
});

test('owner update counts double and expires after 90 minutes', () => {
  const owner: ReportInput = { userId: 'o', source: 'OWNER', level: 'HIGH', createdAt: minsAgo(5) };
  // Owner HIGH vs an older student LOW: owner's double weight wins
  assert.equal(run([owner, student('a', 'LOW', 10)]).level, 'HIGH');
  // Owner HIGH vs a fresh conflicting student LOW: signals disagree, so the estimate sits in between
  assert.equal(run([owner, student('a', 'LOW', 1)]).level, 'MODERATE');
  assert.equal(run([{ ...owner, createdAt: minsAgo(91) }]).level, null);
});

test('only the newest owner update counts', () => {
  const e = run([
    { userId: 'o', source: 'OWNER', level: 'HIGH', createdAt: minsAgo(30) },
    { userId: 'o', source: 'OWNER', level: 'LOW', createdAt: minsAgo(2) },
  ]);
  assert.equal(e.level, 'LOW');
  assert.equal(e.basis.ownerUpdate, true);
});

test('check-ins alone can produce an estimate, scaled by seating capacity', () => {
  const many = Array.from({ length: 24 }, (_, i) => ({ userId: `s${i}`, createdAt: minsAgo(3) }));
  assert.equal(run([], many, 30).level, 'HIGH');
  assert.equal(run([], many, 200).level, 'LOW');
});

test('check-ins outside the window are ignored and duplicates collapse per student', () => {
  const stale = [{ userId: 's1', createdAt: minsAgo(31) }];
  assert.equal(run([], stale).level, null);
  const dup = [
    { userId: 's1', createdAt: minsAgo(5) },
    { userId: 's1', createdAt: minsAgo(4) },
    { userId: 's1', createdAt: minsAgo(3) },
  ];
  assert.equal(run([], dup).basis.checkIns, 1);
});

test('check-ins cannot overpower direct reports', () => {
  const crowd = Array.from({ length: 40 }, (_, i) => ({ userId: `s${i}`, createdAt: minsAgo(1) }));
  const e = run([student('a', 'LOW', 1), student('b', 'LOW', 1), student('c', 'LOW', 1)], crowd, 30);
  // 3 LOW reports (weight 3) vs check-ins capped at 1.5 -> score (3*1 + 1.5*3)/4.5 = 1.67 -> MODERATE edge, never HIGH
  assert.notEqual(e.level, 'HIGH');
});

test('future-dated reports (clock skew) are ignored', () => {
  assert.equal(run([student('u1', 'HIGH', -10)]).level, null);
});

test('helpers', () => {
  assert.equal(scoreToLevel(1.2), 'LOW');
  assert.equal(scoreToLevel(2), 'MODERATE');
  assert.equal(scoreToLevel(2.6), 'HIGH');
  assert.equal(checkInsToScore(3, 30), 1);
  assert.equal(checkInsToScore(12, 30), 2);
  assert.equal(checkInsToScore(30, 30), 3);
});
