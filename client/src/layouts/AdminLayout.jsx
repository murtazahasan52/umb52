import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, canManage } from '../auth';
import { ROLES } from '../lib';
import { Mark } from './PublicLayout';
import GlobalSearch from '../components/GlobalSearch';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/register', label: 'Register a case' },
  { to: '/admin/forms', label: 'Family forms' },
  { to: '/admin/warnings', label: 'Early warnings' },
  { to: '/admin/cases', label: 'Beneficiary cases' },
  { to: '/admin/households', label: 'Household survey' },
  { to: '/admin/fostership', label: 'Fostership' },
  { to: '/admin/directory', label: 'Directory' },
  { to: '/admin/inbox', label: 'Requests & concerns' },
  { to: '/admin/mauzes', label: 'Mauzes & zones' },
  { to: '/admin/users', label: 'Team & logins', manage: true },
  { to: '/admin/import', label: 'Import from Excel', hq: true },
  { to: '/admin/reports', label: 'Reports & exports', manage: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);
  const scope = user.role === 'hq' ? 'All zones' : user.role === 'zbc' ? user.zone?.name : user.mauze?.name;
  return (
    <div className="admin">
      <a className="skip" href="#admin-main">
        Skip to content
      </a>
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="side-brand">
          <Mark size={28} />
          <span>Upliftment Register</span>
        </div>
        <div className="side-scope">
          <strong>{scope || '—'}</strong>
          <small>{ROLES[user.role]}</small>
        </div>
        <nav className="side-nav">
          {NAV.filter((n) => (!n.manage || canManage(user)) && (!n.hq || user.role === 'hq')).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <NavLink to="/admin/account">{user.name}</NavLink>
          <button
            className="link-btn"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      {open && <div className="side-shade" onClick={() => setOpen(false)} />}
      <div className="admin-body">
        <header className="admin-top">
          <button className="menu-btn dark" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Menu
          </button>
          <GlobalSearch />
          <Link to="/admin/register" className="btn sm top-register">
            Register a case
          </Link>
        </header>
        <main id="admin-main" className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
