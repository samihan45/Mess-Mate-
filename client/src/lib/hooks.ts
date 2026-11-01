import { useCallback, useEffect, useState } from 'react';
import { CAMPUS } from './config';

/** Re-renders on an interval so "4 min ago" labels stay honest. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export interface Origin {
  lat: number;
  lng: number;
  source: 'campus' | 'device';
}

const KEY = 'messmate.origin';

function read(): Origin {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Origin;
      if (typeof o.lat === 'number' && typeof o.lng === 'number') return o;
    }
  } catch {
    /* fall through */
  }
  return { lat: CAMPUS.lat, lng: CAMPUS.lng, source: 'campus' };
}

/** Where distances are measured from: the campus by default, or the device if the student allows it. */
export function useOrigin() {
  const [origin, setOrigin] = useState<Origin>(read);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback((o: Origin) => {
    setOrigin(o);
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch {
      /* ignore */
    }
  }, []);

  const locateMe = useCallback(() => {
    setError(null);
    if (!('geolocation' in navigator)) return setError('This browser cannot share location.');
    navigator.geolocation.getCurrentPosition(
      (p) => save({ lat: p.coords.latitude, lng: p.coords.longitude, source: 'device' }),
      () => setError('Location is blocked. Allow it in your browser settings, or keep using the campus.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, [save]);

  const resetToCampus = useCallback(() => save({ lat: CAMPUS.lat, lng: CAMPUS.lng, source: 'campus' }), [save]);

  return { origin, error, locateMe, resetToCampus };
}
