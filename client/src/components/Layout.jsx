import { useEffect, useState } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loading } from './ui';

/**
 * The navigation sits over the homepage hero and turns solid once the page
 * scrolls, so the first screen stays fully photographic.
 */
export function Nav({ overlay = false }) {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!overlay) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.classList.remove('nav-open'); document.body.style.overflow = ''; };
  }, [open]);

  const over = overlay && !scrolled && !open;

  return (
    <header className={`nav${over ? ' nav-over' : ''}`}>
      <div className="shell-wide nav-inner">
        <Link to="/" className="brand" aria-label="Digital Heroes, home">
          digital<i>.</i>HEROES<s>.</s>
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav id="primary-navigation" className={`nav-links${open ? ' open' : ''}`}>
          <NavLink to="/how-it-works" onClick={() => setOpen(false)}>How it works</NavLink>
          <NavLink to="/charities" onClick={() => setOpen(false)}>Charities</NavLink>
          <NavLink to="/draw" onClick={() => setOpen(false)}>The draw</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>
              {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>Sign in</NavLink>
              <Link className="btn btn-sm" to="/register" onClick={() => setOpen(false)}>Join</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell-wide">
        <div className="footer-cols">
          <div>
            <div className="brand" style={{ marginBottom: '1.5rem' }}>digital<i>.</i>HEROES<s>.</s></div>
            <p className="serif" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.15, maxWidth: '16ch', margin: 0 }}>
              Good game. Greater impact.
            </p>
          </div>

          <div className="footer-links">
            <span className="meta" style={{ marginBottom: '0.3rem' }}>Platform</span>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/draw">The draw</Link>
            <Link to="/charities">Charities</Link>
            <Link to="/about">About</Link>
          </div>

          <div className="footer-links">
            <span className="meta" style={{ marginBottom: '0.3rem' }}>Account</span>
            <Link to="/register">Join</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
        </div>

        <div className="footer-rule row-between">
          <span style={{ fontSize: 'var(--t-micro)', opacity: 0.55 }}>
            © {new Date().getFullYear()} Digital Heroes
          </span>
          <span style={{ fontSize: 'var(--t-micro)', opacity: 0.55 }}>
            Built for the Level 1 PRD selection assignment
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Public pages. The homepage opts into the transparent overlay nav. */
export function PublicLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <Nav overlay={pathname === '/'} />
      <main><Outlet /></main>
      <Footer />
    </>
  );
}

export function RequireAuth({ admin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell" style={{ paddingBlock: '6rem' }}>
        <Loading rows={4} height={90} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const USER_LINKS = [
  ['/dashboard', 'Overview'],
  ['/scores', 'Scores'],
  ['/my-draws', 'Draws'],
  ['/winnings', 'Winnings'],
  ['/my-charity', 'Charity'],
  ['/subscription', 'Membership'],
  ['/profile', 'Settings'],
];

const ADMIN_LINKS = [
  ['/admin', 'Overview'],
  ['/admin/users', 'Users'],
  ['/admin/subscriptions', 'Subscriptions'],
  ['/admin/draws', 'Draws'],
  ['/admin/charities', 'Charities'],
  ['/admin/winners', 'Winners'],
  ['/admin/analytics', 'Reports'],
];

function SideNav({ links, title }) {
  return (
    <nav className="side-nav" aria-label={title}>
      <span className="side-title">{title}</span>
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === '/admin' || to === '/dashboard'}>{label}</NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  return (
    <>
      <Nav />
      <div className="shell app-layout">
        <SideNav links={USER_LINKS} title={user?.name?.split(' ')[0] || 'Account'} />
        <main style={{ minWidth: 0 }}><Outlet /></main>
      </div>
      <Footer />
    </>
  );
}

export function AdminLayout() {
  return (
    <>
      <Nav />
      <div className="shell-wide app-layout">
        <SideNav links={ADMIN_LINKS} title="Operations" />
        <main style={{ minWidth: 0 }}><Outlet /></main>
      </div>
    </>
  );
}
