import { useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Field, useToast } from '../../ui';
import { ROLES } from '../../lib';

export function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.newPassword !== form.confirm) return setErr('The new passwords do not match');
    setBusy(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: form });
      toast('Password changed');
      setForm({});
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="stack-sm">
      <Field label="Current password" name="currentPassword" type="password" required form={form} setForm={setForm} />
      <Field label="New password" name="newPassword" type="password" required form={form} setForm={setForm} hint="At least 6 characters" />
      <Field label="Confirm new password" name="confirm" type="password" required form={form} setForm={setForm} />
      {err && <p className="form-error">{err}</p>}
      <button className="btn" disabled={busy}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}

export default function Account() {
  const { user } = useAuth();
  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>{user.name}</h1>
          <p className="sub">
            {ROLES[user.role]}
            {user.designation ? `, ${user.designation}` : ''}. Login {user.mobile}
          </p>
        </div>
      </div>
      <section className="panel narrow-panel">
        <h2>Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
