import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, isStaff } from '../auth';

// Upliftment Department logo (from the department's case-file letterhead)
export function Mark({ size = 30, variant = 'blue' }) {
  return <img src={`/brand/logo-${variant}.png`} alt="" width={Math.round(size * 0.87)} height={size} className="brand-logo" />;
}

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    if (!loc.hash) window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  const home = user ? (isStaff(user) ? '/admin' : '/app') : '/login';
  return (
    <div className="public">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="pub-head">
        <div className="pub-wrap pub-head-row">
          <Link to="/" className="brand">
            <Mark size={44} />
            <span>
              <strong>Upliftment Department</strong>
              <small lang="ar" dir="rtl">
                رفع مستوى معيشة المؤمنين
              </small>
            </span>
          </Link>
          <button className="menu-btn" aria-expanded={open} aria-controls="pub-nav" onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
          <nav id="pub-nav" className={`pub-nav ${open ? 'open' : ''}`}>
            <a href="/#areas">What we help with</a>
            <a href="/#steps">How to get help</a>
            <NavLink to="/grievance">Raise a concern</NavLink>
            <Link to={home} className="btn sm">
              {user ? 'Open my account' : 'Log in'}
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="pub-foot">
        <div className="pub-wrap foot-row">
          <div className="foot-logos">
            <img src="/brand/logo-blue.png" alt="Upliftment Department" height="64" />
          </div>
          <nav className="foot-links" aria-label="Footer">
            <Link to="/request-support">Request support</Link>
            <Link to="/grievance">Raise or track a concern</Link>
            <Link to="/login">Family app and committee login</Link>
          </nav>
          <p className="foot-note">Family details are kept confidential and shared only with authorised members of the Mauze committee and the department.</p>
        </div>
      </footer>
    </div>
  );
}
