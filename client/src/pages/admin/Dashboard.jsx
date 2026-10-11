import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api';
import { useAuth, canSanction } from '../../auth';
import { useLoad, Loading, ErrorBox, Meter, RiskBadge, useToast } from '../../ui';
import { inr, inrShort, num, date, monthLabel, STAGES, STAGE_ORDER } from '../../lib';
import { TYPE_ICONS } from '../../components/TypeDetails';
import ScopeFilter, { scopeQuery } from './ScopeFilter';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [scope, setScope] = useState({});
  const d = useLoad(() => api(`/dashboard?${scopeQuery(scope)}`), [scope.zone, scope.mauze]);

  const recompute = async () => {
    try {
      const r = await api(`/dashboard/recompute-risk?${scopeQuery(scope)}`, { method: 'POST' });
      toast(`Early warnings refreshed — ${r.updated} case(s) changed`);
      d.reload();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Community upliftment scorecard</h1>
          {d.data && <p className="sub">Updated {date(d.data.generatedAt)}. Every percentage is shown with its actual numbers.</p>}
        </div>
        <div className="head-actions">
          <ScopeFilter value={scope} onChange={setScope} />
          {canSanction(user) && (
            <button className="btn ghost sm" onClick={recompute}>
              Refresh warnings
            </button>
          )}
        </div>
      </div>

      {d.loading && !d.data ? <Loading /> : d.error ? <ErrorBox error={d.error} onRetry={d.reload} /> : <Body d={d.data} />}
    </div>
  );
}

