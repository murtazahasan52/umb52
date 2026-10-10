import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { PasswordForm } from '../admin/Account';

export default function AppAccount() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="fam-stack">
      <article className="fam-card">
        <header>
          <h2>{user.name}</h2>
          <p className="small">Login {user.mobile}</p>
        </header>
        <PasswordForm />
      </article>
      <article className="fam-card">
        <header>
          <h2>Need help?</h2>
        </header>
        <p className="small">For anything about your plan, call your counsellor from the My plan page. If something has not been handled well, you can raise a concern confidentially.</p>
        <Link className="btn ghost block" to="/grievance">
          Raise a concern
        </Link>
      </article>
      <button
        className="btn ghost block"
        onClick={() => {
          logout();
          nav('/login');
        }}
      >
        Log out
      </button>
    </div>
  );
}
