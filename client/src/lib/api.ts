import { API_BASE } from './config';

const TOKEN_KEY = 'messmate.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage unavailable; the session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];
  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Opts = { method?: string; body?: unknown; form?: FormData };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body });
  } catch {
    throw new ApiError(0, 'Cannot reach MessMate. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong', data.details);
  return data as T;
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError
    ? e.details?.length
      ? e.details.map((d) => d.message).join('. ')
      : e.message
    : 'Something went wrong';

export const assetUrl = (p: string | null) => (p ? (p.startsWith('http') ? p : `${API_BASE}${p}`) : null);

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const r = await api<{ url: string }>('/owner/uploads', { form });
  return r.url;
}
