import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useLoad, Loading, ErrorBox, Empty, Tabs, FormModal, Field, useToast } from '../../ui';
import { SUPPORT_TYPES, GRIEVANCE_CATEGORIES, date } from '../../lib';

const ENQ_STATUS = { new: 'New', contacted: 'Contacted', surveyed: 'Survey done', case_opened: 'Case opened', not_eligible: 'Not eligible', closed: 'Closed' };
const GRV_STATUS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', rejected: 'Closed, not upheld' };

export default function Inbox() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'requests';
  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Requests and concerns</h1>
          <p className="sub">Support requests and grievances sent from the website and app.</p>
        </div>
      </div>
      <Tabs
        tabs={[
          { key: 'requests', label: 'Support requests' },
          { key: 'grievances', label: 'Concerns' },
        ]}
        active={tab}
        onChange={(t) => setSp({ tab: t })}
      />
      <div className="tab-body">{tab === 'requests' ? <Requests /> : <Grievances />}</div>
    </div>
  );
}

function Requests() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState(null);
  const d = useLoad(() => api(`/inbox/enquiries${status ? `?status=${status}` : ''}`), [status]);
  return (
    <>
      <div className="filters bar">
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(ENQ_STATUS).map(([k, l]) => (
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
        <Empty title="No requests">Requests sent from the website appear here.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Request</th>
                <th>Mauze</th>
                <th>Looking for</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.data.map((e) => (
                <tr key={e._id} onClick={() => setEdit(e)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && setEdit(e)}>
                  <td>
                    <strong>{e.name}</strong>
                    <small className="block muted">
                      {e.refNo}, {e.mobile}
                    </small>
                  </td>
                  <td>{e.mauze?.name || <span className="tx-medium">Not given</span>}</td>
                  <td>{SUPPORT_TYPES[e.supportType]}</td>
                  <td>{date(e.createdAt)}</td>
                  <td>
                    <span className={`badge st-${e.status}`}>{ENQ_STATUS[e.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <FormModal
          title={`${edit.refNo}: ${edit.name}`}
          initial={edit}
          onClose={() => setEdit(null)}
          onSubmit={async (v) => {
            await api(`/inbox/enquiries/${edit._id}`, { method: 'PUT', body: { status: v.status, notes: v.notes } });
            toast('Request updated');
            d.reload();
          }}
        >
          {(form, setForm) => (
            <>
              <div className="span-2 readout">
                <p>
                  <strong>Mobile:</strong> <a href={`tel:${edit.mobile}`}>{edit.mobile}</a>
                  {edit.itsNo && `, ITS ${edit.itsNo}`}
                </p>
                <p>
                  <strong>Looking for:</strong> {SUPPORT_TYPES[edit.supportType]}
                </p>
                {edit.currentOccupation && (
                  <p>
                    <strong>Currently:</strong> {edit.currentOccupation}
                  </p>
                )}
                {edit.message && <p className="pre">{edit.message}</p>}
                <p className="small">
                  Next step: meet the family and <Link to="/admin/households/new">record a household survey</Link>.
                </p>
              </div>
              <Field label="Status" name="status" type="select" options={ENQ_STATUS} form={form} setForm={setForm} />
              <Field label="Notes" name="notes" type="textarea" span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

function Grievances() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState(null);
  const d = useLoad(() => api(`/inbox/grievances${status ? `?status=${status}` : ''}`), [status]);
  const overdue = (g) => !['resolved', 'rejected'].includes(g.status) && (Date.now() - new Date(g.createdAt)) / 86400000 > (g.slaDays || 15);
  return (
    <>
      <div className="filters bar">
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(GRV_STATUS).map(([k, l]) => (
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
        <Empty title="No concerns">Concerns raised from the website appear here.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Subject</th>
                <th>Mauze</th>
                <th>Raised</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.data.map((g) => (
                <tr key={g._id} onClick={() => setEdit(g)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && setEdit(g)}>
                  <td>
                    <strong>{g.ticketNo}</strong>
                    <small className="block muted">{g.name}</small>
                  </td>
                  <td>
                    {g.subject}
                    <small className="block muted">{GRIEVANCE_CATEGORIES[g.category]}</small>
                  </td>
                  <td>{g.mauze?.name || '—'}</td>
                  <td className={overdue(g) ? 'tx-high' : ''}>
                    {date(g.createdAt)}
                    {overdue(g) && <small className="block">Past {g.slaDays}-day standard</small>}
                  </td>
                  <td>
                    <span className={`badge st-${g.status}`}>{GRV_STATUS[g.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <FormModal
          title={`${edit.ticketNo}: ${edit.subject}`}
          initial={edit}
          onClose={() => setEdit(null)}
          onSubmit={async (v) => {
            await api(`/inbox/grievances/${edit._id}`, { method: 'PUT', body: { status: v.status, response: v.response, eligible: v.eligible, slaDays: v.slaDays } });
            toast('Concern updated');
            d.reload();
          }}
        >
          {(form, setForm) => (
            <>
              <div className="span-2 readout">
                <p>
                  <strong>{edit.name}</strong>, <a href={`tel:${edit.mobile}`}>{edit.mobile}</a>
                </p>
                <p className="pre">{edit.message}</p>
              </div>
              <Field label="Status" name="status" type="select" options={GRV_STATUS} form={form} setForm={setForm} />
              <Field label="Service standard (days)" name="slaDays" type="number" form={form} setForm={setForm} />
              <Field label="Response shown to the person" name="response" type="textarea" span={2} form={form} setForm={setForm} />
              <Field label="Counts as an eligible complaint" name="eligible" type="checkbox" span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}
