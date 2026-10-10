import { useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, FormModal, Field, useToast, Empty } from '../../ui';
import { ROLES, date } from '../../lib';

const CAN_CREATE = {
  hq: ['hq', 'zbc', 'mauze', 'counsellor', 'beneficiary'],
  zbc: ['zbc', 'mauze', 'counsellor', 'beneficiary'],
  mauze: ['counsellor', 'beneficiary'],
};

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const d = useLoad(() => api(`/users?${new URLSearchParams({ ...(role && { role }), ...(q && { q }) })}`), [role, q]);
  const zones = useLoad(() => (user.role === 'hq' ? api('/org/zones') : Promise.resolve([])), []);
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  const roleOpts = Object.fromEntries((CAN_CREATE[user.role] || []).map((r) => [r, ROLES[r]]));

  const save = async (v) => {
    const body = { ...v, zone: v.zone?._id || v.zone, mauze: v.mauze?._id || v.mauze };
    if (!body.password) delete body.password;
    if (edit._id) await api(`/users/${edit._id}`, { method: 'PUT', body });
    else await api('/users', { method: 'POST', body });
    toast(edit._id ? 'User updated' : 'User added');
    d.reload();
  };

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Team and logins</h1>
          <p className="sub">Every beneficiary needs a named person responsible for follow-up. Add counsellors and mentors here.</p>
        </div>
        <button className="btn" onClick={() => setEdit({ role: user.role === 'mauze' ? 'counsellor' : '', active: true })}>
          Add person
        </button>
      </div>
      <div className="filters bar">
        <label className="grow">
          <span>Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or mobile" />
        </label>
        <label>
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All</option>
            {Object.entries(ROLES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} />
      ) : d.data.length === 0 ? (
        <Empty title="Nobody here yet" />
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Zone / Mauze</th>
                <th>Mobile</th>
                <th>Last login</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.data.map((u) => (
                <tr key={u._id} tabIndex={0} onClick={() => setEdit(u)} onKeyDown={(e) => e.key === 'Enter' && setEdit(u)}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.designation && <small className="block muted">{u.designation}</small>}
                  </td>
                  <td>{ROLES[u.role]}</td>
                  <td>{u.mauze?.name || u.zone?.name || 'All'}</td>
                  <td>{u.mobile}</td>
                  <td>{u.lastLogin ? date(u.lastLogin) : '—'}</td>
                  <td>{u.active ? 'Active' : <span className="muted">Disabled</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <FormModal title={edit._id ? `Edit ${edit.name}` : 'Add person'} initial={{ ...edit, zone: edit.zone?._id || edit.zone, mauze: edit.mauze?._id || edit.mauze }} onClose={() => setEdit(null)} onSubmit={save}>
          {(form, setForm) => {
            const P = { form, setForm };
            const needsMauze = ['mauze', 'counsellor', 'beneficiary'].includes(form.role);
            return (
              <>
                <Field label="Name" name="name" required {...P} />
                <Field label="Mobile (login)" name="mobile" type="tel" required {...P} />
                <Field label="Email" name="email" type="email" {...P} />
                <Field label="ITS number" name="itsNo" {...P} />
                <Field label="Role" name="role" type="select" options={roleOpts} required {...P} />
                <Field label="Designation" name="designation" {...P} placeholder="Counsellor, mentor, committee head…" />
                {form.role === 'zbc' && user.role === 'hq' && <Field label="Zone" name="zone" type="select" required options={Object.fromEntries((zones.data || []).map((z) => [z._id, z.name]))} {...P} />}
                {needsMauze && ['hq', 'zbc'].includes(user.role) && <Field label="Mauze" name="mauze" type="select" required options={Object.fromEntries((mauzes.data || []).map((m) => [m._id, m.name]))} {...P} />}
                <Field label={edit._id ? 'New password (leave blank to keep)' : 'Password'} name="password" required={!edit._id} {...P} hint="At least 6 characters" />
                <Field label="Active" name="active" type="checkbox" {...P} />
              </>
            );
          }}
        </FormModal>
      )}
    </div>
  );
}
