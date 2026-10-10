import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, Empty } from '../../ui';
import { CATEGORIES, NEED, inr, date } from '../../lib';

export default function Households() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ page: 1 });
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const d = useLoad(() => api(`/households?${qs}`), [qs]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, page: 1 }));

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Household survey</h1>
          <p className="sub">Checkpoint 1: identify every family and assess its needs. Survey details are confidential.</p>
        </div>
        <Link className="btn" to="/admin/households/new">
          Add household
        </Link>
      </div>

      <div className="filters bar">
        <label className="grow">
          <span>Search</span>
          <input type="search" placeholder="Name, code, ITS or mobile" value={f.q || ''} onChange={set('q')} />
        </label>
        {['hq', 'zbc'].includes(user.role) && (
          <label>
            <span>Mauze</span>
            <select value={f.mauze || ''} onChange={set('mauze')}>
              <option value="">All</option>
              {(mauzes.data || []).map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Category</span>
          <select value={f.category || ''} onChange={set('category')}>
            <option value="">All</option>
            {Object.entries(CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Need</span>
          <select value={f.needLevel || ''} onChange={set('needLevel')}>
            <option value="">Any</option>
            {Object.entries(NEED).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Assessment</span>
          <select value={f.assessed || ''} onChange={set('assessed')}>
            <option value="">All</option>
            <option value="yes">Assessed</option>
            <option value="no">Not yet assessed</option>
          </select>
        </label>
      </div>

      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} onRetry={d.reload} />
      ) : d.data.items.length === 0 ? (
        <Empty title="No households match">
          <Link to="/admin/households/new">Add the first household</Link> or clear the filters.
        </Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table hover">
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Mauze</th>
                  <th>Categories</th>
                  <th className="r">Monthly income</th>
                  <th>Need</th>
                  <th>Plan</th>
                  <th>Assessed</th>
                </tr>
              </thead>
              <tbody>
                {d.data.items.map((h) => (
                  <tr key={h._id} onClick={() => nav(`/admin/households/${h._id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/admin/households/${h._id}`)}>
                    <td>
                      <strong>{h.headName}</strong>
                      <small className="block muted">{h.code}</small>
                    </td>
                    <td>{h.mauze?.name}</td>
                    <td className="small">{(h.categories || []).map((c) => CATEGORIES[c]).join(', ')}</td>
                    <td className="r">{inr(h.monthlyHouseholdIncome)}</td>
                    <td>
                      <span className={`need need-${h.needLevel}`}>{NEED[h.needLevel]}</span>
                    </td>
                    <td>{h.supportPlanIdentified ? 'Yes' : '—'}</td>
                    <td className="nowrap">{h.assessedAt ? date(h.assessedAt) : <span className="tx-medium">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={d.data.page} pages={d.data.pages} total={d.data.total} onPage={(p) => setF((x) => ({ ...x, page: p }))} />
        </>
      )}
    </div>
  );
}

export function Pager({ page, pages, total, onPage }) {
  if (pages <= 1) return <p className="muted small pager">{total} records</p>;
  return (
    <div className="pager">
      <span className="muted small">
        {total} records, page {page} of {pages}
      </span>
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
