import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, Empty, RiskBadge, StageBadge } from '../../ui';
import { SCHEMES, STAGES, FINAL, RISK_SHORT, inr, date } from '../../lib';
import { Pager } from './Households';

export default function Cases() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ page: 1, risk: sp.get('risk') || '', mine: user.role === 'counsellor' ? '1' : '' });
  const mauzes = useLoad(() => api('/org/mauzes'), []);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const d = useLoad(() => api(`/cases?${qs}`), [qs]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value, page: 1 }));

  const sel = (k, label, opts, all = 'All') => (
    <label>
      <span>{label}</span>
      <select value={f[k] || ''} onChange={set(k)}>
        <option value="">{all}</option>
        {Object.entries(opts).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Beneficiary cases</h1>
          <p className="sub">One record per case, from identification to final outcome.</p>
        </div>
        <Link className="btn" to="/admin/cases/new">
          Open a case
        </Link>
      </div>

      <div className="filters bar">
        <label className="grow">
          <span>Search</span>
          <input type="search" placeholder="Case number, name or mobile" value={f.q || ''} onChange={set('q')} />
        </label>
        {['hq', 'zbc'].includes(user.role) && sel('mauze', 'Mauze', Object.fromEntries((mauzes.data || []).map((m) => [m._id, m.name])))}
        {sel('scheme', 'Scheme', SCHEMES)}
        {sel('stage', 'Stage', STAGES)}
        {sel('risk', 'Risk', RISK_SHORT, 'Any')}
        {sel('finalStatus', 'Status', FINAL)}
        <label className="check inline">
          <input type="checkbox" checked={f.mine === '1'} onChange={set('mine')} />
          <span>Only my cases</span>
        </label>
      </div>

      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} onRetry={d.reload} />
      ) : d.data.items.length === 0 ? (
        <Empty title="No cases match these filters">Open a case from a surveyed household once an upliftment plan is agreed.</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table hover">
              <thead>
                <tr>
                  <th>Beneficiary</th>
                  <th>Scheme</th>
                  <th>Stage</th>
                  <th>Risk</th>
                  <th className="r">Sanctioned</th>
                  <th className="r">Disbursed</th>
                  <th className="r">Verified</th>
                  <th>Counsellor</th>
                  <th>Next review</th>
                </tr>
              </thead>
              <tbody>
                {d.data.items.map((c) => (
                  <tr key={c._id} tabIndex={0} onClick={() => nav(`/admin/cases/${c._id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/admin/cases/${c._id}`)}>
                    <td>
                      <strong>{c.beneficiaryName}</strong>
                      <small className="block muted">
                        {c.caseNo}, {c.mauze?.name}
                      </small>
                    </td>
                    <td>{SCHEMES[c.scheme]}</td>
                    <td>
                      <StageBadge stage={c.stage} />
                    </td>
                    <td title={(c.riskReasons || []).join('\n')}>
                      <RiskBadge risk={c.risk} />
                    </td>
                    <td className="r">{c.financials.sanctioned ? inr(c.financials.sanctioned) : '—'}</td>
                    <td className="r">{c.financials.disbursed ? inr(c.financials.disbursed) : '—'}</td>
                    <td className="r">{c.financials.disbursed ? `${Math.round((c.financials.verified / c.financials.disbursed) * 100)}%` : '—'}</td>
                    <td>{c.counsellor?.name || <span className="tx-medium">Not assigned</span>}</td>
                    <td className={`nowrap ${c.reviewDate && new Date(c.reviewDate) < new Date() && c.stage !== 'closed' ? 'tx-high' : ''}`}>{date(c.reviewDate)}</td>
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