function Body({ d }) {
  const t = d.totals;
  return (
    <>
      <div className="strip">
        <div>
          <span>Households assessed</span>
          <strong>
            {num(t.assessed)} <small>of {num(t.totalHouseholds)}</small>
          </strong>
        </div>
        <div>
          <span>Active cases</span>
          <strong>{num(t.active)}</strong>
        </div>
        <Link to="/admin/warnings" className="strip-link">
          <span>Need intervention</span>
          <strong className="tx-high">{d.risk.high}</strong>
        </Link>
        <Link to="/admin/warnings" className="strip-link">
          <span>Need corrective action</span>
          <strong className="tx-medium">{d.risk.medium}</strong>
        </Link>
        <Link to="/admin/forms?status=submitted" className="strip-link">
          <span>Family forms to review</span>
          <strong>{t.formsToReview ?? 0}</strong>
        </Link>
        <Link to="/admin/inbox?tab=grievances" className="strip-link">
          <span>Open concerns</span>
          <strong>{t.openGrievances}</strong>
        </Link>
      </div>

      <div className="type-cards">
        {d.types.map((x) => (
          <Link key={x.type} to={`/admin/cases?caseType=${x.type}`} className={`type-card tc-${x.type}`}>
            {TYPE_ICONS[x.type]}
            <div>
              <h2>{x.name}</h2>
              <p className="tc-main">
                <strong>{x.active}</strong> active of {x.cases} cases
              </p>
              <p className="small">
                {x.extra.label}: <strong>{x.extra.value}</strong>
              </p>
              <p className="small muted">
                Disbursed {inrShort(x.disbursed)}
                {x.high + x.medium > 0 ? `. ${x.high + x.medium} need attention` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <section className="panel">
        <h2>Four measurements, kept separate</h2>
        <div className="four">
          <div>
            <span>Sanctioned</span>
            <strong>{inrShort(d.money.sanctioned)}</strong>
          </div>
          <div>
            <span>Disbursed</span>
            <strong>{inrShort(d.money.disbursed)}</strong>
          </div>
          <div>
            <span>Verified as properly used</span>
            <strong>{inrShort(d.money.verified)}</strong>
            {d.money.diverted > 0 && <small className="tx-high">{inr(d.money.diverted)} used for unapproved purposes</small>}
          </div>
          <div>
            <span>Families better off than baseline</span>
            <strong>{num(d.money.improved)}</strong>
            <small>{d.money.outcomesAchieved} {d.money.outcomesAchieved === 1 ? 'case' : 'cases'} closed as achieved</small>
          </div>
        </div>
        <p className="panel-foot">
          Repaid {inr(d.money.repaid)}. Outstanding {inr(d.money.outstanding)}. Overdue {inr(d.money.overdue)}.
        </p>
      </section>

      <section className="panel">
        <h2>Scorecard</h2>
        <div className="table-wrap">
          <table className="table kpi-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th className="r">Actual</th>
                <th className="r">%</th>
                <th className="meter-col">Progress</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {d.kpis.map((k) => (
                <tr key={k.key}>
                  <td>
                    <strong>{k.label}</strong>
                    <small className="block muted">{k.note}</small>
                  </td>
                  <td className="r nowrap">
                    {num(k.num)} / {num(k.den)}
                  </td>
                  <td className="r">{k.den ? `${k.pct}%` : '—'}</td>
                  <td className="meter-col">
                    <Meter num={k.num} den={k.den} target={k.target} />
                  </td>
                  <td className="muted nowrap">{k.target != null ? `${k.target}%` : 'Set after baseline'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Qardan Hasana and Tijaarat Raabehah</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th />
                {d.schemes.map((s) => (
                  <th key={s.scheme} className="r">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Cases (active)" d={d.schemes} f={(s) => `${s.cases} (${s.active})`} />
              <Row label="Sanctioned" d={d.schemes} f={(s) => (s.sanctioned ? inrShort(s.sanctioned) : '—')} />
              <Row label="Verified use" d={d.schemes} f={(s) => (s.disbursed ? `${Math.round((s.verified / s.disbursed) * 100)}%` : '—')} />
              <Row label="Installments on time" d={d.schemes} f={(s) => (s.scheme === 'QH' ? `${s.repaymentOnTimePct}%` : '—')} />
              <Row label="Repaying, income not improved" d={d.schemes} f={(s) => (s.scheme === 'QH' ? s.repayingButNotImproved : '—')} />
              <Row label="Training completed / applied" d={d.schemes} f={(s) => (s.trainingTotal ? `${s.trainingCompleted} / ${s.trainingApplied}` : '—')} />
              <Row label="Improved vs baseline" d={d.schemes} f={(s) => (s.withOutcomeData ? `${s.improved} of ${s.withOutcomeData}` : '—')} />
              <Row label="High / medium risk" d={d.schemes} f={(s) => `${s.high} / ${s.medium}`} />
            </tbody>
          </table>
        </div>
        <p className="panel-foot">A family repaying regularly whose income has not improved is not counted as a successful upliftment case.</p>
      </section>

      <div className="cols-2">
        <section className="panel">
          <h2>Where cases stand</h2>
          <ul className="funnel">
            {STAGE_ORDER.map((s) => {
              const n = d.stages[s] || 0;
              const max = Math.max(1, ...Object.values(d.stages));
              return (
                <li key={s}>
                  <span>{STAGES[s]}</span>
                  <div className="funnel-bar">
                    <div style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <b>{n}</b>
                </li>
              );
            })}
          </ul>
          <p className="panel-foot">
            Repeat applications: {d.repeatInfo.total} ({d.repeatInfo.growth} growth, {d.repeatInfo.distress} recurring distress, {d.repeatInfo.unclassified} not yet classified).
            Success stories to scale: {t.successStories}.
          </p>
        </section>
        <section className="panel">
          <h2>Reviews due in the next two weeks</h2>
          {d.dueReviews.length === 0 ? (
            <p className="muted">No reviews due.</p>
          ) : (
            <ul className="warn-list">
              {d.dueReviews.map((r) => (
                <li key={r._id}>
                  <Link to={`/admin/cases/${r._id}`}>
                    <span className={`date-pill ${r.overdue ? 'late' : ''}`}>{date(r.reviewDate)}</span>
                    <span>
                      <strong>{r.beneficiaryName}</strong> <small className="muted">{r.caseNo}</small>
                      <small className="block">
                        {r.mauze}
                        {r.counsellor ? `, counsellor ${r.counsellor}` : ''}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Money over the last 12 months</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E2EAE5" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={inrShort} tick={{ fontSize: 12 }} width={64} />
              <Tooltip formatter={(v) => inr(v)} labelFormatter={monthLabel} />
              <Legend />
              <Bar dataKey="disbursed" name="Disbursed" fill="#003399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="verified" name="Verified use" fill="#8FA6D9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="repaid" name="Repaid" fill="#A9822E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Early warnings</h2>
          <Link to="/admin/warnings">All warnings</Link>
        </div>
        {d.warnings.length === 0 ? (
          <p className="muted">No cases need attention right now.</p>
        ) : (
          <ul className="warn-list">
            {d.warnings.slice(0, 8).map((w) => (
              <li key={w._id}>
                <Link to={`/admin/cases/${w._id}`}>
                  <RiskBadge risk={w.risk} />
                  <span>
                    <strong>{w.beneficiaryName}</strong> <small className="muted">{w.caseNo}, {w.mauze}</small>
                    <small className="block">{w.reasons[0]}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.mauzeTable.length > 1 && (
        <section className="panel">
          <h2>By Mauze</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mauze</th>
                  <th className="r">Assessed</th>
                  <th className="r">Coverage</th>
                  <th className="r">Active cases</th>
                  <th className="r">High</th>
                  <th className="r">Medium</th>
                  <th className="r">Disbursed</th>
                  <th className="r">Verified</th>
                  <th className="r">Improved</th>
                </tr>
              </thead>
              <tbody>
                {d.mauzeTable.map((m) => (
                  <tr key={m._id}>
                    <td>{m.name}</td>
                    <td className="r">
                      {m.assessed} / {m.totalHouseholds}
                    </td>
                    <td className="r">{m.coveragePct}%</td>
                    <td className="r">{m.active}</td>
                    <td className={`r ${m.high ? 'tx-high' : ''}`}>{m.high}</td>
                    <td className={`r ${m.medium ? 'tx-medium' : ''}`}>{m.medium}</td>
                    <td className="r">{inrShort(m.disbursed)}</td>
                    <td className="r">{m.disbursed ? `${m.verifiedPct}%` : '—'}</td>
                    <td className="r">{m.withData ? `${m.improved} of ${m.withData}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Row({ label, d, f }) {
  return (
    <tr>
      <td>{label}</td>
      {d.map((s) => (
        <td key={s.scheme} className="r">
          {f(s)}
        </td>
      ))}
    </tr>
  );
}
