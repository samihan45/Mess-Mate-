import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CrowdBadge, CrowdMeter } from './Crowd';
import type { CrowdEstimate } from '../lib/types';

const base: CrowdEstimate = {
  level: 'HIGH',
  score: 2.8,
  confidence: 'MEDIUM',
  waitMinutes: { min: 15, max: 30 },
  lastUpdatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  contributors: 3,
  basis: { studentReports: 2, ownerUpdate: true, checkIns: 0 },
  isEstimate: true,
};

describe('crowd components never overclaim', () => {
  it('badge says "No recent reports" when there is no estimate', () => {
    const { container } = render(<CrowdBadge crowd={null} />);
    expect(container.textContent).toContain('No recent reports');
  });

  it('badge labels a level as an estimate', () => {
    const { container } = render(<CrowdBadge crowd={base} />);
    expect(container.textContent).toContain('Busy');
    expect(container.textContent).toContain('est.');
  });

  it('meter shows wait range, freshness, sources and the not-a-head-count disclaimer', () => {
    const { container } = render(<CrowdMeter crowd={base} />);
    const text = container.textContent ?? '';
    expect(text).toContain('About 15 to 30 min wait');
    expect(text).toContain('4 min ago');
    expect(text).toContain('2 student reports, owner update');
    expect(text).toContain('not a head count');
  });

  it('meter without data refuses to guess', () => {
    const { container } = render(<CrowdMeter crowd={{ ...base, level: null, waitMinutes: null, lastUpdatedAt: null }} />);
    expect(container.textContent).toContain('we are not guessing');
  });
});
