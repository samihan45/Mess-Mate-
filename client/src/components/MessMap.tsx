import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import type { Mess } from '../lib/types';
import { CAMPUS } from '../lib/config';
import { rupees } from '../lib/format';
import { CrowdBadge } from './Crowd';

const pin = (m: Mess) =>
  L.divIcon({ className: '', html: `<div class="mm-pin ${m.crowd?.level?.toLowerCase() ?? 'none'}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

export default function MessMap({ messes, center }: { messes: Mess[]; center?: { lat: number; lng: number } }) {
  const c = center ?? CAMPUS;
  return (
    <MapContainer center={[c.lat, c.lng]} zoom={15} scrollWheelZoom className="h-[420px] w-full rounded-2xl border border-line sm:h-[560px]" aria-label="Map of nearby messes">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[c.lat, c.lng]} radius={7} pathOptions={{ color: '#A12D5C', fillColor: '#A12D5C', fillOpacity: 0.9 }}>
        <Tooltip>{center ? 'You' : CAMPUS.name}</Tooltip>
      </CircleMarker>
      {messes.map((m) => (
        <Marker key={m.id} position={[m.latitude, m.longitude]} icon={pin(m)}>
          <Popup>
            <div className="space-y-1.5">
              <Link to={`/messes/${m.id}`} className="font-display text-base font-bold text-ink underline">
                {m.name}
              </Link>
              <div>{rupees(m.avgMealPrice)} a meal</div>
              <CrowdBadge crowd={m.crowd} />
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
