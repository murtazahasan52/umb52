import { useMyCases } from '../../layouts/AppLayout';
import { Empty } from '../../ui';
import { SCHEMES, inr, date } from '../../lib';

export default function Repayments() {
  const { data: cases } = useMyCases();
  const withMoney = cases.filter((c) => c.disbursements.length || c.repayments.length);
  if (!withMoney.length) return <Empty title="Nothing to repay">Installments appear here once support is released.</Empty>;
  const now = new Date();
  return (
    <div className="fam-stack">
      {withMoney.map((c) => (
        <article key={c._id} className="fam-card">
          <header>
            <span className="muted small">{c.caseNo}</span>
            <h2>{SCHEMES[c.scheme]}</h2>
          </header>
          <dl className="fam-sum">
            <div>
              <dt>Received</dt>
              <dd>{inr(c.financials.disbursed)}</dd>
            </div>
            <div>
              <dt>Repaid</dt>
              <dd>{inr(c.financials.repaid)}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{inr(c.financials.outstanding)}</dd>
            </div>
          </dl>
          {c.financials.overdueAmount > 0 && (
            <p className="gentle">{inr(c.financials.overdueAmount)} is pending. If it is difficult to pay right now, please speak to your counsellor. A new schedule can be discussed.</p>
          )}
          {c.repayments.length > 0 && (
            <ul className="inst-list">
              {c.repayments.map((r) => {
                const paid = (r.paidAmount || 0) >= r.amount;
                const late = !paid && new Date(r.dueDate) < now;
                return (
                  <li key={r._id} className={paid ? 'paid' : late ? 'late' : ''}>
                    <span>
                      {r.no}. {date(r.dueDate)}
                    </span>
                    <strong>{inr(r.amount)}</strong>
                    <small>{paid ? `Paid ${date(r.paidDate)}` : late ? 'Pending' : 'Upcoming'}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
