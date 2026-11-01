import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, QrCode, Search, ChefHat } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { CAMPUS } from '../lib/config';
import type { Mess } from '../lib/types';
import { formatDistance, timeAgo, waitText } from '../lib/format';
import { useNow } from '../lib/hooks';
import { CrowdBadge } from '../components/Crowd';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useAuth } from '../lib/auth';

const QUICK = [
  { label: 'Under ₹70', to: '/messes?maxPrice=70' },
  { label: 'Low crowd now', to: '/messes?crowd=LOW' },
  { label: 'Veg only', to: '/messes?foodType=VEG' },
];

function RightNow() {
  const now = useNow(60_000);
  const q = useQuery({
    queryKey: ['messes', 'home'],
    queryFn: () => api<{ messes: Mess[] }>(`/messes?lat=${CAMPUS.lat}&lng=${CAMPUS.lng}&sort=distance`),
    refetchInterval: 60_000,
  });

  return (
    <section aria-labelledby="rn" className="plate overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
        <h2 id="rn" className="text-lg font-bold">Right now near campus</h2>
        <Link to="/messes" className="text-sm font-semibold text-beet hover:underline">See all</Link>
      </div>
      {q.isLoading && (
        <div className="space-y-4 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      )}
      {q.isError && <div className="p-4"><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></div>}
      {q.data && q.data.messes.length === 0 && (
        <div className="p-4"><EmptyState title="No messes listed yet" body="Messes appear here once an owner signs up and an admin verifies them." /></div>
      )}
      {q.data && q.data.messes.length > 0 && (
        <ul className="divide-y divide-dashed divide-line">
          {q.data.messes.slice(0, 4).map((m) => (
            <li key={m.id}>
              <Link to={`/messes/${m.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block text-sm text-muted">
                    {formatDistance(m.distanceMeters)} away{m.crowd?.lastUpdatedAt ? `, updated ${timeAgo(m.crowd.lastUpdatedAt, now)}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <CrowdBadge crowd={m.crowd} />
                  <span className="text-xs text-muted">{waitText(m.crowd)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/messes?q=${encodeURIComponent(q.trim())}` : '/messes');
  };

  return (
    <div className="space-y-16">
      <section className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="pt-2 lg:pt-8">
          <h1 className="max-w-xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            See the queue before you leave your seat.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted">
            Today’s sabji, an honest crowd estimate and the price of a meal, for messes around {CAMPUS.name}.
          </p>
          <form onSubmit={submit} className="mt-6 flex max-w-lg gap-2" role="search">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="field !pl-10" placeholder="Search a dish or mess, like pithla" aria-label="Search dishes or messes" />
            </div>
            <button className="btn-accent">Find lunch</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK.map((c) => <Link key={c.to} to={c.to} className="chip">{c.label}</Link>)}
          </div>
        </div>
        <RightNow />
      </section>

      <section aria-labelledby="how" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 id="how" className="text-3xl font-bold">How we know how busy it is</h2>
          <p className="mt-3 max-w-md text-muted">
            We do not have cameras or sensors. The crowd level is an estimate built from people on the ground, and it fades out when nobody has reported recently.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: 'Student reports', body: 'Students tap Low, Moderate or Busy. Newer reports count more and expire after 45 minutes.' },
            { icon: QrCode, title: 'QR check-ins', body: 'Scanning the mess QR counts only when your phone is also near the mess.' },
            { icon: ChefHat, title: 'Owner updates', body: 'Owners can post the current rush. These count double but also expire.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="plate p-4">
              <Icon className="h-5 w-5 text-beet" aria-hidden />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {user?.role !== 'OWNER' && (
        <section className="rounded-2xl bg-ink px-6 py-8 text-white sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Run a mess near campus?</h2>
          <p className="mt-2 max-w-xl text-white/75">Post today’s sabji each morning, tell students when it is quiet, and get a QR code for your counter.</p>
          <Link to="/register?role=OWNER" className="btn mt-5 bg-white text-ink hover:bg-beet-soft">List your mess</Link>
        </section>
      )}
    </div>
  );
}
