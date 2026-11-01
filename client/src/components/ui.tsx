import { useId, type ReactNode, type InputHTMLAttributes } from 'react';
import { AlertTriangle, Loader2, Star } from 'lucide-react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="plate p-4" aria-hidden>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-5 h-4 w-full" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-crowd-high/30 bg-crowd-high/5 p-5 sm:flex-row sm:items-center">
      <AlertTriangle className="h-5 w-5 shrink-0 text-crowd-high" aria-hidden />
      <p className="flex-1 text-sm">{message}</p>
      {onRetry && (
        <button className="btn-quiet" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'success' | 'error'; children: ReactNode }) {
  const tones = {
    info: 'border-line bg-white',
    success: 'border-crowd-low/30 bg-crowd-low/5',
    error: 'border-crowd-high/30 bg-crowd-high/5',
  };
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded-md bg-beet-soft px-1.5 py-0.5 text-xs font-semibold text-beet-dark" title="Demo listing created by the seed script. Not a real business.">
      Sample listing
    </span>
  );
}

export function Stars({ value, onChange, label }: { value: number | null; onChange?: (v: number) => void; label: string }) {
  const v = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${label}: ${value ?? 'not rated'}${value ? ' out of 5' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star className={`h-4 w-4 ${n <= Math.round(v) ? 'fill-[#E0A106] text-[#E0A106]' : 'text-line'}`} aria-hidden />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5 hover:scale-110">
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </span>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-crowd-high">{error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ''}`} />;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${value === t.id ? 'border-beet text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
