import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, isStaff } from '../../auth';
import { Field } from '../../ui';

export default function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (user) return <Navigate to={isStaff(user) ? '/admin' : '/app'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const u = await login(form.login, form.password);
      const next = params.get('next');
      const staff = isStaff(u);
      nav(next && next.startsWith(staff ? '/admin' : '/app') ? next : staff ? '/admin' : '/app', { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pub-wrap page login-page">
      <form className="card form-card login-card" onSubmit={submit}>
        <h1>Log in</h1>
        <p className="fine">Committee members, counsellors and families with an app login use the same page.</p>
        <Field label="Mobile number or email" name="login" form={form} setForm={setForm} required />
        <Field label="Password" name="password" type="password" form={form} setForm={setForm} required />
        {err && <p className="form-error">{err}</p>}
        <button className="btn lg block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="fine">Families receive their login from their Mauze counsellor. Forgotten your password? Ask your counsellor to reset it.</p>
      </form>
    </div>
  );
}
