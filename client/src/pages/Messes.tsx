import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { List, LocateFixed, Map as MapIcon, Search } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import type { Mess } from '../lib/types';
import { useOrigin } from '../lib/hooks';
import { MessCard } from '../components/MessCard';
import { CardSkeleton, EmptyState, ErrorState, Notice, Spinner } from '../components/ui';

const MessMap = lazy(() => import('../components/MessMap'));

const PRICES = [50, 70, 100, 150];

export default function Messes() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>('list');
  const { origin, error: geoError, locateMe, resetToCampus } = useOrigin();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const get = (k: string) => params.get(k) ?? '';

  const apiQuery = new URLSearchParams({ lat: String(origin.lat), lng: String(origin.lng) });
  for (const k of ['q', 'maxPrice', 'foodType', 'crowd', 'openOnly', 'sort']) if (params.get(k)) apiQuery.set(k, params.get(k)!);
  apiQuery.set('page', params.get('page') ?? '1');
  apiQuery.set('pageSize', '12');

  const q = useQuery({
    queryKey: ['messes', 'list', apiQuery.toString()],
    queryFn: () => api<{ messes: Mess[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }>(`/messes?${apiQuery}`),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });

  const hasFilters = ['q', 'maxPrice', 'foodType', 'crowd', 'openOnly'].some((k) => params.get(k));

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start" aria-label="Filters">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            defaultValue={get('q')}
            key={get('q')}
            onKeyDown={(e) => e.key === 'Enter' && set('q', e.currentTarget.value.trim() || null)}
            onBlur={(e) => e.currentTarget.value.trim() !== get('q') && set('q', e.currentTarget.value.trim() || null)}
            className="field !pl-10"
            placeholder="Dish or mess name"
            aria-label="Search dishes or messes"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Budget per meal</legend>
          <div className="flex flex-wrap gap-2">
            {PRICES.map((p) => (
              <button key={p} className="chip" aria-pressed={get('maxPrice') === String(p)} onClick={() => set('maxPrice', get('maxPrice') === String(p) ? null : String(p))}>
                Up to ₹{p}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Crowd right now</legend>
          <div className="flex flex-wrap gap-2">
            {[['LOW', 'Low'], ['MODERATE', 'Moderate'], ['HIGH', 'Busy']].map(([v, l]) => (
              <button key={v} className="chip" aria-pressed={get('crowd') === v} onClick={() => set('crowd', get('crowd') === v ? null : v)}>{l}</button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Food</legend>
          <div className="flex flex-wrap gap-2">
            <button className="chip" aria-pressed={get('foodType') === 'VEG'} onClick={() => set('foodType', get('foodType') === 'VEG' ? null : 'VEG')}>Veg only</button>
            <button className="chip" aria-pressed={get('openOnly') === 'true'} onClick={() => set('openOnly', get('openOnly') === 'true' ? null : 'true')}>Open now</button>
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Sort by</span>
          <select className="field" value={get('sort') || 'distance'} onChange={(e) => set('sort', e.target.value)}>
            <option value="distance">Nearest</option>
            <option value="crowd">Least crowded</option>
            <option value="price">Cheapest</option>
            <option value="rating">Best rated</option>
          </select>
        </label>

        <div className="text-sm text-muted">
          <p>Distances from {origin.source === 'device' ? 'your location' : 'the campus'}.</p>
          <button className="mt-1 inline-flex items-center gap-1.5 font-semibold text-beet hover:underline" onClick={origin.source === 'device' ? resetToCampus : locateMe}>
            <LocateFixed className="h-4 w-4" aria-hidden /> {origin.source === 'device' ? 'Use the campus instead' : 'Use my location'}
          </button>
          {geoError && <div className="mt-2"><Notice tone="error">{geoError}</Notice></div>}
        </div>
      </aside>

      <section aria-live="polite">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {q.data ? `${q.data.pagination.total} mess${q.data.pagination.total === 1 ? '' : 'es'}` : 'Messes'}
            {get('q') && <span className="font-medium text-muted"> for “{get('q')}”</span>}
          </h1>
          <div className="inline-flex rounded-xl border border-line bg-white p-1" role="group" aria-label="View">
            <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === 'list' ? 'bg-ink text-white' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List className="mr-1 inline h-4 w-4" aria-hidden /> List
            </button>
            <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === 'map' ? 'bg-ink text-white' : ''}`} aria-pressed={view === 'map'} onClick={() => setView('map')}>
              <MapIcon className="mr-1 inline h-4 w-4" aria-hidden /> Map
            </button>
          </div>
        </div>

        {q.isLoading && <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>}
        {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
        {q.data && q.data.messes.length === 0 && (
          <EmptyState
            title={hasFilters ? 'Nothing matches those filters' : 'No messes listed yet'}
            body={hasFilters ? 'Try a higher budget, or clear the crowd filter. Crowd filters only match messes with a recent report.' : 'Messes appear once an owner signs up and an admin verifies them.'}
            action={hasFilters ? <button className="btn-quiet" onClick={() => setParams({}, { replace: true })}>Clear filters</button> : undefined}
          />
        )}
        {q.data && q.data.messes.length > 0 && view === 'list' && (
          <div className="grid gap-4 sm:grid-cols-2">{q.data.messes.map((m) => <MessCard key={m.id} mess={m} />)}</div>
        )}
        {q.data && q.data.messes.length > 0 && view === 'map' && (
          <Suspense fallback={<Spinner label="Loading map" />}>
            <MessMap messes={q.data.messes} center={origin.source === 'device' ? origin : undefined} />
          </Suspense>
        )}

        {q.data && q.data.pagination.totalPages > 1 && view === 'list' && (
          <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Mess list pages">
            <button
              className="btn-quiet"
              disabled={!q.data.pagination.hasPreviousPage}
              onClick={() => set('page', String(q.data!.pagination.page - 1))}
            >
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {q.data.pagination.page} of {q.data.pagination.totalPages}
            </span>
            <button
              className="btn-quiet"
              disabled={!q.data.pagination.hasNextPage}
              onClick={() => set('page', String(q.data!.pagination.page + 1))}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
