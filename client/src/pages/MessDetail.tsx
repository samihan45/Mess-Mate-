import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Heart, MapPin, Phone, QrCode } from 'lucide-react';
import { api, assetUrl, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { CrowdEstimate, CrowdLevel, DailyMenu, Dish, Mess, Review } from '../lib/types';
import { CATEGORY_LABEL, CATEGORY_ORDER, CROWD_LABEL, FOOD_TYPE_LABEL, formatDistance, rupees, timeAgo } from '../lib/format';
import { CrowdMeter } from '../components/Crowd';
import { VegMark } from '../components/VegMark';
import { ErrorState, Notice, SampleBadge, Skeleton, Stars } from '../components/ui';

function DishRow({ dish, canRate }: { dish: Dish; canRate: boolean }) {
  const qc = useQueryClient();
  const rate = useMutation({
    mutationFn: (rating: number) => api(`/dishes/${dish.id}/ratings`, { body: { rating } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mess'] }),
  });
  const photo = assetUrl(dish.photoUrl);
  return (
    <li className="flex gap-3 py-3">
      {photo ? (
        <img src={photo} alt={dish.name} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-paper text-2xl" aria-hidden>🍛</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMark veg={dish.isVeg} />
          <span className="truncate font-semibold">{dish.name}</span>
          {!dish.isAvailable && <span className="rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-white">Sold out</span>}
          <span className="ml-auto shrink-0 font-semibold">{rupees(dish.price)}</span>
        </div>
        {dish.description && <p className="text-sm text-muted">{dish.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {dish.rating.count > 0 ? (
            <span className="inline-flex items-center gap-1"><Stars value={dish.rating.avg} label="Dish rating" /> {dish.rating.avg} from {dish.rating.count}</span>
          ) : (
            <span>Not rated yet</span>
          )}
          {canRate && (
            <span className="inline-flex items-center gap-1.5">
              Your rating <Stars value={dish.myRating} onChange={(v) => rate.mutate(v)} label="Your rating" />
            </span>
          )}
        </div>
        {rate.isError && <p className="mt-1 text-xs text-crowd-high">{errorMessage(rate.error)}</p>}
      </div>
    </li>
  );
}

function CrowdReporter({ messId }: { messId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (level: CrowdLevel) => api<{ crowd: CrowdEstimate }>(`/messes/${messId}/crowd-reports`, { body: { level } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mess'] }),
  });
  if (!user) return <p className="text-sm text-muted"><Link className="font-semibold text-beet underline" to={`/login?next=/messes/${messId}`}>Sign in</Link> to report how busy it is.</p>;
  if (user.role !== 'STUDENT') return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">At the mess? How busy is it right now?</p>
      <div className="flex gap-2">
        {(['LOW', 'MODERATE', 'HIGH'] as CrowdLevel[]).map((l) => (
          <button key={l} className="btn-quiet flex-1" disabled={m.isPending} onClick={() => m.mutate(l)}>{CROWD_LABEL[l].replace(' crowd', '')}</button>
        ))}
      </div>
      {m.isSuccess && <div className="mt-2"><Notice tone="success">Thanks. Your report is now part of the estimate.</Notice></div>}
      {m.isError && <div className="mt-2"><Notice tone="error">{errorMessage(m.error)}</Notice></div>}
    </div>
  );
}

function ReviewForm({ messId }: { messId: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hygiene, setHygiene] = useState(0);
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/messes/${messId}/reviews`, { body: { rating, hygieneRating: hygiene, valueRating: value, comment: comment || null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mess'] }),
  });
  const ready = rating && hygiene && value;
  const submit = (e: FormEvent) => { e.preventDefault(); if (ready) m.mutate(); };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-paper p-4">
      <h3 className="font-bold">Rate this mess</h3>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div>Food <div><Stars value={rating} onChange={setRating} label="Food rating" /></div></div>
        <div>Hygiene <div><Stars value={hygiene} onChange={setHygiene} label="Hygiene rating" /></div></div>
        <div>Value for money <div><Stars value={value} onChange={setValue} label="Value rating" /></div></div>
      </div>
      <textarea className="field min-h-[72px]" maxLength={600} placeholder="What should other students know? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={!ready || m.isPending}>Post review</button>
        {!ready && <span className="text-xs text-muted">Rate food, hygiene and value to post.</span>}
      </div>
      {m.isSuccess && <Notice tone="success">Review saved. Posting again updates it.</Notice>}
      {m.isError && <Notice tone="error">{errorMessage(m.error)}</Notice>}
    </form>
  );
}

export default function MessDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['mess', id],
    queryFn: () => api<{ mess: Mess; menu: DailyMenu }>(`/messes/${id}`),
    refetchInterval: 60_000,
  });
  const reviews = useQuery({
    queryKey: ['mess', id, 'reviews'],
    queryFn: () => api<{ reviews: Review[] }>(`/messes/${id}/reviews`),
  });
  const fav = useMutation({
    mutationFn: (on: boolean) => api(`/favourites/${id}`, { method: on ? 'PUT' : 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mess', id] }); qc.invalidateQueries({ queryKey: ['messes'] }); },
  });

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <ErrorState message={(q.error as { status?: number }).status === 404 ? 'We could not find that mess. It may have been removed.' : errorMessage(q.error)} onRetry={() => q.refetch()} />;

  const { mess, menu } = q.data!;
  const photo = assetUrl(mess.photoUrl);
  const dist = formatDistance(mess.distanceMeters);
  const grouped = CATEGORY_ORDER.map((c) => ({ c, items: menu.items.filter((i) => i.category === c) })).filter((g) => g.items.length);
  const mine = reviews.data?.reviews.find((r) => r.userId === user?.id);

  return (
    <div className="space-y-8">
      {mess.status !== 'VERIFIED' && <Notice tone="info">This mess is {mess.status.toLowerCase()}. Only you and admins can see this page.</Notice>}

      <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {photo && <img src={photo} alt="" className="mb-4 h-48 w-full rounded-2xl object-cover sm:h-64" />}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold sm:text-4xl">{mess.name}</h1>
            {mess.isSample && <SampleBadge />}
          </div>
          {mess.description && <p className="mt-2 max-w-xl text-muted">{mess.description}</p>}
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted" aria-hidden /><dt className="sr-only">Address</dt><dd>{mess.address}{dist && <span className="text-muted"> ({dist})</span>}</dd></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" aria-hidden /><dt className="sr-only">Hours</dt><dd>{mess.opensAt} to {mess.closesAt}{!mess.isOpen && <span className="ml-1 font-semibold text-crowd-high">Closed for now</span>}</dd></div>
            {mess.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" aria-hidden /><dt className="sr-only">Phone</dt><dd><a href={`tel:${mess.phone}`} className="underline">{mess.phone}</a></dd></div>}
            <div><dt className="sr-only">Price</dt><dd><span className="font-semibold">{rupees(mess.avgMealPrice)} a meal</span>, {FOOD_TYPE_LABEL[mess.foodType].toLowerCase()}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {mess.rating.count > 0 ? (
              <>
                <span className="inline-flex items-center gap-2">Food <Stars value={mess.rating.avg} label="Food" /> {mess.rating.avg}</span>
                <span className="inline-flex items-center gap-2">Hygiene <Stars value={mess.rating.hygiene} label="Hygiene" /> {mess.rating.hygiene}</span>
                <span className="inline-flex items-center gap-2">Value <Stars value={mess.rating.value} label="Value" /> {mess.rating.value}</span>
                <span className="text-muted">{mess.rating.count} review{mess.rating.count > 1 ? 's' : ''}</span>
              </>
            ) : <span className="text-muted">No reviews yet</span>}
          </div>
          {user?.role === 'STUDENT' && (
            <button className="btn-quiet mt-4" disabled={fav.isPending} onClick={() => fav.mutate(!mess.isFavourite)} aria-pressed={mess.isFavourite}>
              <Heart className={`h-4 w-4 ${mess.isFavourite ? 'fill-beet text-beet' : ''}`} aria-hidden /> {mess.isFavourite ? 'Saved' : 'Save this mess'}
            </button>
          )}
        </div>

        <aside className="plate space-y-5 p-5" aria-label="Crowd estimate">
          <CrowdMeter crowd={mess.crowd} />
          <hr className="border-dashed border-line" />
          <CrowdReporter messId={mess.id} />
          <p className="flex items-start gap-2 text-xs text-muted">
            <QrCode className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            At the counter, scan the mess’s QR code with your phone camera to check in. It counts once you are signed in and near the mess.
          </p>
        </aside>
      </header>

      <section aria-labelledby="menu">
        <h2 id="menu" className="text-2xl font-bold">Today’s menu</h2>
        {menu.note && <p className="mt-1 text-sm text-muted">{menu.note}</p>}
        {grouped.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-sm text-muted">This mess has not posted today’s menu yet. Check back closer to lunch.</p>
        ) : (
          <div className="mt-3 grid gap-x-8 md:grid-cols-2">
            {grouped.map(({ c, items }) => (
              <div key={c} className="plate mb-4 p-4">
                <h3 className="text-lg font-bold">{CATEGORY_LABEL[c]}</h3>
                <ul className="divide-y divide-dashed divide-line">
                  {items.map((d) => <DishRow key={d.id} dish={d} canRate={user?.role === 'STUDENT'} />)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reviews" className="max-w-3xl space-y-4">
        <h2 id="reviews" className="text-2xl font-bold">Reviews</h2>
        {user?.role === 'STUDENT' ? <ReviewForm key={mine?.id ?? 'new'} messId={mess.id} /> : !user && <p className="text-sm text-muted"><Link className="font-semibold text-beet underline" to={`/login?next=/messes/${mess.id}`}>Sign in</Link> as a student to review.</p>}
        {reviews.isLoading && <Skeleton className="h-20" />}
        {reviews.data?.reviews.length === 0 && <p className="text-sm text-muted">No reviews yet. Be the first to share how the food and hygiene are.</p>}
        <ul className="space-y-3">
          {reviews.data?.reviews.map((r) => (
            <li key={r.id} className="plate p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{r.author}</span>
                <Stars value={r.rating} label="Food" />
                <span className="text-xs text-muted">Hygiene {r.hygieneRating}/5, value {r.valueRating}/5, {timeAgo(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
