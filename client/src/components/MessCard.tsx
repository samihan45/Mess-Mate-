import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Utensils } from 'lucide-react';
import type { Mess } from '../lib/types';
import { FOOD_TYPE_LABEL, formatDistance, rupees, timeAgo, waitText } from '../lib/format';
import { useNow } from '../lib/hooks';
import { CrowdBadge } from './Crowd';
import { SampleBadge } from './ui';

export function MessCard({ mess }: { mess: Mess }) {
  const now = useNow(60_000);
  const dist = formatDistance(mess.distanceMeters);
  const wait = waitText(mess.crowd);
  return (
    <Link to={`/messes/${mess.id}`} className="plate group block transition-shadow hover:shadow-lg">
      <div className="p-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight group-hover:text-beet">{mess.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="font-semibold text-ink">{rupees(mess.avgMealPrice)} a meal</span>
              <span>{FOOD_TYPE_LABEL[mess.foodType]}</span>
              {dist && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {dist}
                </span>
              )}
              {mess.rating.avg != null && (
                <span className="inline-flex items-center gap-1" aria-label={`Rated ${mess.rating.avg} out of 5 by ${mess.rating.count} students`}>
                  <Star className="h-3.5 w-3.5 fill-[#E0A106] text-[#E0A106]" aria-hidden /> {mess.rating.avg}
                  <span className="text-xs">({mess.rating.count})</span>
                </span>
              )}
            </div>
          </div>
          {mess.isFavourite && <Heart className="h-5 w-5 shrink-0 fill-beet text-beet" aria-label="In your favourites" />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CrowdBadge crowd={mess.crowd} />
          {wait && <span className="text-sm text-muted">{wait}</span>}
          {mess.crowd?.lastUpdatedAt && <span className="text-xs text-muted">updated {timeAgo(mess.crowd.lastUpdatedAt, now)}</span>}
          {!mess.isOpen && <span className="rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-white">Closed for now</span>}
        </div>
      </div>
      <div className="notch relative mx-0 border-t border-dashed border-line" />
      <div className="flex items-start gap-2 p-4 pt-3.5 text-sm">
        <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <p className="min-w-0 flex-1">
          {mess.todayHighlights.length ? (
            <>
              <span className="font-semibold">Today: </span>
              {mess.todayHighlights.join(', ')}
              {mess.todayCount > mess.todayHighlights.length && <span className="text-muted"> and {mess.todayCount - mess.todayHighlights.length} more</span>}
            </>
          ) : (
            <span className="text-muted">Today’s menu has not been posted yet.</span>
          )}
        </p>
        {mess.isSample && <SampleBadge />}
      </div>
    </Link>
  );
}
