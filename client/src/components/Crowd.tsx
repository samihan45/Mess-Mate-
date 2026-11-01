import { Info } from 'lucide-react';
import type { CrowdEstimate, CrowdLevel } from '../lib/types';
import { CROWD_LABEL, CROWD_SEGMENTS, basisText, timeAgo, waitText } from '../lib/format';
import { useNow } from '../lib/hooks';

const DOT: Record<CrowdLevel, string> = { LOW: 'bg-crowd-low', MODERATE: 'bg-crowd-mid', HIGH: 'bg-crowd-high' };
const PILL: Record<CrowdLevel, string> = {
  LOW: 'bg-crowd-low/10 text-[#13693a]',
  MODERATE: 'bg-crowd-mid/15 text-[#7a5700]',
  HIGH: 'bg-crowd-high/10 text-[#a52a21]',
};

/** Compact status for cards and lists. Always says "est." so it is never read as a head count. */
export function CrowdBadge({ crowd }: { crowd: CrowdEstimate | null }) {
  if (!crowd?.level) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-line/60 px-2.5 py-1 text-xs font-semibold text-muted">
        <span className="h-2 w-2 rounded-full bg-muted/50" aria-hidden /> No recent reports
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[crowd.level]}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[crowd.level]}`} aria-hidden />
      {CROWD_LABEL[crowd.level]}
      <span className="font-medium opacity-75">est.</span>
    </span>
  );
}

/** Full crowd readout: segments, wait range, freshness and what the estimate is based on. */
export function CrowdMeter({ crowd }: { crowd: CrowdEstimate | null }) {
  const now = useNow();
  const lit = crowd?.level ? CROWD_SEGMENTS[crowd.level] : 0;
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${crowd?.level && i < lit ? DOT[crowd.level] : 'bg-line'}`} />
        ))}
      </div>
      {crowd?.level ? (
        <>
          <p className="mt-3 font-display text-2xl font-bold">
            {CROWD_LABEL[crowd.level]} <span className="text-base font-medium text-muted">(estimate)</span>
          </p>
          <p className="text-sm font-medium">{waitText(crowd)}</p>
          <p className="mt-1 text-sm text-muted">
            Updated {timeAgo(crowd.lastUpdatedAt, now)} from {basisText(crowd)}.
            {crowd.confidence === 'LOW' && ' Only one source so far, so treat it with care.'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-2xl font-bold">No recent reports</p>
          <p className="text-sm text-muted">Nobody has reported in the last hour, so we are not guessing. Report what you see to help the next person.</p>
        </>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Estimated from student reports, location-verified QR check-ins and owner updates. It is not a head count.
      </p>
    </div>
  );
}
