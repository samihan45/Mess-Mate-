import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Trash2 } from 'lucide-react';
import { api, assetUrl, errorMessage, uploadImage } from '../../lib/api';
import type { CrowdEstimate, CrowdLevel, DailyMenu, DishCategory, MenuItem, OwnerMess } from '../../lib/types';
import { CATEGORY_LABEL, CATEGORY_ORDER, CROWD_LABEL, rupees } from '../../lib/format';
import { CrowdMeter } from '../../components/Crowd';
import MessForm, { toPayload, type MessFormValues } from '../../components/MessForm';
import { VegMark } from '../../components/VegMark';
import { ErrorState, Field, Notice, Skeleton, Switch, Tabs, TextInput } from '../../components/ui';

interface Detail {
  mess: OwnerMess;
  menuItems: MenuItem[];
  crowd: CrowdEstimate;
  today: DailyMenu;
  verificationLog: { id: string; action: string; note: string | null; createdAt: string }[];
}

type Tab = 'today' | 'dishes' | 'profile' | 'qr';
type Slot = 'off' | 'serving' | 'soldout';

function TodayTab({ id, d, verified }: { id: string; d: Detail; verified: boolean }) {
  const qc = useQueryClient();
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [note, setNote] = useState(d.today.note ?? '');

  useEffect(() => {
    const s: Record<string, Slot> = {};
    for (const i of d.today.items) s[i.id] = i.isAvailable ? 'serving' : 'soldout';
    setSlots(s);
    setNote(d.today.note ?? '');
  }, [d.today]);

  const crowd = useMutation({
    mutationFn: (level: CrowdLevel) => api(`/owner/messes/${id}/crowd`, { body: { level } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', id] }),
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/owner/messes/${id}/daily-menu`, {
        method: 'PUT',
        body: { note: note || null, items: Object.entries(slots).filter(([, s]) => s !== 'off').map(([menuItemId, s]) => ({ menuItemId, isAvailable: s === 'serving' })) },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', id] }),
  });

  const active = d.menuItems.filter((i) => i.isActive);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="plate p-5">
        <h2 className="text-xl font-bold">Today’s menu</h2>
        <p className="text-sm text-muted">Pick what you are serving. Mark a dish sold out when it runs out.</p>
        {active.length === 0 ? (
          <p className="mt-4 text-sm">Add dishes in the Dishes tab first.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {CATEGORY_ORDER.map((c) => {
              const items = active.filter((i) => i.category === c);
              if (!items.length) return null;
              return (
                <div key={c}>
                  <h3 className="mb-1 font-bold">{CATEGORY_LABEL[c]}</h3>
                  <ul className="divide-y divide-dashed divide-line">
                    {items.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 py-2">
                        <VegMark veg={i.isVeg} />
                        <span className="flex-1">{i.name} <span className="text-sm text-muted">{rupees(i.price)}</span></span>
                        <select aria-label={`Status of ${i.name}`} className="field !w-auto !py-1.5" value={slots[i.id] ?? 'off'} onChange={(e) => setSlots({ ...slots, [i.id]: e.target.value as Slot })}>
                          <option value="off">Not today</option>
                          <option value="serving">Serving</option>
                          <option value="soldout">Sold out</option>
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <Field label="Note for students (optional)"><TextInput maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: Thali ends at 3 pm" /></Field>
            <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>Publish today’s menu</button>
            {save.isSuccess && <Notice tone="success">Published. Students see it now.</Notice>}
            {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
          </div>
        )}
      </section>

      <aside className="plate h-fit space-y-4 p-5">
        <h2 className="text-xl font-bold">Crowd right now</h2>
        <CrowdMeter crowd={d.crowd} />
        {verified ? (
          <div>
            <p className="mb-2 text-sm font-semibold">Post the current rush</p>
            <div className="flex gap-2">
              {(['LOW', 'MODERATE', 'HIGH'] as CrowdLevel[]).map((l) => (
                <button key={l} className="btn-quiet flex-1" disabled={crowd.isPending} onClick={() => crowd.mutate(l)}>{CROWD_LABEL[l].replace(' crowd', '')}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Your update counts double and expires after 90 minutes.</p>
            {crowd.isError && <div className="mt-2"><Notice tone="error">{errorMessage(crowd.error)}</Notice></div>}
          </div>
        ) : <Notice>Crowd updates open once an admin verifies your mess.</Notice>}
      </aside>
    </div>
  );
}

function DishesTab({ id, items }: { id: string; items: MenuItem[] }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['owner', id] });
  const [f, setF] = useState({ name: '', category: 'SABJI' as DishCategory, price: '', isVeg: true, photoUrl: null as string | null });
  const add = useMutation({
    mutationFn: () => api(`/owner/messes/${id}/menu-items`, { body: { ...f, price: Number(f.price) } }),
    onSuccess: () => { setF({ ...f, name: '', price: '', photoUrl: null }); refresh(); },
  });
  const patch = useMutation({ mutationFn: (v: { id: string; data: Partial<MenuItem> }) => api(`/owner/menu-items/${v.id}`, { method: 'PATCH', body: v.data }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (itemId: string) => api(`/owner/menu-items/${itemId}`, { method: 'DELETE' }), onSuccess: refresh });
  const [upErr, setUpErr] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <form className="plate grid gap-3 p-5 sm:grid-cols-[1.4fr_1fr_100px_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <Field label="Dish name"><TextInput required minLength={2} maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Category">
          <select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as DishCategory })}>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
        <Field label="Price (₹)"><TextInput required type="number" min={0} max={5000} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
        <button className="btn-primary" disabled={add.isPending}>Add dish</button>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
          <Switch checked={f.isVeg} onChange={(v) => setF({ ...f, isVeg: v })} label="Vegetarian" />
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Dish photo" className="text-sm" onChange={async (e) => { setUpErr(null); const file = e.target.files?.[0]; if (file) try { setF({ ...f, photoUrl: await uploadImage(file) }); } catch (er) { setUpErr(errorMessage(er)); } }} />
          {f.photoUrl && <img src={assetUrl(f.photoUrl)!} alt="Dish preview" className="h-10 w-10 rounded-lg object-cover" />}
        </div>
        {add.isError && <div className="sm:col-span-4"><Notice tone="error">{errorMessage(add.error)}</Notice></div>}
        {upErr && <div className="sm:col-span-4"><Notice tone="error">{upErr}</Notice></div>}
      </form>

      {items.length === 0 && <p className="text-sm text-muted">No dishes yet. Add the sabji, dal and extras you serve regularly. You choose which ones are on today’s menu in the Today tab.</p>}
      <ul className="plate divide-y divide-dashed divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 p-3">
            {i.photoUrl ? <img src={assetUrl(i.photoUrl)!} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <VegMark veg={i.isVeg} />}
            <span className="min-w-[8rem] flex-1 font-semibold">{i.name} <span className="text-xs font-normal text-muted">{CATEGORY_LABEL[i.category]}</span></span>
            <label className="flex items-center gap-1 text-sm">₹
              <input aria-label={`Price of ${i.name}`} type="number" min={0} className="field !w-20 !py-1.5" defaultValue={i.price} onBlur={(e) => Number(e.target.value) !== i.price && patch.mutate({ id: i.id, data: { price: Number(e.target.value) } })} />
            </label>
            <Switch checked={i.isActive} onChange={(v) => patch.mutate({ id: i.id, data: { isActive: v } })} label="Offered" />
            <button className="btn-danger !px-2.5" aria-label={`Delete ${i.name}`} onClick={() => confirm(`Delete ${i.name}? Its ratings are deleted too.`) && del.mutate(i.id)}><Trash2 className="h-4 w-4" aria-hidden /></button>
          </li>
        ))}
      </ul>
      {(patch.isError || del.isError) && <Notice tone="error">{errorMessage(patch.error ?? del.error)}</Notice>}
    </div>
  );
}

function QrTab({ id, url }: { id: string; url: string }) {
  const qc = useQueryClient();
  const rotate = useMutation({ mutationFn: () => api(`/owner/messes/${id}/rotate-qr`, { method: 'POST' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', id] }) });
  return (
    <div className="plate mx-auto max-w-md space-y-4 p-6 text-center">
      <h2 className="text-xl font-bold">Counter QR code</h2>
      <div className="mx-auto w-fit rounded-xl border border-line bg-white p-4"><QRCodeSVG value={url} size={220} level="M" /></div>
      <p className="text-sm text-muted">Print this and stick it at your counter. Students scan it to check in. A check-in only counts when their phone is also near your mess.</p>
      <p className="break-all text-xs text-muted">{url}</p>
      <div className="no-print flex justify-center gap-2">
        <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print</button>
        <button className="btn-quiet" disabled={rotate.isPending} onClick={() => confirm('Old printed QR codes will stop working. Continue?') && rotate.mutate()}>Make a new code</button>
      </div>
      {rotate.isError && <Notice tone="error">{errorMessage(rotate.error)}</Notice>}
    </div>
  );
}

export default function ManageMess() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('today');
  const q = useQuery({ queryKey: ['owner', id], queryFn: () => api<Detail>(`/owner/messes/${id}`), refetchInterval: 60_000 });

  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const verified = d.mess.status === 'VERIFIED';
  const m = d.mess;
  const initial: MessFormValues = {
    name: m.name, description: m.description ?? '', address: m.address, latitude: String(m.latitude), longitude: String(m.longitude),
    phone: m.phone ?? '', foodType: m.foodType, avgMealPrice: String(m.avgMealPrice), seatingCapacity: String(m.seatingCapacity),
    opensAt: m.opensAt, closesAt: m.closesAt, isOpen: m.isOpen, photoUrl: m.photoUrl,
  };

  return (
    <div className="space-y-5">
      <div>
        <Link to="/owner" className="text-sm font-semibold text-beet hover:underline">All messes</Link>
        <h1 className="mt-1 text-3xl font-bold">{m.name}</h1>
        {!verified && <div className="mt-3"><Notice>{m.status === 'PENDING' ? 'Waiting for admin verification. Students cannot see this mess yet, but you can build your menu.' : `This mess is ${m.status.toLowerCase()}. ${d.verificationLog[0]?.note ?? ''}`}</Notice></div>}
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'today', label: 'Today' }, { id: 'dishes', label: 'Dishes' }, { id: 'profile', label: 'Profile' }, { id: 'qr', label: 'QR code' }]} />
      {tab === 'today' && <TodayTab id={id} d={d} verified={verified} />}
      {tab === 'dishes' && <DishesTab id={id} items={d.menuItems} />}
      {tab === 'profile' && (
        <div className="plate p-5">
          <MessForm initial={initial} submitLabel="Save changes" showOpenSwitch onSubmit={async (v) => { await api(`/owner/messes/${id}`, { method: 'PATCH', body: toPayload(v) }); await qc.invalidateQueries({ queryKey: ['owner', id] }); }} />
        </div>
      )}
      {tab === 'qr' && m.checkInUrl && <QrTab id={id} url={m.checkInUrl} />}
    </div>
  );
}
