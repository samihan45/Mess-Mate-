import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters } from '../src/lib/geo.js';
import { istDateString, todayIST, toDateString } from '../src/lib/dates.js';

test('haversine: identical points are 0 m, ~111 km per degree of latitude', () => {
  assert.equal(haversineMeters(18.646, 73.759, 18.646, 73.759), 0);
  const d = haversineMeters(18, 73, 19, 73);
  assert.ok(d > 111_000 && d < 111_400, `got ${d}`);
});

test('IST date rolls over at 18:30 UTC', () => {
  assert.equal(istDateString(new Date('2026-03-02T18:29:00Z')), '2026-03-02');
  assert.equal(istDateString(new Date('2026-03-02T18:30:00Z')), '2026-03-03');
  assert.equal(toDateString(todayIST(new Date('2026-03-02T20:00:00Z'))), '2026-03-03');
});
