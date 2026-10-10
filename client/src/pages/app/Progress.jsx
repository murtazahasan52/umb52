import { useState } from 'react';
import { api } from '../../api';
import { useMyCases } from '../../layouts/AppLayout';
import { Field, Empty, useToast } from '../../ui';
import { SCHEMES, inr, monthLabel, prevMonth } from '../../lib';

export default function Progress() {
  const cases = useMyCases();
  const toast = useToast();
  const active = cases.data.filter((c) => c.stage !== 'closed');
  const [caseId, setCaseId] = useState(active[0]?._id);
  const [form, setForm] = useState({ month: prevMonth(), businessOperating: true, educationContinuing: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const c = cases.data.find((x) => x._id === caseId);

  if (!active.length) return <Empty title="No active plan">Monthly updates are needed only while your plan is active.</Empty>;
  const isBiz = ['QH', 'TR'].includes(c?.scheme);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const updated = await api(`/portal/cases/${caseId}/monthly`, { method: 'POST', body: form });
      cases.setData(cases.data.map((x) => (x._id === caseId ? updated : x)));
      toast(`Update for ${monthLabel(form.month)} sent to your counsellor`);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const P = { form, setForm };
  const b = c?.baseline || {};

  return (
    <div className="fam-stack">
      {active.length > 1 && (
        <div className="field">
          <label htmlFor="case">Plan</label>
          <select id="case" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {active.map((x) => (
              <option key={x._id} value={x._id}>
                {SCHEMES[x.scheme]} ({x.caseNo})
              </option>
            ))}
          </select>
        </div>
      )}
      <form className="fam-card" onSubmit={submit}>
        <header>
          <h2>Monthly update</h2>
          <p className="small">Approximate numbers are fine. They help your counsellor see what is working.</p>
        </header>
        <div className="grid-form one">
          <Field label="Month" name="month" type="month" required {...P} />
          {isBiz && <Field label="Total sales this month (₹)" name="sales" type="number" {...P} />}
          {isBiz && <Field label="Profit after expenses (₹)" name="netProfit" type="number" {...P} />}
          <Field label="Total family income this month (₹)" name="householdIncome" type="number" {...P} />
          {isBiz && <Field label="Money customers still owe you (₹)" name="receivables" type="number" {...P} />}
          {isBiz && <Field label="New customers" name="newCustomers" type="number" {...P} />}
          <Field label="New people employed" name="jobsCreated" type="number" {...P} />
          {isBiz && <Field label="The business is running" name="businessOperating" type="checkbox" {...P} />}
          <Field label="Children are continuing school / college" name="educationContinuing" type="checkbox" {...P} />
          <Field label="Any difficulty this month?" name="challenges" type="textarea" rows={3} {...P} />
        </div>
        {err && <p className="form-error">{err}</p>}
        <button className="btn lg block" disabled={busy}>
          {busy ? 'Sending…' : 'Send update'}
        </button>
      </form>

      {c?.monthlyUpdates?.length > 0 && (
        <article className="fam-card">
          <header>
            <h2>Your progress</h2>
            {b.householdIncome != null && <p className="small">Before support, family income was {inr(b.householdIncome)} a month.</p>}
          </header>
          <ul className="prog-list">
            {c.monthlyUpdates.map((u) => (
              <li key={u._id}>
                <span>{monthLabel(u.month)}</span>
                <span>
                  {isBiz && u.sales != null && <>Sales {inr(u.sales)}. </>}
                  {u.householdIncome != null && (
                    <>
                      Income <strong className={b.householdIncome != null ? (u.householdIncome >= b.householdIncome ? 'tx-good' : 'tx-medium') : ''}>{inr(u.householdIncome)}</strong>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}
