import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, isStaff } from '../auth';
import { useEffect } from 'react';

export function Mark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#0F6B4F" />
      <path d="M136 400V244c0-70 54-128 120-160 66 32 120 90 120 160v156" fill="none" stroke="#F6F8F6" strokeWidth="34" strokeLinejoin="round" />
      <path d="M196 400v-86h120v86" fill="none" stroke="#A9822E" strokeWidth="30" strokeLinejoin="round" />
      <path d="M206 262l36 34 66-70" fill="none" stroke="#F6F8F6" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const home = user ? (isStaff(user) ? '/admin' : '/app') : '/login';
  return (
    <div className="public">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="pub-head">
        <div className="pub-wrap pub-head-row">
          <Link to="/" className="brand">
            <Mark />
            <span>
              <strong>Upliftment Register</strong>
              <small>Tijaarat Raabehah &amp; Qardan Hasana</small>
            </span>
          </Link>
          <button className="menu-btn" aria-expanded={open} aria-controls="pub-nav" onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
          <nav id="pub-nav" className={`pub-nav ${open ? 'open' : ''}`}>
            <NavLink to="/framework">How it works</NavLink>
            <NavLink to="/request-support">Request support</NavLink>
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
        <div className="pub-wrap foot-grid">
          <div>
            <p className="foot-title">Upliftment Register</p>
            <p>A monitoring system for Mauze committees, Zonal Business Councils and HQ departments, so that every deserving family receives the right support and its progress is followed with care.</p>
          </div>
          <div>
            <p className="foot-title">For families</p>
            <Link to="/request-support">Request support</Link>
            <Link to="/grievance">Raise or track a concern</Link>
            <Link to="/login">Family app login</Link>
          </div>
          <div>
            <p className="foot-title">Confidentiality</p>
            <p>Family information is shared only with authorised committee members. Sanction authority and financial controls remain as set by HQ and scheme policy.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
