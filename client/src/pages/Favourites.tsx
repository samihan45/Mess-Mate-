import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import type { Mess } from '../lib/types';
import { MessCard } from '../components/MessCard';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui';

export default function Favourites() {
  const q = useQuery({ queryKey: ['messes', 'favourites'], queryFn: () => api<{ messes: Mess[] }>('/favourites'), refetchInterval: 60_000 });
  return (
    <div>
      <h1 className="text-3xl font-bold">Saved messes</h1>
      <div className="mt-5">
        {q.isLoading && <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <CardSkeleton key={i} />)}</div>}
        {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
        {q.data?.messes.length === 0 && <EmptyState title="Nothing saved yet" body="Tap Save on a mess to keep it here and check its crowd quickly." action={<Link to="/messes" className="btn-primary">Find a mess</Link>} />}
        <div className="grid gap-4 sm:grid-cols-2">{q.data?.messes.map((m) => <MessCard key={m.id} mess={m} />)}</div>
      </div>
    </div>
  );
}
