import type { CrowdEstimate, CrowdLevel, DishCategory } from './types';

export const rupees = (n: number) => `₹${n}`;

export function formatDistance(m: number | null): string | null {
  if (m == null || !Number.isFinite(m) || m < 0) return null;
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const sec = Math.max(0, Math.round((now - timestamp) / 1000));
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return `${h} h ago`;
}

export const CROWD_LABEL: Record<CrowdLevel, string> = { LOW: 'Low crowd', MODERATE: 'Moderate crowd', HIGH: 'Busy' };
export const CROWD_SEGMENTS: Record<CrowdLevel, number> = { LOW: 1, MODERATE: 2, HIGH: 3 };

export function waitText(c: CrowdEstimate | null): string | null {
  if (!c?.waitMinutes) return null;
  const { min, max } = c.waitMinutes;
  return min === 0 ? `Under ${max} min wait` : `About ${min} to ${max} min wait`;
}

export function basisText(c: CrowdEstimate): string {
  const parts: string[] = [];
  if (c.basis.studentReports) parts.push(`${c.basis.studentReports} student report${c.basis.studentReports > 1 ? 's' : ''}`);
  if (c.basis.checkIns) parts.push(`${c.basis.checkIns} verified check-in${c.basis.checkIns > 1 ? 's' : ''}`);
  if (c.basis.ownerUpdate) parts.push('owner update');
  return parts.join(', ');
}

export const CATEGORY_LABEL: Record<DishCategory, string> = {
  SABJI: 'Sabji',
  DAL: 'Dal',
  RICE: 'Rice',
  ROTI: 'Roti and bhakri',
  THALI: 'Thali',
  SNACK: 'Snacks',
  SWEET: 'Sweets',
  OTHER: 'Other',
};
export const CATEGORY_ORDER: DishCategory[] = ['SABJI', 'DAL', 'THALI', 'RICE', 'ROTI', 'SNACK', 'SWEET', 'OTHER'];

export const FOOD_TYPE_LABEL = { VEG: 'Veg', NON_VEG: 'Non-veg', BOTH: 'Veg and non-veg' } as const;
