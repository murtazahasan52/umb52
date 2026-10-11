import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useLoad, Loading, ErrorBox, RiskBadge, Empty } from '../../ui';
import { SCHEMES, CASE_TYPES } from '../../lib';
import ScopeFilter, { scopeQuery } from './ScopeFilter';

const ACTION = {
  high: 'Verify the facts, contact the family discreetly and refer the case to the authorised committee.',
  medium: 'Prepare a written recovery plan with a responsible mentor and a review date.',
};

export default function Warnings() {
  const [scope, setScope] = useState({});
  const [level, setLevel] = useState('');
  const d = useLoad(() => api(`/dashboard?${scopeQuery(scope)}`), [scope.zone, scope.mauze]);
  const list = (d.data?.warnings || []).filter((w) => !level || w.risk === level);

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Early warnings</h1>
          <p className="sub">Raised automatically from utilization, repayments, monthly updates, training and review dates, plus alerts added by the committee.</p>
        </div>
        <div className="head-actions">
          <ScopeFilter value={scope} onChange={setScope} />
          <div className="filters">
            <label>
              <span>Priority</span>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">High and medium</option>
                <option value="high">High: immediate intervention</option>
                <option value="medium">Medium: corrective action</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} onRetry={d.reload} />
      ) : list.length === 0 ? (
        <Empty title="No cases need attention">All active cases are on track for the selected scope.</Empty>
      ) : (
        <div className="warn-cards">
          {list.map((w) => (
            <Link key={w._id} to={`/admin/cases/${w._id}`} className={`warn-card wc-${w.risk}`}>
              <div className="wc-top">
                <RiskBadge risk={w.risk} />
                <span className="muted">{w.caseNo}</span>
              </div>
              <h3>{w.beneficiaryName}</h3>
              <p className="muted">
                {CASE_TYPES[w.caseType] ? `${CASE_TYPES[w.caseType]}, ` : ''}
                {SCHEMES[w.scheme]}, {w.mauze}
                {w.counsellor ? `. Counsellor: ${w.counsellor}` : '. No counsellor assigned'}
              </p>
              <ul>
                {w.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="wc-action">{ACTION[w.risk]}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
