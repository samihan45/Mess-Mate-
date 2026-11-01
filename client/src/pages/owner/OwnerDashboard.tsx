import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { MessStatus, OwnerMess } from '../../lib/types';
import MessForm, { emptyMess, toPayload } from '../../components/MessForm';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';

const STATUS: Record<MessStatus, { label: string; cls: string; help: string }> = {
  PENDING: { label: 'Waiting for verification', cls: 'bg-crowd-mid/15 text-[#7a5700]', help: 'An admin will review your details. You can already build your menu.' },
  VERIFIED: { label: 'Live', cls: 'bg-crowd-low/10 text-[#13693a]', help: 'Students can find you.' },
  REJECTED: { label: 'Not approved', cls: 'bg-crowd-high/10 text-[#a52a21]', help: 'Check the details and contact the admin.' },
  SUSPENDED: { label: 'Suspended', cls: 'bg-crowd-high/10 text-[#a52a21]', help: 'Hidden from students. Contact the admin.' },
};

export default function OwnerDashboard() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ['owner', 'messes'], queryFn: () => api<{ messes: OwnerMess[] }>('/owner/messes') });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your messes</h1>
        {!adding && <button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add a mess</button>}
      </div>

      {adding && (
        <div className="plate p-5">
          <h2 className="mb-4 text-xl font-bold">Add your mess</h2>
          <MessForm
            initial={emptyMess()}
            submitLabel="Submit for verification"
            onSubmit={async (v) => {
              await api('/owner/messes', { body: toPayload(v) });
              await qc.invalidateQueries({ queryKey: ['owner', 'messes'] });
              setAdding(false);
            }}
          />
        </div>
      )}

      {q.isLoading && <Skeleton className="h-24" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data?.messes.length === 0 && !adding && <EmptyState title="You have not added a mess yet" body="Add your address and prices. An admin verifies it, then students can find you." />}
      <ul className="grid gap-4 sm:grid-cols-2">
        {q.data?.messes.map((m) => (
          <li key={m.id}>
            <Link to={`/owner/${m.id}`} className="plate block p-4 hover:shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{m.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{m.address}</p>
              <p className="mt-2 text-sm">{STATUS[m.status].help}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
