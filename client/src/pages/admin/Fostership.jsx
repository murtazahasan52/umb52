import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, useToast } from '../../ui';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// Fostership (خانگی): ITS IDs added by the Mamur
export default function Fostership() {
  const { user } = useAuth();
  const toast = useToast();
  const [its, setIts] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const input = useRef(null);
  const d = useLoad(() => api(`/directory/fostership?${new URLSearchParams({ page, limit, ...(q && { q }), ...(all && { all: '1' }) })}`), [page, limit, q, all]);
  useEffect(() => setPage(1), [q, all, limit]);

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    if (its.length !== 8) return setErr('Type all 8 digits of the ITS ID');
    setBusy(true);
    try {
      await api('/directory/fostership', { method: 'POST', body: { itsNo: its } });
      toast(`ITS ID ${its} saved.`);
      setIts('');
      d.reload();
      input.current?.focus();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    await api(`/directory/fostership/${row._id}`, { method: 'DELETE' });
    toast(`ITS ID ${row.itsNo} removed.`);
    setConfirmId(null);
    d.reload();
  };

  return (
    <div className="page-admin narrow-page">
      <div className="page-head">
        <div>
          <h1>
            Fostership <span lang="ar" dir="rtl">(خانگی)</span>
          </h1>
          <p className="sub">ITS IDs added by the Mamur for Fostership.</p>
        </div>
      </div>

      <form className="panel" onSubmit={save}>
        <h2 className="caps-h">Add an ITS ID</h2>
        <p className="small muted">Type the 8-digit ITS ID and press Save. It appears in your list below.</p>
        <div className="field">
          <label htmlFor="fos-its">ITS ID</label>
          <input
            id="fos-its"
            ref={input}
            className="its-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="8 digits"
            value={its}
            maxLength={8}
            onChange={(e) => setIts(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </div>
        <button className="btn block lg" disabled={busy}>
          {busy ? 'Saving…' : '+ Save'}
        </button>
        <small className={`hint ${its.length === 8 ? 'tx-good' : ''}`}>{its.length} of 8 digits</small>
        {err && <p className="form-error">{err}</p>}
      </form>

      {d.data && (
        <div className="stat-pair">
          <div className="panel">
            <span>ITS IDs you added</span>
            <strong>{d.data.stats.yours}</strong>
          </div>
          <div className="panel">
            <span>Added today</span>
            <strong>{d.data.stats.today}</strong>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2 className="caps-h">{all ? 'All ITS IDs' : 'Your list'}</h2>
          {['hq', 'zbc'].includes(user.role) && (
            <label className="check inline">
              <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
              <span>Show everyone’s</span>
            </label>
          )}
        </div>
        <div className="search-row">
          <input type="search" placeholder="Search ITS ID" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-label="Search ITS ID" />
          <button type="button" className="btn ghost sm" onClick={d.reload}>
            Refresh
          </button>
        </div>
        {d.loading && !d.data ? (
          <Loading />
        ) : d.error ? (
          <ErrorBox error={d.error} onRetry={d.reload} />
        ) : d.data.items.length === 0 ? (
          <p className="muted center pad">{q ? 'No ITS ID matches your search.' : 'No ITS ID has been added yet. Add the first one above.'}</p>
        ) : (
          <div className="rec-cards">
            {d.data.items.map((r) => (
              <div className="rec-card" key={r._id}>
                <dl>
                  <dt>ITS ID</dt>
                  <dd className="strong">{r.itsNo}</dd>
                  <dt>Added on</dt>
                  <dd>{fmt(r.createdAt)}</dd>
                  {all && (
                    <>
                      <dt>Added by</dt>
                      <dd>
                        {r.addedByName}
                        {r.mauze?.name ? `, ${r.mauze.name}` : ''}
                      </dd>
                    </>
                  )}
                </dl>
                {(String(r.addedBy) === String(user._id) || user.role === 'hq') &&
                  (confirmId === r._id ? (
                    <div className="confirm-row">
                      <span className="small">Remove {r.itsNo}?</span>
                      <button type="button" className="btn ghost sm" onClick={() => setConfirmId(null)}>
                        Keep
                      </button>
                      <button type="button" className="btn sm danger-btn" onClick={() => remove(r)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="btn ghost block sm" onClick={() => setConfirmId(r._id)}>
                      Remove
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
        {d.data && <Paging data={d.data} limit={limit} setLimit={setLimit} setPage={setPage} />}
      </section>

      <div className="remember panel">
        <h2>Remember</h2>
        <ol>
          <li>Type the 8-digit ITS ID and tap Save. Add one ITS ID at a time.</li>
          <li>Each ITS ID can be in the list only once.</li>
          <li>Your list shows only the ITS IDs you added yourself.</li>
          <li>Added by mistake? Tap Remove, then confirm.</li>
        </ol>
      </div>
    </div>
  );
}

export function Paging({ data, limit, setLimit, setPage }) {
  return (
    <div className="paging">
      <span className="small muted">
        {data.total} record{data.total === 1 ? '' : 's'}, page {data.page} of {data.pages}
      </span>
      <label className="small">
        Rows{' '}
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {[10, 25, 50, 100].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button type="button" className="btn ghost sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <button type="button" className="btn ghost sm" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
}
