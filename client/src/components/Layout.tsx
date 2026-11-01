import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLiveUpdates } from '../lib/live';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="#F5F6F2" strokeWidth="1.8" />
        <path d="M16 6.5v9.5l8.2 4.7M16 16l-8.2 4.7" stroke="#F5F6F2" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="21" cy="12" r="1.6" fill="#E27BA3" />
      </svg>
      MessMate
    </span>
  );
}

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-line/60'}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const live = useLiveUpdates();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" aria-label="MessMate home" className="text-ink">
            <Logo />
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1" aria-label="Main">
            <NavLink to="/messes" className={link}>Find a mess</NavLink>
            {user?.role === 'STUDENT' && <NavLink to="/favourites" className={link}>Saved</NavLink>}
            {user?.role === 'OWNER' && <NavLink to="/owner" className={link}>My mess</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted sm:ml-0" title={live ? 'Crowd and menu changes appear without refreshing' : 'Reconnecting. Pages refresh every minute meanwhile.'}>
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-crowd-low' : 'bg-muted/40'}`} aria-hidden />
            {live ? 'Live' : 'Offline'}
          </span>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted sm:inline">{user.name.split(' ')[0]}</span>
              <button className="btn-quiet !py-1.5" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-quiet !py-1.5">Sign in</Link>
              <Link to="/register" className="btn-primary !py-1.5">Join</Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        MessMate shows estimates from student reports, QR check-ins and owner updates. Map data © OpenStreetMap contributors.
      </footer>
    </div>
  );
}
