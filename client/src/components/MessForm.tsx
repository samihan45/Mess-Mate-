import { useState, type FormEvent } from 'react';
import { LocateFixed } from 'lucide-react';
import { assetUrl, errorMessage, uploadImage } from '../lib/api';
import { CAMPUS } from '../lib/config';
import type { FoodType } from '../lib/types';
import { Field, Notice, Switch, TextInput } from './ui';

export interface MessFormValues {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  foodType: FoodType;
  avgMealPrice: string;
  seatingCapacity: string;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
  photoUrl: string | null;
}

export const emptyMess = (): MessFormValues => ({
  name: '', description: '', address: '', latitude: String(CAMPUS.lat), longitude: String(CAMPUS.lng), phone: '',
  foodType: 'VEG', avgMealPrice: '80', seatingCapacity: '30', opensAt: '11:00', closesAt: '21:00', isOpen: true, photoUrl: null,
});

export function toPayload(v: MessFormValues) {
  return {
    name: v.name, description: v.description || null, address: v.address,
    latitude: Number(v.latitude), longitude: Number(v.longitude), phone: v.phone || null,
    foodType: v.foodType, avgMealPrice: Number(v.avgMealPrice), seatingCapacity: Number(v.seatingCapacity),
    opensAt: v.opensAt, closesAt: v.closesAt, isOpen: v.isOpen, photoUrl: v.photoUrl,
  };
}

export default function MessForm({ initial, submitLabel, onSubmit, showOpenSwitch }: {
  initial: MessFormValues; submitLabel: string; onSubmit: (v: MessFormValues) => Promise<void>; showOpenSwitch?: boolean;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const set = <K extends keyof MessFormValues>(k: K, val: MessFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await onSubmit(v);
      setMsg({ tone: 'success', text: 'Saved.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const here = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setV((x) => ({ ...x, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })),
      () => setMsg({ tone: 'error', text: 'Could not read your location. Enter the coordinates by hand.' }),
    );

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try { set('photoUrl', await uploadImage(file)); } catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mess name"><TextInput required minLength={2} maxLength={80} value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Phone (optional)"><TextInput inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      </div>
      <Field label="Address"><TextInput required minLength={5} maxLength={200} value={v.address} onChange={(e) => set('address', e.target.value)} /></Field>
      <Field label="About (optional)"><textarea className="field min-h-[72px]" maxLength={500} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Latitude"><TextInput required inputMode="decimal" value={v.latitude} onChange={(e) => set('latitude', e.target.value)} /></Field>
        <Field label="Longitude"><TextInput required inputMode="decimal" value={v.longitude} onChange={(e) => set('longitude', e.target.value)} /></Field>
        <button type="button" className="btn-quiet" onClick={here}><LocateFixed className="h-4 w-4" aria-hidden /> Use my location</button>
      </div>
      <p className="-mt-2 text-xs text-muted">Stand at your counter when you tap this. QR check-ins are verified against these coordinates.</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Food">
          <select className="field" value={v.foodType} onChange={(e) => set('foodType', e.target.value as FoodType)}>
            <option value="VEG">Veg</option><option value="NON_VEG">Non-veg</option><option value="BOTH">Both</option>
          </select>
        </Field>
        <Field label="Average meal (₹)"><TextInput type="number" min={0} max={5000} required value={v.avgMealPrice} onChange={(e) => set('avgMealPrice', e.target.value)} /></Field>
        <Field label="Seats"><TextInput type="number" min={1} max={1000} required value={v.seatingCapacity} onChange={(e) => set('seatingCapacity', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opens"><TextInput type="time" required value={v.opensAt} onChange={(e) => set('opensAt', e.target.value)} /></Field>
          <Field label="Closes"><TextInput type="time" required value={v.closesAt} onChange={(e) => set('closesAt', e.target.value)} /></Field>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Field label="Photo (JPG, PNG or WebP, up to 3 MB)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} className="text-sm" /></Field>
        {v.photoUrl && <img src={assetUrl(v.photoUrl)!} alt="Mess preview" className="h-16 w-16 rounded-xl object-cover" />}
      </div>
      {showOpenSwitch && <Switch checked={v.isOpen} onChange={(x) => set('isOpen', x)} label="Open for service right now" />}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Saving' : submitLabel}</button>
    </form>
  );
}
