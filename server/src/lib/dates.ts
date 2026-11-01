/**
 * Daily menus are keyed by calendar date in India Standard Time (UTC+05:30, no DST),
 * because the launch area is Pune. Dates are stored in a Postgres DATE column and
 * represented in JS as UTC-midnight Date objects.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDateString(at: Date = new Date()): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function dateFromString(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

export function todayIST(at: Date = new Date()): Date {
  return dateFromString(istDateString(at));
}

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
