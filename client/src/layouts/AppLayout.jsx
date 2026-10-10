import { createContext, useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLoad, Loading, ErrorBox } from '../ui';
import { Mark } from './PublicLayout';

const CasesCtx = createContext(null);
export const useMyCases = () => useContext(CasesCtx);

export default function AppLayout() {
  const { user } = useAuth();
  const cases = useLoad(() => api('/portal/cases'), []);
  return (
    <div className="fam">
      <header className="fam-head">
        <Mark size={30} />
        <div>
          <strong>Salaam, {user.name.split(' ')[0]}</strong>
          <small>{user.mauze?.name}</small>
        </div>
      </header>
      <main className="fam-main">
        {cases.loading ? (
          <Loading />
        ) : cases.error ? (
          <ErrorBox error={cases.error} onRetry={cases.reload} />
        ) : (
          <CasesCtx.Provider value={cases}>
            <Outlet />
          </CasesCtx.Provider>
        )}
      </main>
      <nav className="fam-nav" aria-label="App">
        <NavLink to="/app" end>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10.5C5 7 8 4.3 12 3c4 1.3 7 4 7 7.5V20H5z" /></svg>
          My plan
        </NavLink>
        <NavLink to="/app/progress">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 16l4-5 3 3 5-7" /></svg>
          Progress
        </NavLink>
        <NavLink to="/app/repayments">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 10h16M8 15h3" /></svg>
          Repayments
        </NavLink>
        <NavLink to="/app/account">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
          Account
        </NavLink>
      </nav>
    </div>
  );
}
