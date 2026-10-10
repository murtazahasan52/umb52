import { Link } from 'react-router-dom';
import { useMyCases } from '../../layouts/AppLayout';
import { Empty } from '../../ui';
import { SCHEMES, INTERVENTIONS, TRAINING, inr, date } from '../../lib';

const STAGE_TEXT = {
  identified: 'Your counsellor is getting to know your family’s needs.',
  planned: 'Your plan has been agreed.',
  feasibility: 'Your request is being reviewed by the committee.',
  sanctioned: 'Your support has been approved.',
  disbursed: 'Funds have been released. Please share bills for what you buy.',
  monitoring: 'Your counsellor is following your progress each month.',
  closed: 'This case is complete.',
};

export default function MyPlan() {
  const { data: cases } = useMyCases();
  if (!cases.length)
    return (
      <Empty title="No plan yet">
        Your counsellor will add your plan here after your first meeting. You can also <Link to="/request-support">send a request</Link>.
      </Empty>
    );
  return (
    <div className="fam-stack">
      {cases.map((c) => {
        const next = c.repayments.find((r) => (r.paidAmount || 0) < r.amount);
        const upcomingTraining = c.trainings.filter((t) => ['planned', 'ongoing'].includes(t.status));
        return (
          <article key={c._id} className="fam-card">
            <header>
              <span className="muted small">{c.caseNo}</span>
              <h2>{SCHEMES[c.scheme]}</h2>
              <p>{STAGE_TEXT[c.stage]}</p>
            </header>

            {c.targetOutcome && (
              <div className="goal">
                <span>Our goal together</span>
                <strong>{c.targetOutcome}</strong>
                {c.targetDate && <small>by {date(c.targetDate)}</small>}
              </div>
            )}

            {c.interventions?.length > 0 && (
              <p className="small">
                Support agreed: {c.interventions.map((i) => INTERVENTIONS[i]).join(', ')}.
              </p>
            )}

            {next && (
              <Link to="/app/repayments" className="fam-row">
                <span>Next installment</span>
                <strong className={new Date(next.dueDate) < new Date() ? 'tx-high' : ''}>
                  {inr(next.amount - (next.paidAmount || 0))} on {date(next.dueDate)}
                </strong>
              </Link>
            )}
            {['monitoring', 'disbursed'].includes(c.stage) && (
              <Link to="/app/progress" className="fam-row">
                <span>Monthly update</span>
                <strong>Send this month’s numbers</strong>
              </Link>
            )}
            {upcomingTraining.map((t) => (
              <div className="fam-row" key={t.program}>
                <span>{TRAINING[t.category]}</span>
                <strong>
                  {t.program}
                  {t.plannedDate ? `, ${date(t.plannedDate)}` : ''}
                </strong>
              </div>
            ))}
            {c.reviewDate && c.stage !== 'closed' && (
              <div className="fam-row">
                <span>Next review meeting</span>
                <strong>{date(c.reviewDate)}</strong>
              </div>
            )}

            <div className="contacts">
              {[c.counsellor && ['Counsellor', c.counsellor], c.mentor && ['Mentor', c.mentor]].filter(Boolean).map(([role, p]) => (
                <a key={role} href={`tel:${p.mobile}`} className="contact">
                  <span>{role}</span>
                  <strong>{p.name}</strong>
                  <small>Call {p.mobile}</small>
                </a>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
