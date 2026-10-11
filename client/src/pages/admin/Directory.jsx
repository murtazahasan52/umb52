import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, FormModal, Field, useToast } from '../../ui';
import { Paging } from './Fostership';

const CATS = {
  architect: 'Architect',
  structural_civil: 'Structural / Civil Engineer',
  mep: 'MEP Professional',
  interior: 'Interior Designer',
  promoter_builder: 'Promoter / Builder',
};
const DESIGNATIONS = ['Jamiat Mushrif', 'Jamiat Masool', 'Jamiat Co-ordinator', 'FC', 'Mamur', 'Other'];

// Directory: contact list to help the Mamur reach the right person
export default function Directory() {
  return (
    <div className="page-admin narrow-page">
      <div className="page-head">
        <div>
          <h1>Directory</h1>
          <p className="sub">Contact list to help the Mamur reach the right person.</p>
        </div>
      </div>
      <Professionals />
      <OfficeContacts />
    </div>
  );
}

function Professionals() {
  const { user } = useAuth();
  const toast = useToast();
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [edit, setEdit] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const d = useLoad(() => api(`/directory/professionals?${new URLSearchParams({ page, limit, ...(cat && { category: cat }), ...(q && { q }) })}`), [page, limit, cat, q]);
  useEffect(() => setPage(1), [cat, q, limit]);
  const counts = d.data?.counts || {};

  const save = async (v) => {
    if (edit._id) await api(`/directory/professionals/${edit._id}`, { method: 'PUT', body: v });
    else await api('/directory/professionals', { method: 'POST', body: v });
    toast('Contact saved.');
    d.reload();
  };
  const remove = async (r) => {
    await api(`/directory/professionals/${r._id}`, { method: 'DELETE' });
    toast('Contact removed.');
    setConfirmId(null);
    d.reload();
  };

  return (
    <section className="panel">
      <h2 className="caps-h">Mumineen professionals</h2>
      <p className="small muted">Contacts added by the Mamur of your Jamiat{user.zone?.name ? ` (${user.zone.name})` : ''}. Every Mamur of this Jamiat sees them.</p>
      <div className="row-actions">
        <button type="button" className="btn ghost sm" onClick={d.reload}>
          Refresh
        </button>
        <button type="button" className="btn sm" onClick={() => setEdit({ category: cat || 'architect' })}>
          + Add contact
        </button>
      </div>

      <div className="cat-boxes">
        <button type="button" className={`cat-box ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>
          <span>All contacts</span>
          <strong>{counts.all ?? 0}</strong>
        </button>
        {Object.entries(CATS).map(([k, l]) => (
          <button type="button" key={k} className={`cat-box ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>
            <span>{l}</span>
            <strong>{counts[k] ?? 0}</strong>
          </button>
        ))}
      </div>

      <div className="search-row">
        <input type="search" placeholder="Search ITS ID, name, number or company" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search professionals" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {Object.entries(CATS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {(cat || q) && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            setCat('');
            setQ('');
          }}
        >
          Clear filters
        </button>
      )}

      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} onRetry={d.reload} />
      ) : d.data.items.length === 0 ? (
        <p className="muted center pad">No professionals here yet. Tap Add contact to add the first one.</p>
      ) : (
        <div className="rec-cards">
          {d.data.items.map((r) => (
            <div className="rec-card" key={r._id}>
              <dl>
                <dt>ITS ID</dt>
                <dd>{r.itsNo}</dd>
                <dt>Name</dt>
                <dd className="strong">{r.name}</dd>
                <dt>Number</dt>
                <dd>
                  <a href={`tel:${r.mobile}`}>{r.mobile}</a>
                </dd>
                <dt>Professional category</dt>
                <dd>
                  <span className="pill">{CATS[r.category]}</span>
                </dd>
                <dt>Company name</dt>
                <dd>{r.company || '—'}</dd>
                <dt>Experience</dt>
                <dd>{r.experienceYears != null ? `${r.experienceYears} years` : '—'}</dd>
                <dt>Jamiat</dt>
                <dd>{r.zone?.name || '—'}</dd>
                <dt>Added by</dt>
                <dd>{r.addedByName}</dd>
              </dl>
              {r.canEdit &&
                (confirmId === r._id ? (
                  <div className="confirm-row">
                    <span className="small">Remove {r.name}?</span>
                    <button type="button" className="btn ghost sm" onClick={() => setConfirmId(null)}>
                      Keep
                    </button>
                    <button type="button" className="btn sm danger-btn" onClick={() => remove(r)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="two-btn">
                    <button type="button" className="btn ghost sm" onClick={() => setEdit(r)}>
                      Edit
                    </button>
                    <button type="button" className="btn ghost sm" onClick={() => setConfirmId(r._id)}>
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
      {d.data && <Paging data={d.data} limit={limit} setLimit={setLimit} setPage={setPage} />}

      {edit && (
        <FormModal title={edit._id ? 'Edit contact' : 'Add contact'} submitLabel="Save contact" initial={edit} onClose={() => setEdit(null)} onSubmit={save}>
          {(form, setForm) => (
            <>
              <Field label="ITS ID" name="itsNo" required form={form} setForm={setForm} placeholder="8 digits" />
              <Field label="Name" name="name" required form={form} setForm={setForm} />
              <Field label="Number" name="mobile" type="tel" required form={form} setForm={setForm} />
              <Field label="Professional category" name="category" type="select" options={CATS} required form={form} setForm={setForm} />
              <Field label="Company name" name="company" form={form} setForm={setForm} />
              <Field label="Experience (years)" name="experienceYears" type="number" form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </section>
  );
}

function OfficeContacts() {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [mauze, setMauze] = useState('');
  const [dept, setDept] = useState('');
  const [edit, setEdit] = useState(null);
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  const d = useLoad(() => api(`/directory/office?${new URLSearchParams({ ...(q && { q }), ...(mauze && { mauze }), ...(dept && { department: dept }) })}`), [q, mauze, dept]);
  const canManage = ['hq', 'zbc'].includes(user.role);

  const save = async (v) => {
    const body = { ...v, mauze: v.mauze || '' };
    if (edit._id) await api(`/directory/office/${edit._id}`, { method: 'PUT', body });
    else await api('/directory/office', { method: 'POST', body });
    toast('Office contact saved.');
    d.reload();
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="caps-h">Office contacts</h2>
        {canManage && (
          <button type="button" className="btn sm" onClick={() => setEdit({ designation: 'Jamiat Mushrif' })}>
            + Add office contact
          </button>
        )}
      </div>
      <div className="search-row">
        <input type="search" placeholder="Search name, designation, department" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search office contacts" />
        <select value={mauze} onChange={(e) => setMauze(e.target.value)} aria-label="Jamaat">
          <option value="">All Jamaats and Jamiats</option>
          {(mauzes.data || []).map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <select className="full-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
        <option value="">All departments</option>
        {(d.data?.departments || []).map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} />
      ) : d.data.items.length === 0 ? (
        <p className="muted center pad">No office contacts yet.</p>
      ) : (
        <div className="rec-cards">
          {d.data.items.map((r) => (
            <div className="rec-card" key={r._id}>
              <dl>
                <dt>Name</dt>
                <dd className="strong">{r.name}</dd>
                <dt>Designation</dt>
                <dd>{r.designation}</dd>
                <dt>Department</dt>
                <dd>{r.department || '—'}</dd>
                <dt>Jamaat / Jamiat</dt>
                <dd>{r.mauze?.name || r.zone?.name || '—'}</dd>
                <dt>Mobile</dt>
                <dd>{r.mobile ? <a href={`tel:${r.mobile}`}>{r.mobile}</a> : '—'}</dd>
                <dt>WhatsApp</dt>
                <dd>{r.whatsapp ? <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{r.whatsapp}</a> : '—'}</dd>
                <dt>Email ID</dt>
                <dd>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : '—'}</dd>
              </dl>
              {canManage && (
                <button type="button" className="btn ghost sm block" onClick={() => setEdit({ ...r, mauze: r.mauze?._id || '' })}>
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {edit && (
        <FormModal title={edit._id ? 'Edit office contact' : 'Add office contact'} initial={edit} onClose={() => setEdit(null)} onSubmit={save}>
          {(form, setForm) => (
            <>
              <Field label="Name" name="name" required form={form} setForm={setForm} />
              <Field label="Designation" name="designation" type="select" options={Object.fromEntries(DESIGNATIONS.map((x) => [x, x]))} required form={form} setForm={setForm} />
              <Field label="Department" name="department" form={form} setForm={setForm} />
              <Field label="Jamaat (optional)" name="mauze" type="select" options={Object.fromEntries((mauzes.data || []).map((m) => [m._id, m.name]))} form={form} setForm={setForm} />
              <Field label="Mobile" name="mobile" type="tel" form={form} setForm={setForm} />
              <Field label="WhatsApp" name="whatsapp" type="tel" form={form} setForm={setForm} />
              <Field label="Email ID" name="email" type="email" form={form} setForm={setForm} />
              <Field label="Display order" name="order" type="number" form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </section>
  );
}
