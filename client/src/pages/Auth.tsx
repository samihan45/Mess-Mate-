import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { Field, Notice, TextInput } from '../components/ui';
import type { User } from '../lib/types';

const home = (u: User, next: string | null) => next && next.startsWith('/') ? next : u.role === 'OWNER' ? '/owner' : u.role === 'ADMIN' ? '/admin' : '/messes';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      navigate(home(u, params.get('next')), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="plate mt-5 space-y-4 p-5">
        <Field label="Email"><TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><TextInput type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
      <p className="mt-4 text-sm text-muted">New here? <Link to="/register" className="font-semibold text-beet underline">Create an account</Link></p>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<'STUDENT' | 'OWNER'>(params.get('role') === 'OWNER' ? 'OWNER' : 'STUDENT');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await register({ ...form, role });
      navigate(home(u, params.get('next')), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <div className="mt-5 inline-flex rounded-xl border border-line bg-white p-1" role="group" aria-label="Account type">
        {([['STUDENT', 'I am a student'], ['OWNER', 'I run a mess']] as const).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={role === v} onClick={() => setRole(v)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${role === v ? 'bg-ink text-white' : ''}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} className="plate mt-4 space-y-4 p-5">
        <Field label="Your name"><TextInput required minLength={2} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><TextInput type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password" hint="At least 8 characters with a letter and a number.">
          <TextInput type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account' : 'Create account'}</button>
        {role === 'OWNER' && <p className="text-xs text-muted">After you add your mess, an admin verifies it before students can see it.</p>}
      </form>
      <p className="mt-4 text-sm text-muted">Already have an account? <Link to="/login" className="font-semibold text-beet underline">Sign in</Link></p>
    </div>
  );
}
