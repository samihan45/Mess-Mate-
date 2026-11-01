import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../lib/api';
import type { MessStatus, Role } from '../../lib/types';
import { timeAgo } from '../../lib/format';
import { EmptyState, ErrorState, Notice, SampleBadge, Skeleton, Tabs } from '../../components/ui';

type Tab = 'messes' | 'users' | 'reviews';
type Action = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE';

interface AdminMess {
  id: string; name: string; address: string; status: MessStatus; isSample: boolean; createdAt: string; avgMealPrice: number;
  latitude: number; longitude: number; phone: string | null; owner: { name: string; email: string };
  verificationLogs: { action: string; note: string | null; createdAt: string }[];
}

const ACTIONS: Record<MessStatus, { action: Action; label: string; danger?: boolean }[]> = {
  PENDING: [{ action: 'APPROVE', label: 'Approve' }, { action: 'REJECT', label: 'Reject', danger: true }],
  REJECTED: [{ action: 'APPROVE', label: 'Approve instead' }],
  VERIFIED: [{ action: 'SUSPEND', label: 'Suspend', danger: true }],
  SUSPENDED: [{ action: 'REINSTATE', label: 'Reinstate' }],
};

function Messes() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<MessStatus | ''>('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ['admin', 'messes', status], queryFn: () => api<{ messes: AdminMess[] }>(`/admin/messes${status ? `?status=${status}` : ''}`) });
  const act = useMutation({
    mutationFn: (v: { id: string; action: Action }) => api(`/admin/messes/${v.id}/verify`, { body: { action: v.action, note: notes[v.id] || undefined } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'messes'] }),
  });
  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 text-sm font-semibold">Show
        <select className="field !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value as MessStatus | '')}>
          <option value="PENDING">Waiting for review</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="SUSPENDED">Suspended</option><option value="">All</option>
        </select>
      </label>
      {q.isLoading && <Skeleton className="h-28" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data?.messes.length === 0 && <EmptyState title="Nothing here" body="No messes match this status." />}
      {act.isError && <Notice tone="error">{errorMessage(act.error)}</Notice>}
      <ul className="space-y-3">
        {q.data?.messes.map((m) => (
          <li key={m.id} className="plate p-4">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{m.name}</h3>{m.isSample && <SampleBadge />}<span className="rounded-full bg-line/70 px-2 py-0.5 text-xs font-semibold">{m.status.toLowerCase()}</span></div>
            <p className="text-sm text-muted">{m.address}</p>
            <p className="mt-1 text-sm">Owner: {m.owner.name} ({m.owner.email}){m.phone && `, ${m.phone}`}. Meal about ₹{m.avgMealPrice}. Submitted {timeAgo(m.createdAt)}.</p>
            <p className="text-sm"><a className="font-semibold text-beet underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=18/${m.latitude}/${m.longitude}`}>Check the pin on OpenStreetMap</a></p>
            {m.verificationLogs[0]?.note && <p className="mt-1 text-xs text-muted">Last note: {m.verificationLogs[0].note}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input className="field !w-64" placeholder="Note to owner (optional)" maxLength={300} value={notes[m.id] ?? ''} onChange={(e) => setNotes({ ...notes, [m.id]: e.target.value })} aria-label={`Note for ${m.name}`} />
              {ACTIONS[m.status].map((a) => (
                <button key={a.action} className={a.danger ? 'btn-danger' : 'btn-primary'} disabled={act.isPending} onClick={() => act.mutate({ id: m.id, action: a.action })}>{a.label}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api<{ users: { id: string; name: string; email: string; role: Role; isActive: boolean; createdAt: string }[] }>('/admin/users') });
  const toggle = useMutation({ mutationFn: (v: { id: string; isActive: boolean }) => api(`/admin/users/${v.id}`, { method: 'PATCH', body: { isActive: v.isActive } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }) });
  if (q.isLoading) return <Skeleton className="h-28" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  return (
    <div className="space-y-3">
      {toggle.isError && <Notice tone="error">{errorMessage(toggle.error)}</Notice>}
      <div className="plate overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Joined</th><th className="p-3" /></tr></thead>
          <tbody>
            {q.data!.users.map((u) => (
              <tr key={u.id} className="border-b border-dashed border-line last:border-0">
                <td className="p-3 font-semibold">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.role.toLowerCase()}</td><td className="p-3">{timeAgo(u.createdAt)}</td>
                <td className="p-3 text-right">{u.role !== 'ADMIN' && <button className={u.isActive ? 'btn-danger !py-1.5' : 'btn-quiet !py-1.5'} onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => api<{ reviews: { id: string; rating: number; comment: string | null; status: 'VISIBLE' | 'HIDDEN'; createdAt: string; user: { name: string; email: string }; mess: { name: string } }[] }>('/admin/reviews') });
  const set = useMutation({ mutationFn: (v: { id: string; status: 'VISIBLE' | 'HIDDEN' }) => api(`/admin/reviews/${v.id}`, { method: 'PATCH', body: { status: v.status } }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }) });
  if (q.isLoading) return <Skeleton className="h-28" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data!.reviews.length) return <EmptyState title="No reviews yet" body="Student reviews show up here so you can hide abusive or fake ones." />;
  return (
    <ul className="space-y-3">
      {q.data!.reviews.map((r) => (
        <li key={r.id} className="plate flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.mess.name} <span className="font-normal text-muted">rated {r.rating}/5 by {r.user.name}, {timeAgo(r.createdAt)}</span></p>
            <p className="text-sm">{r.comment || <span className="text-muted">No comment</span>}</p>
          </div>
          <button className={r.status === 'VISIBLE' ? 'btn-danger' : 'btn-quiet'} disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: r.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE' })}>{r.status === 'VISIBLE' ? 'Hide' : 'Show again'}</button>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('messes');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Admin</h1>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'messes', label: 'Verify messes' }, { id: 'users', label: 'Users' }, { id: 'reviews', label: 'Moderate reviews' }]} />
      {tab === 'messes' && <Messes />}
      {tab === 'users' && <Users />}
      {tab === 'reviews' && <Reviews />}
    </div>
  );
}
