import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPinOff } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { CrowdEstimate } from '../lib/types';
import { CrowdMeter } from '../components/Crowd';
import { ErrorState, Notice, SampleBadge, Spinner } from '../components/ui';

interface CheckInResult {
  alreadyCheckedIn: boolean;
  geoVerified: boolean;
  distanceMeters?: number | null;
  mess: { id: string; name: string };
  crowd: CrowdEstimate;
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 });
  });
}

export default function CheckIn() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  const [locating, setLocating] = useState(false);

  const resolve = useQuery({
    queryKey: ['checkin', token],
    queryFn: () => api<{ mess: { id: string; name: string; address: string; isSample: boolean } }>(`/checkins/resolve/${token}`),
    retry: false,
  });

  const checkIn = useMutation({
    mutationFn: async () => {
      setLocating(true);
      const pos = await getPosition();
      setLocating(false);
      return api<CheckInResult>('/checkins', { body: { qrToken: token, ...(pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : {}) } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mess'] }),
  });

  if (resolve.isLoading) return <Spinner label="Reading QR code" />;
  if (resolve.isError) return <ErrorState message="This QR code is not active. Ask the mess for a current one." />;
  const mess = resolve.data!.mess;
  const r = checkIn.data;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Check in at {mess.name}</h1>
        <p className="mt-1 text-sm text-muted">{mess.address} {mess.isSample && <SampleBadge />}</p>
      </div>

      {!r && (
        <div className="plate space-y-4 p-5">
          <p className="text-sm">Checking in tells other students someone is here. It only counts toward the crowd estimate when your phone’s location is within a few hundred metres of the mess. We store the location with the check-in and delete check-ins after 24 hours.</p>
          <button className="btn-accent w-full" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>
            {locating ? 'Finding your location' : checkIn.isPending ? 'Checking in' : 'Check in'}
          </button>
          {checkIn.isError && <Notice tone="error">{errorMessage(checkIn.error)}</Notice>}
        </div>
      )}

      {r && (
        <div className="plate space-y-4 p-5">
          {r.geoVerified ? (
            <p className="flex items-start gap-2 font-semibold text-[#13693a]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> {r.alreadyCheckedIn ? 'You are already checked in.' : 'Checked in and location verified.'}</p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-start gap-2 font-semibold"><MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-crowd-mid" aria-hidden /> Check-in saved, but it will not count.</p>
              <p className="text-sm text-muted">{r.distanceMeters != null ? `Your phone is about ${r.distanceMeters} m from the mess.` : 'We could not read your location.'} Allow location access and be at the mess for it to count toward the crowd estimate.</p>
            </div>
          )}
          <CrowdMeter crowd={r.crowd} />
          <Link to={`/messes/${r.mess.id}`} className="btn-primary w-full">See today’s menu</Link>
        </div>
      )}
    </div>
  );
}
