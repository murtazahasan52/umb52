import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { Field, Chips, useLoad, useToast } from '../../ui';
import { SCHEMES, INTERVENTIONS, SEGMENTS, inr } from '../../lib';

const SCHEME_HELP = {
  QH: 'Interest-free financial assistance, subject to eligibility, feasibility, repayment capacity and policy.',
  TR: 'Business counselling, mentorship, formalization, market linkages and training.',
  SKILL: 'Vocational training, job placement, apprenticeships and career guidance.',
  WELFARE: 'Eligible housing, education, medical or personal upliftment needs.',
};

export default function CaseNew() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [hh, setHh] = useState(null);
  const [form, setForm] = useState({ interventions: [], termsExplained: false, baseline: {} });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const search = useLoad(() => (q.length >= 2 ? api(`/households?q=${encodeURIComponent(q)}&limit=8`) : Promise.resolve({ items: [] })), [q]);
  const staff = useLoad(() => (hh ? api(`/users/staff?mauze=${hh.mauze?._id || hh.mauze}`) : Promise.resolve([])), [hh?._id]);

  useEffect(() => {
    const id = sp.get('household');
    if (id) api(`/households/${id}`).then((r) => choose(r.household));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(h) {
    setHh(h);
    setForm((f) => ({
      ...f,
      beneficiaryName: h.headName,
      beneficiaryMobile: h.mobile,
      baseline: {
        monthlySales: h.business?.monthlyTurnover || '',
        netProfit: h.business?.monthlyNetIncome || '',
        householdIncome: h.monthlyHouseholdIncome || '',
        debts: h.debts?.total || '',
      },
    }));
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const c = await api('/cases', { method: 'POST', body: { ...form, household: hh._id } });
      toast(`Case ${c.caseNo} opened`);
      nav(`/admin/cases/${c._id}`, { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const staffOpts = Object.fromEntries((staff.data || []).map((s) => [s._id, `${s.name}${s.designation ? ` (${s.designation})` : ''}`]));
  const P = { form, setForm };

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Open a case</h1>
          <p className="sub">Checkpoints 2 and 3: an individual plan based on real needs, matched to the most suitable scheme.</p>
        </div>
      </div>

      {!hh ? (
        <section className="panel narrow-panel">
          <h2>Which household?</h2>
          <div className="field">
            <label htmlFor="hh-q">Search surveyed households</label>
            <input id="hh-q" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code, ITS or mobile" />
          </div>
          <ul className="pick-list">
            {(search.data?.items || []).map((h) => (
              <li key={h._id}>
                <button type="button" onClick={() => choose(h)}>
                  <strong>{h.headName}</strong>
                  <span className="muted">
                    {h.code}, {h.mauze?.name}, income {inr(h.monthlyHouseholdIncome)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {q.length >= 2 && search.data?.items?.length === 0 && <p className="muted">No household found. Add the household survey first.</p>}
        </section>
      ) : (
        <form onSubmit={submit} className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>
                {hh.headName} <small className="muted">{hh.code}</small>
              </h2>
              <button type="button" className="link-btn" onClick={() => setHh(null)}>
                Change household
              </button>
            </div>
            <div className="grid-form three">
              <Field label="Beneficiary name" name="beneficiaryName" required {...P} hint="The family member receiving support" />
              <Field label="Beneficiary mobile" name="beneficiaryMobile" type="tel" {...P} />
              <Field label="Segment" name="segment" type="select" options={SEGMENTS} {...P} />
            </div>
          </section>

          <section className="panel">
            <h2>Scheme</h2>
            <div className="scheme-pick" role="radiogroup">
              {Object.entries(SCHEMES).map(([k, l]) => (
                <label key={k} className={`scheme-opt ${form.scheme === k ? 'on' : ''}`}>
                  <input type="radio" name="scheme" value={k} checked={form.scheme === k} onChange={() => setForm((f) => ({ ...f, scheme: k }))} required />
                  <strong>{l}</strong>
                  <span>{SCHEME_HELP[k]}</span>
                </label>
              ))}
            </div>
            <div className="grid-form">
              <Field label="Why this scheme suits the family" name="matchingNotes" type="textarea" rows={2} span={2} {...P} />
              {form.scheme === 'QH' && <Field label="Amount requested (₹)" name="amountApplied" type="number" {...P} />}
              <Field label="Terms, obligations and expected outcomes explained to the applicant" name="termsExplained" type="checkbox" span={2} {...P} />
            </div>
          </section>

          <section className="panel">
            <h2>Upliftment plan</h2>
            <div className="grid-form">
              <Field label="Documented need" name="need" type="textarea" rows={2} span={2} required {...P} />
              <Chips label="Agreed interventions" name="interventions" options={INTERVENTIONS} {...P} />
              <Field label="Plan details" name="planDetails" type="textarea" rows={3} span={2} {...P} />
              <Field label="Outcome to achieve in 6–12 months" name="targetOutcome" span={2} {...P} placeholder="For example: raise monthly net profit by 25%" />
              <Field label="Target date" name="targetDate" type="date" {...P} />
              <Field label="First review date" name="reviewDate" type="date" required {...P} />
              <Field label="Responsible counsellor" name="counsellor" type="select" options={staffOpts} required {...P} />
              <Field label="Mentor" name="mentor" type="select" options={staffOpts} {...P} />
            </div>
          </section>

          <section className="panel">
            <h2>Baseline before support</h2>
            <p className="muted small">Pre-filled from the survey. Every later result is compared against these numbers.</p>
            <div className="grid-form three">
              <Field label="Monthly sales (₹)" name="baseline.monthlySales" type="number" {...P} />
              <Field label="Monthly net profit (₹)" name="baseline.netProfit" type="number" {...P} />
              <Field label="Household income (₹)" name="baseline.householdIncome" type="number" {...P} />
              <Field label="Employees" name="baseline.employees" type="number" {...P} />
              <Field label="Debts (₹)" name="baseline.debts" type="number" {...P} />
            </div>
          </section>

          {err && <p className="form-error">{err}</p>}
          <div className="form-actions sticky">
            <button type="button" className="btn ghost" onClick={() => nav(-1)}>
              Cancel
            </button>
            <button className="btn" disabled={busy}>
              {busy ? 'Opening…' : 'Open case'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
