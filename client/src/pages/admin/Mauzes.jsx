import { useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, FormModal, Field, useToast, Meter } from '../../ui';

const TYPES = { village: 'Village', small_town: 'Small town', town: 'Town', city: 'City' };

export default function Mauzes() {
  const { user } = useAuth();
  const toast = useToast();
  const d = useLoad(() => api('/org/mauzes'), []);
  const zones = useLoad(() => api('/org/zones'), []);
  const [edit, setEdit] = useState(null);
  const [zoneEdit, setZoneEdit] = useState(null);
  const canEdit = ['hq', 'zbc', 'mauze'].includes(user.role);

  const saveMauze = async (v) => {
    const body = { ...v, zone: v.zone?._id || v.zone, prioritySectors: typeof v.prioritySectors === 'string' ? v.prioritySectors.split(',').map((s) => s.trim()).filter(Boolean) : v.prioritySectors };
    if (edit._id) await api(`/org/mauzes/${edit._id}`, { method: 'PUT', body });
    else await api('/org/mauzes', { method: 'POST', body });
    toast('Mauze saved');
    d.reload();
  };
  const saveZone = async (v) => {
    if (zoneEdit._id) await api(`/org/zones/${zoneEdit._id}`, { method: 'PUT', body: v });
    else await api('/org/zones', { method: 'POST', body: v });
    toast('Zone saved');
    zones.reload();
  };

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Mauzes and zones</h1>
          <p className="sub">Total households per Mauze sets the coverage target. Priority sectors steer families towards locally viable work.</p>
        </div>
        <div className="head-actions">
          {user.role === 'hq' && (
            <button className="btn ghost" onClick={() => setZoneEdit({})}>
              Add zone
            </button>
          )}
          {['hq', 'zbc'].includes(user.role) && (
            <button className="btn" onClick={() => setEdit({ type: 'small_town', active: true, zone: user.zone?._id || user.zone })}>
              Add Mauze
            </button>
          )}
        </div>
      </div>

      {user.role === 'hq' && zones.data?.length > 0 && (
        <div className="zone-row">
          {zones.data.map((z) => (
            <button key={z._id} className="zone-chip" onClick={() => setZoneEdit(z)}>
              {z.name}
              {z.code && <small> {z.code}</small>}
            </button>
          ))}
        </div>
      )}

      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} />
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Mauze</th>
                <th>Zone</th>
                <th>Type</th>
                <th className="r">Households</th>
                <th className="r">Registered</th>
                <th className="r">Assessed</th>
                <th className="meter-col">Coverage</th>
                <th>Priority sectors</th>
              </tr>
            </thead>
            <tbody>
              {d.data.map((m) => (
                <tr key={m._id} tabIndex={canEdit ? 0 : -1} onClick={() => canEdit && setEdit(m)} onKeyDown={(e) => canEdit && e.key === 'Enter' && setEdit(m)}>
                  <td>
                    <strong>{m.name}</strong>
                    <small className="block muted">{[m.town, m.district].filter(Boolean).join(', ')}</small>
                    {!m.active && <small className="block muted">Inactive</small>}
                  </td>
                  <td>{m.zone?.name}</td>
                  <td>{TYPES[m.type]}</td>
                  <td className="r">{m.totalHouseholds || <span className="tx-medium">Not set</span>}</td>
                  <td className="r">{m.registered}</td>
                  <td className="r">{m.assessed}</td>
                  <td className="meter-col">
                    <Meter num={m.assessed} den={m.totalHouseholds} target={90} />
                  </td>
                  <td className="small">{(m.prioritySectors || []).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <FormModal
          title={edit._id ? `Edit ${edit.name}` : 'Add Mauze'}
          initial={{ ...edit, zone: edit.zone?._id || edit.zone, prioritySectors: (edit.prioritySectors || []).join(', ') }}
          onClose={() => setEdit(null)}
          onSubmit={saveMauze}
        >
          {(form, setForm) => {
            const P = { form, setForm };
            const limited = user.role === 'mauze';
            return (
              <>
                <Field label="Mauze name" name="name" required disabled={limited} {...P} />
                <Field label="Short code" name="code" disabled={limited} {...P} hint="Used in household codes, e.g. PKD" />
                {user.role === 'hq' && <Field label="Zone" name="zone" type="select" required options={Object.fromEntries((zones.data || []).map((z) => [z._id, z.name]))} {...P} />}
                <Field label="Type" name="type" type="select" options={TYPES} disabled={limited} {...P} />
                <Field label="Town" name="town" {...P} />
                <Field label="District" name="district" disabled={limited} {...P} />
                <Field label="State" name="state" disabled={limited} {...P} />
                <Field label="Total households in Mauze" name="totalHouseholds" type="number" required {...P} />
                <Field label="Priority sectors" name="prioritySectors" span={2} {...P} hint="Comma separated, e.g. tailoring, food production, repairs" />
                {!limited && <Field label="Active" name="active" type="checkbox" {...P} />}
              </>
            );
          }}
        </FormModal>
      )}
      {zoneEdit && (
        <FormModal title={zoneEdit._id ? `Edit ${zoneEdit.name}` : 'Add zone'} initial={zoneEdit} onClose={() => setZoneEdit(null)} onSubmit={saveZone}>
          {(form, setForm) => (
            <>
              <Field label="Zone / ZBC name" name="name" required form={form} setForm={setForm} />
              <Field label="Code" name="code" form={form} setForm={setForm} />
              <Field label="Notes" name="notes" type="textarea" span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </div>
  );
}
