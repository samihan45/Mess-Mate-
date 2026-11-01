export const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Approximate centre of the DY Patil campus, Akurdi. Override with VITE_CAMPUS_LAT / VITE_CAMPUS_LNG.
export const CAMPUS = {
  name: 'DY Patil campus, Akurdi',
  lat: Number(import.meta.env.VITE_CAMPUS_LAT ?? 18.646),
  lng: Number(import.meta.env.VITE_CAMPUS_LNG ?? 73.759),
};
