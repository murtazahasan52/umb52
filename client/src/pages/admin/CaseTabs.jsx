import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, fileUrl } from '../../api';
import { canSanction } from '../../auth';
import { Field, Chips, FormModal, useLoad, useToast, Empty, StageBadge } from '../../ui';
import { SCHEMES, INTERVENTIONS, SEGMENTS, TRAINING, VISIT_TYPES, inr, inrShort, date, dateInput, monthLabel, prevMonth, num } from '../../lib';

const useStaff = (c) => useLoad(() => api(`/users/staff?mauze=${c.mauze?._id}`), [c.mauze?._id]);
const staffOptions = (s) => Object.fromEntries((s.data || []).map((x) => [x._id, `${x.name}${x.designation ? ` (${x.designation})` : ''}`]));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

function Section({ title, action, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ======================================================= PLAN
export function PlanTab({ c, act }) {
  const [edit, setEdit] = useState(false);
  const [login, setLogin] = useState(false);
  const staff = useStaff(c);
  const b = c.baseline || {};
  return (
    <>
      <Section
        title="Upliftment plan"
        action={
          <button className="btn ghost sm" onClick={() => setEdit(true)}>
            Edit plan
          </button>
        }
      >
        <dl className="kv wide">
          <dt>Documented need</dt>
          <dd>{c.need || <span className="tx-medium">Not recorded</span>}</dd>
          <dt>Interventions</dt>
          <dd>{c.interventions?.length ? c.interventions.map((i) => INTERVENTIONS[i]).join(', ') : <span className="tx-medium">None agreed</span>}</dd>
          <dt>Plan details</dt>
          <dd className="pre">{c.planDetails || '—'}</dd>
          <dt>Target outcome</dt>
          <dd>
            {c.targetOutcome || '—'} {c.targetDate && <span className="muted">by {date(c.targetDate)}</span>}
          </dd>
          <dt>Counsellor / mentor</dt>
          <dd>
            {c.counsellor?.name || <span className="tx-medium">Not assigned</span>} / {c.mentor?.name || '—'}
          </dd>
          <dt>Next review</dt>
          <dd>{c.reviewDate ? date(c.reviewDate) : <span className="tx-medium">Not set</span>}</dd>
          <dt>Segment</dt>
          <dd>{SEGMENTS[c.segment] || '—'}</dd>
          <dt>Scheme match</dt>
          <dd>
            {SCHEMES[c.scheme]}. {c.matchingNotes}
          </dd>
          <dt>Terms explained</dt>
          <dd>{c.termsExplained ? `Yes, ${date(c.termsExplainedAt)}` : <span className="tx-medium">Not yet</span>}</dd>
          {c.previousCases?.length > 0 && (
            <>
              <dt>Repeat application</dt>
              <dd>{c.repeatReason ? { growth: 'Genuine growth need', distress: 'Recurring financial distress', other: 'Other' }[c.repeatReason] : <span className="tx-medium">Not yet classified</span>}</dd>
            </>
          )}
        </dl>
      </Section>

      <div className="cols-2">
        <Section title="Baseline before support">
          <dl className="kv">
            <dt>Monthly sales</dt>
            <dd>{inr(b.monthlySales)}</dd>
            <dt>Net profit</dt>
            <dd>{inr(b.netProfit)}</dd>
            <dt>Household income</dt>
            <dd>{inr(b.householdIncome)}</dd>
            <dt>Employees</dt>
            <dd>{num(b.employees)}</dd>
            <dt>Debts</dt>
            <dd>{inr(b.debts)}</dd>
            <dt>Recorded</dt>
            <dd>{date(b.recordedAt)}</dd>
          </dl>
        </Section>
        <Section
          title="Family app"
          action={
            <button className="btn ghost sm" onClick={() => setLogin(true)}>
              {c.beneficiaryUser ? 'Reset password' : 'Issue login'}
            </button>
          }
        >
          {c.beneficiaryUser ? (
            <p>
              The family logs in with <strong>{c.beneficiaryUser.mobile}</strong> to see their plan, installments and trainings, and to send monthly updates.
            </p>
          ) : (
            <p className="muted">No app login yet. Issue one so the family can send monthly progress from their phone.</p>
          )}
          {c.successStory && <p className="gold-note">Marked as a success story that could be scaled.</p>}
        </Section>
      </div>

      {edit && (
        <FormModal
          wide
          title="Edit plan"
          initial={{
            ...c,
            counsellor: c.counsellor?._id,
            mentor: c.mentor?._id,
            reviewDate: dateInput(c.reviewDate),
            targetDate: dateInput(c.targetDate),
          }}
          onClose={() => setEdit(false)}
          onSubmit={(v) =>
            act(
              '',
              'PUT',
              {
                need: v.need,
                interventions: v.interventions,
                planDetails: v.planDetails,
                targetOutcome: v.targetOutcome,
                targetDate: v.targetDate || null,
                reviewDate: v.reviewDate || null,
                counsellor: v.counsellor || null,
                mentor: v.mentor || null,
                segment: v.segment,
                termsExplained: v.termsExplained,
                matchingNotes: v.matchingNotes,
                beneficiaryName: v.beneficiaryName,
                beneficiaryMobile: v.beneficiaryMobile,
                amountApplied: v.amountApplied,
                repeatReason: v.repeatReason,
                successStory: v.successStory,
                baseline: v.baseline,
              },
              'Plan saved'
            )
          }
        >
          {(form, setForm) => {
            const P = { form, setForm };
            return (
              <>
                <Field label="Beneficiary name" name="beneficiaryName" {...P} />
                <Field label="Beneficiary mobile" name="beneficiaryMobile" {...P} />
                <Field label="Documented need" name="need" type="textarea" rows={2} span={2} {...P} />
                <Chips label="Agreed interventions" name="interventions" options={INTERVENTIONS} {...P} />
                <Field label="Plan details" name="planDetails" type="textarea" span={2} {...P} />
                <Field label="Target outcome" name="targetOutcome" span={2} {...P} />
                <Field label="Target date" name="targetDate" type="date" {...P} />
                <Field label="Next review date" name="reviewDate" type="date" {...P} />
                <Field label="Counsellor" name="counsellor" type="select" options={staffOptions(staff)} {...P} />
                <Field label="Mentor" name="mentor" type="select" options={staffOptions(staff)} {...P} />
                <Field label="Segment" name="segment" type="select" options={SEGMENTS} {...P} />
                {c.scheme === 'QH' && <Field label="Amount requested (₹)" name="amountApplied" type="number" {...P} />}
                <Field label="Why this scheme suits the family" name="matchingNotes" span={2} {...P} />
                {c.previousCases?.length > 0 && (
                  <Field label="Repeat application is" name="repeatReason" type="select" options={{ growth: 'A genuine growth need', distress: 'Recurring financial distress', other: 'Other' }} {...P} />
                )}
                <Field label="Baseline sales (₹)" name="baseline.monthlySales" type="number" {...P} />
                <Field label="Baseline net profit (₹)" name="baseline.netProfit" type="number" {...P} />
                <Field label="Baseline household income (₹)" name="baseline.householdIncome" type="number" {...P} />
                <Field label="Baseline employees" name="baseline.employees" type="number" {...P} />
                <Field label="Terms, obligations and expected outcomes explained" name="termsExplained" type="checkbox" span={2} {...P} />
                <Field label="Success story that could be scaled" name="successStory" type="checkbox" span={2} {...P} />
              </>
            );
          }}
        </FormModal>
      )}
      {login && (
        <FormModal
          title="Family app login"
          initial={{ mobile: c.beneficiaryMobile }}
          submitLabel="Save login"
          onClose={() => setLogin(false)}
          onSubmit={(v) => act('/beneficiary-login', 'POST', v, 'Login saved. Share the password with the family privately.')}
        >
          {(form, setForm) => (
            <>
              <Field label="Mobile (login)" name="mobile" type="tel" required form={form} setForm={setForm} />
              <Field label="Password" name="password" required form={form} setForm={setForm} hint="At least 6 characters" />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

// ======================================================= FEASIBILITY (Checkpoint 4)
export function FeasibilityTab({ c, act, user }) {
  const [form, setForm] = useState({ ...c.feasibility });
  const [busy, setBusy] = useState(false);
  const [decide, setDecide] = useState(false);
  const fz = c.feasibility || {};
  const P = { form, setForm };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await act('/feasibility', 'PUT', form, 'Feasibility saved');
    } finally {
      setBusy(false);
    }
  };
  const decided = fz.decision && fz.decision !== 'pending';
  return (
    <>
      {decided ? (
        <div className={`decision d-${fz.decision}`}>
          <strong>
            {{ approved: 'Approved', modified: 'Approved with modification', rejected: 'Rejected' }[fz.decision]} by {fz.decidedBy?.name} on {date(fz.decidedAt)}
          </strong>
          <p>{fz.decisionReason}</p>
          {fz.decision !== 'rejected' && (
            <p>
              Sanctioned {inr(c.amountSanctioned)} over {c.tenureMonths} months, installment {inr(c.installmentAmount)}.
            </p>
          )}
        </div>
      ) : (
        canSanction(user) &&
        fz.assessedAt && (
          <div className="decision d-pending">
            <strong>Awaiting the review committee’s decision</strong>
            <p>Record approval, modification or rejection with reasons. Sanction authority remains as per HQ policy.</p>
            <button className="btn sm" onClick={() => setDecide(true)}>
              Record decision
            </button>
          </div>
        )
      )}

      <form className="panel" onSubmit={save}>
        <div className="panel-head">
          <h2>Feasibility before sanction</h2>
          {fz.assessedAt && (
            <span className="muted small">
              Last assessed {date(fz.assessedAt)} by {fz.assessedBy?.name}
            </span>
          )}
        </div>
        <fieldset disabled={decided} className="plain-fieldset">
          <div className="grid-form three">
            <Field label="Purpose of assistance" name="purpose" type="textarea" rows={2} span={3} {...P} />
            <Field label="Investment type" name="investmentType" type="select" options={{ working_capital: 'Working capital', fixed_asset: 'Fixed asset', mixed: 'Mixed' }} {...P} />
            <Field label="Gross margin %" name="grossMarginPct" type="number" {...P} />
            <Field label="Existing liabilities (₹)" name="existingLiabilities" type="number" {...P} />
            <Field label="Market demand" name="marketDemand" type="textarea" rows={2} span={3} {...P} />
            <Field label="Projected monthly sales (₹)" name="projectedMonthlySales" type="number" {...P} />
            <Field label="Projected monthly profit (₹)" name="projectedMonthlyProfit" type="number" {...P} />
            <Field label="Monthly repayment capacity (₹)" name="monthlyRepaymentCapacity" type="number" {...P} />
            <Field label="Proposed tenure (months)" name="proposedTenureMonths" type="number" {...P} />
            <Field label="Security as per policy" name="securityOffered" span={2} {...P} />
            <Field label="Business & financial documents verified" name="documentsVerified" type="checkbox" {...P} />
            <Field label="Phased disbursement" name="phasedDisbursement" type="checkbox" {...P} />
            <div />
            <Field label="Document notes" name="documentsNotes" span={3} {...P} />
            <Field label="Recommendation" name="recommendation" type="textarea" rows={2} span={3} {...P} />
          </div>
          {form.monthlyRepaymentCapacity > 0 && c.amountApplied > 0 && (
            <p className="calc">
              At {inr(form.monthlyRepaymentCapacity)} per month, {inr(c.amountApplied)} would take about {Math.ceil(c.amountApplied / form.monthlyRepaymentCapacity)} months to repay
              {form.proposedTenureMonths ? ` (proposed ${form.proposedTenureMonths})` : ''}.
            </p>
          )}
        </fieldset>
        {!decided && (
          <div className="form-actions">
            <button className="btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save assessment'}
            </button>
          </div>
        )}
      </form>

      {decide && (
        <FormModal
          title="Review committee decision"
          initial={{ amountSanctioned: c.amountApplied, tenureMonths: fz.proposedTenureMonths }}
          submitLabel="Record decision"
          onClose={() => setDecide(false)}
          onSubmit={(v) => act('/decision', 'POST', v, 'Decision recorded')}
        >
          {(form2, set2) => (
            <>
              <Field label="Decision" name="decision" type="select" required options={{ approved: 'Approve', modified: 'Approve with modification', rejected: 'Reject' }} form={form2} setForm={set2} span={2} />
              {form2.decision !== 'rejected' && (
                <>
                  <Field label="Amount sanctioned (₹)" name="amountSanctioned" type="number" form={form2} setForm={set2} />
                  <Field label="Tenure (months)" name="tenureMonths" type="number" form={form2} setForm={set2} />
                </>
              )}
              <Field label="Reason for the decision" name="decisionReason" type="textarea" required span={2} form={form2} setForm={set2} />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

// ======================================================= MONEY
export function MoneyTab({ c, act, user }) {
  const [add, setAdd] = useState(false);
  const [sched, setSched] = useState(false);
  const [pay, setPay] = useState(null);
  const f = c.financials;
  const sanction = canSanction(user);
  const now = new Date();
  return (
    <>
      <Section
        title="Disbursements"
        action={
          sanction &&
          c.amountSanctioned > f.disbursed && (
            <button className="btn sm" onClick={() => setAdd(true)}>
              Record disbursement
            </button>
          )
        }
      >
        {c.disbursements.length === 0 ? (
          <p className="muted">{c.amountSanctioned ? `Nothing disbursed yet against ${inr(c.amountSanctioned)} sanctioned.` : 'Nothing sanctioned yet.'}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tranche</th>
                  <th>Date</th>
                  <th className="r">Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {c.disbursements.map((d) => (
                  <tr key={d._id}>
                    <td>{d.tranche}</td>
                    <td>{date(d.date)}</td>
                    <td className="r">{inr(d.amount)}</td>
                    <td>{d.mode}</td>
                    <td>{d.reference}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total of {inr(c.amountSanctioned)} sanctioned</td>
                  <td className="r">{inr(f.disbursed)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {c.scheme === 'QH' && (
        <Section
          title="Repayment schedule"
          action={
            sanction &&
            f.disbursed > 0 &&
            !c.repayments.some((r) => r.paidAmount > 0) && (
              <button className="btn ghost sm" onClick={() => setSched(true)}>
                {c.repayments.length ? 'Rebuild schedule' : 'Create schedule'}
              </button>
            )
          }
        >
          {c.repayments.length === 0 ? (
            <p className="muted">No schedule yet.</p>
          ) : (
            <>
              <p className="small">
                Repaid {inr(f.repaid)} of {inr(f.totalRepayable)}. Due to date {inr(f.due)}.{' '}
                {f.overdueCount > 0 && (
                  <span className="tx-high">
                    {f.overdueCount} overdue ({inr(f.overdueAmount)})
                  </span>
                )}
              </p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Due</th>
                      <th className="r">Amount</th>
                      <th className="r">Paid</th>
                      <th>Paid on</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {c.repayments.map((r) => {
                      const paid = (r.paidAmount || 0) >= r.amount;
                      const late = !paid && new Date(r.dueDate) < now;
                      const nextDue = c.repayments.find((x) => (x.paidAmount || 0) < x.amount && new Date(x.dueDate) >= now);
                      return (
                        <tr key={r._id} className={late ? 'row-late' : ''}>
                          <td>{r.no}</td>
                          <td>{date(r.dueDate)}</td>
                          <td className="r">{inr(r.amount)}</td>
                          <td className="r">{r.paidAmount ? inr(r.paidAmount) : '—'}</td>
                          <td>{r.paidDate ? date(r.paidDate) : late ? <span className="tx-high">Overdue</span> : '—'}</td>
                          <td className="r">
                            {!paid && (late || nextDue?._id === r._id) && (
                              <button className="link-btn" onClick={() => setPay(r)}>
                                Record payment
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="panel-foot">Delayed repayments are addressed early and compassionately, through counselling and a recovery plan.</p>
        </Section>
      )}

      {add && (
        <FormModal
          title="Record disbursement"
          initial={{ date: dateInput(new Date()), amount: c.amountSanctioned - f.disbursed }}
          onClose={() => setAdd(false)}
          onSubmit={(v) => act('/disbursements', 'POST', v, 'Disbursement recorded')}
        >
          {(form, setForm) => (
            <>
              <Field label="Amount (₹)" name="amount" type="number" required form={form} setForm={setForm} hint={`Remaining: ${inr(c.amountSanctioned - f.disbursed)}`} />
              <Field label="Date" name="date" type="date" required form={form} setForm={setForm} />
              <Field label="Mode" name="mode" form={form} setForm={setForm} placeholder="Bank transfer, cheque, direct to vendor" />
              <Field label="Reference" name="reference" form={form} setForm={setForm} />
              <Field label="Note" name="note" span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
      {sched && (
        <FormModal
          title="Repayment schedule"
          initial={{ months: c.tenureMonths, amount: c.installmentAmount }}
          submitLabel="Create schedule"
          onClose={() => setSched(false)}
          onSubmit={(v) => act('/repayments/schedule', 'POST', v, 'Schedule created')}
        >
          {(form, setForm) => (
            <>
              <Field label="First installment date" name="startDate" type="date" required form={form} setForm={setForm} />
              <Field label="Number of months" name="months" type="number" required form={form} setForm={setForm} />
              <Field label="Monthly installment (₹)" name="amount" type="number" form={form} setForm={setForm} hint="Leave blank to divide equally" />
            </>
          )}
        </FormModal>
      )}
      {pay && (
        <FormModal
          title={`Payment for installment ${pay.no}`}
          initial={{ paidAmount: pay.amount, paidDate: dateInput(new Date()) }}
          onClose={() => setPay(null)}
          onSubmit={(v) => act(`/repayments/${pay._id}/pay`, 'POST', v, 'Payment recorded')}
        >
          {(form, setForm) => (
            <>
              <Field label="Amount paid (₹)" name="paidAmount" type="number" required form={form} setForm={setForm} />
              <Field label="Paid on" name="paidDate" type="date" required form={form} setForm={setForm} />
              <Field label="Reference" name="reference" form={form} setForm={setForm} />
              <Field label="Note" name="note" form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </>
  );
}

// ======================================================= UTILIZATION (Checkpoint 5)
function Uploader({ form, setForm }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const onFiles = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    setBusy(true);
    try {
      const r = await api('/uploads', { method: 'POST', form: fd });
      setForm((x) => ({ ...x, evidence: [...(x.evidence || []), ...r.urls] }));
    } catch (x) {
      toast(x.message, 'err');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <div className="field span-2">
      <label htmlFor="evidence">Evidence: invoices, payment proof, photos</label>
      <input id="evidence" type="file" multiple accept="image/*,.pdf" onChange={onFiles} disabled={busy} />
      {busy && <small className="hint">Uploading…</small>}
      {(form.evidence || []).length > 0 && (
        <ul className="files">
          {form.evidence.map((u) => (
            <li key={u}>
              <a href={fileUrl(u)} target="_blank" rel="noreferrer">
                {u.split('/').pop()}
              </a>
              <button type="button" className="link-btn danger" onClick={() => setForm((x) => ({ ...x, evidence: x.evidence.filter((y) => y !== u) }))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UtilizationTab({ c, act }) {
  const [add, setAdd] = useState(false);
  const f = c.financials;
  return (
    <Section
      title="How the funds were used"
      action={
        <button className="btn sm" onClick={() => setAdd(true)}>
          Add utilization
        </button>
      }
    >
      <p className="small">
        Disbursed {inr(f.disbursed)}. Recorded {inr(f.utilized)}. Verified for approved purpose {inr(f.verified)} ({pct(f.verified, f.disbursed)}).
        {f.diverted > 0 && <span className="tx-high"> {inr(f.diverted)} used for unapproved purposes.</span>}
      </p>
      {c.utilizations.length === 0 ? (
        <Empty title="No utilization recorded">Within 30 days of disbursement, confirm receipt and record purchases with invoices or a site visit.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th className="r">Amount</th>
                <th>Evidence</th>
                <th>Resulting asset</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {c.utilizations.map((u) => (
                <tr key={u._id} className={u.approvedPurpose === false ? 'row-late' : ''}>
                  <td className="nowrap">{date(u.date)}</td>
                  <td>
                    {u.item}
                    {u.vendor && <small className="block muted">{u.vendor} {u.invoiceNo && `#${u.invoiceNo}`}</small>}
                  </td>
                  <td className="r">{inr(u.amount)}</td>
                  <td>
                    {(u.evidence || []).map((e, i) => (
                      <a key={e} href={fileUrl(e)} target="_blank" rel="noreferrer" className="file-link">
                        File {i + 1}
                      </a>
                    ))}
                    {u.siteVisit && <small className="block">Site visit done</small>}
                  </td>
                  <td>{u.resultingAsset || '—'}</td>
                  <td>
                    {u.approvedPurpose === false ? (
                      <span className="tx-high">Unapproved purpose</span>
                    ) : u.verified ? (
                      <span className="tx-good">Verified {date(u.verifiedAt)}</span>
                    ) : (
                      <span className="row-actions">
                        <button className="link-btn" onClick={() => act(`/utilizations/${u._id}/verify`, 'POST', { verified: true, approvedPurpose: true }, 'Verified')}>
                          Verify
                        </button>
                        <button
                          className="link-btn danger"
                          onClick={() => window.confirm('Flag this spend as used for an unapproved purpose? The case will be raised for immediate intervention.') && act(`/utilizations/${u._id}/verify`, 'POST', { verified: true, approvedPurpose: false }, 'Flagged as unapproved use')}
                        >
                          Flag diversion
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {add && (
        <FormModal title="Add utilization" initial={{ date: dateInput(new Date()), approvedPurpose: true, evidence: [] }} onClose={() => setAdd(false)} onSubmit={(v) => act('/utilizations', 'POST', v, 'Utilization added')}>
          {(form, setForm) => (
            <>
              <Field label="Date" name="date" type="date" form={form} setForm={setForm} />
              <Field label="Amount (₹)" name="amount" type="number" required form={form} setForm={setForm} />
              <Field label="What was bought or paid for" name="item" required span={2} form={form} setForm={setForm} placeholder="Machinery, stock, equipment, fees…" />
              <Field label="Vendor" name="vendor" form={form} setForm={setForm} />
              <Field label="Invoice no." name="invoiceNo" form={form} setForm={setForm} />
              <Field label="Productive asset, stock or activity created" name="resultingAsset" span={2} form={form} setForm={setForm} />
              <Uploader form={form} setForm={setForm} />
              <Field label="Site visit done" name="siteVisit" type="checkbox" form={form} setForm={setForm} />
              <Field label="Matches the approved purpose" name="approvedPurpose" type="checkbox" form={form} setForm={setForm} />
              <Field label="Remarks" name="remarks" span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </Section>
  );
}

// ======================================================= MONTHLY PROGRESS (Checkpoint 6)
const MONTHLY_FIELDS = (form, setForm, isBiz) => {
  const P = { form, setForm };
  return (
    <>
      <Field label="Month" name="month" type="month" required {...P} />
      <Field label="Household income (₹)" name="householdIncome" type="number" {...P} />
      {isBiz && (
        <>
          <Field label="Sales (₹)" name="sales" type="number" {...P} />
          <Field label="Net profit (₹)" name="netProfit" type="number" {...P} />
          <Field label="Gross margin %" name="grossMarginPct" type="number" {...P} />
          <Field label="Working capital (₹)" name="workingCapital" type="number" {...P} />
          <Field label="Stock value (₹)" name="stockValue" type="number" {...P} />
          <Field label="Stock movement" name="stockMovement" type="select" options={{ fast: 'Fast', normal: 'Normal', slow: 'Slow', not_moving: 'Not moving' }} {...P} />
          <Field label="Receivables (₹)" name="receivables" type="number" {...P} />
          <Field label="Other debt obligations (₹)" name="otherDebtObligations" type="number" {...P} />
          <Field label="New customers" name="newCustomers" type="number" {...P} />
        </>
      )}
      <Field label="Jobs created" name="jobsCreated" type="number" {...P} />
      <Field label="Family members employed" name="familyMembersEmployed" type="number" {...P} />
      {isBiz && <Field label="Business operating" name="businessOperating" type="checkbox" {...P} />}
      <Field label="Children’s education continuing" name="educationContinuing" type="checkbox" {...P} />
      <Field label="Challenges" name="challenges" type="textarea" rows={2} span={2} {...P} />
      <Field label="Counsellor notes" name="notes" type="textarea" rows={2} span={2} {...P} />
      <Field label="Reviewed by counsellor" name="reviewed" type="checkbox" {...P} />
    </>
  );
};

export function ProgressTab({ c, act }) {
  const [edit, setEdit] = useState(null);
  const isBiz = ['QH', 'TR'].includes(c.scheme);
  const ups = [...c.monthlyUpdates].sort((a, b) => (a.month < b.month ? -1 : 1));
  const b = c.baseline || {};
  return (
    <>
      {ups.length > 1 && (
        <Section title="Against the baseline">
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={ups} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E2EAE5" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="l" tickFormatter={inrShort} tick={{ fontSize: 12 }} width={64} />
                {isBiz && <YAxis yAxisId="s" orientation="right" tickFormatter={inrShort} tick={{ fontSize: 12, fill: '#0F6B4F' }} width={64} />}
                <Tooltip formatter={(v) => inr(v)} labelFormatter={monthLabel} />
                <Legend />
                {isBiz && <Line yAxisId="s" dataKey="sales" name="Sales (right axis)" stroke="#0F6B4F" strokeWidth={2} strokeOpacity={0.55} dot={false} />}
                {isBiz && <Line yAxisId="l" dataKey="netProfit" name="Net profit" stroke="#A9822E" strokeWidth={2.5} dot={{ r: 3 }} />}
                <Line yAxisId="l" dataKey="householdIncome" name="Household income" stroke="#4E6E86" strokeWidth={2.5} dot={{ r: 3 }} />
                {isBiz && b.netProfit != null && <ReferenceLine yAxisId="l" y={b.netProfit} stroke="#A9822E" strokeDasharray="4 4" label={{ value: 'Baseline profit', fontSize: 11, fill: '#7a6223', position: 'insideTopLeft' }} />}
                {b.householdIncome != null && <ReferenceLine yAxisId="l" y={b.householdIncome} stroke="#4E6E86" strokeDasharray="4 4" label={{ value: 'Baseline income', fontSize: 11, fill: '#4E6E86', position: 'insideBottomLeft' }} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
      <Section
        title="Monthly updates"
        action={
          <button className="btn sm" onClick={() => setEdit({ month: prevMonth(), businessOperating: true, educationContinuing: true })}>
            Add update
          </button>
        }
      >
        {ups.length === 0 ? (
          <Empty title="No monthly updates yet">The counsellor adds them here, or the family sends them from the app.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table hover">
              <thead>
                <tr>
                  <th>Month</th>
                  {isBiz && <th className="r">Sales</th>}
                  {isBiz && <th className="r">Net profit</th>}
                  <th className="r">Household income</th>
                  {isBiz && <th className="r">Receivables</th>}
                  {isBiz && <th>Stock</th>}
                  <th className="r">Jobs</th>
                  <th>From</th>
                  <th>Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {[...ups].reverse().map((u) => (
                  <tr key={u._id} onClick={() => setEdit(u)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEdit(u)}>
                    <td>
                      {monthLabel(u.month)}
                      {u.businessOperating === false && <small className="block tx-high">Business not operating</small>}
                    </td>
                    {isBiz && <td className="r">{inr(u.sales)}</td>}
                    {isBiz && <td className="r">{inr(u.netProfit)}</td>}
                    <td className="r">{inr(u.householdIncome)}</td>
                    {isBiz && <td className="r">{inr(u.receivables)}</td>}
                    {isBiz && <td>{{ fast: 'Fast', normal: 'Normal', slow: 'Slow', not_moving: 'Not moving' }[u.stockMovement] || '—'}</td>}
                    <td className="r">{num(u.jobsCreated)}</td>
                    <td>{u.source === 'beneficiary' ? 'Family app' : 'Counsellor'}</td>
                    <td>{u.reviewed ? 'Yes' : <span className="tx-medium">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {edit && (
        <FormModal
          wide
          title={edit._id ? `Update for ${monthLabel(edit.month)}` : 'Add monthly update'}
          initial={edit}
          onClose={() => setEdit(null)}
          onSubmit={(v) => (edit._id ? act(`/monthlyUpdates/${edit._id}`, 'PUT', v, 'Update saved') : act('/monthlyUpdates', 'POST', v, 'Update added'))}
        >
          {(form, setForm) => MONTHLY_FIELDS(form, setForm, isBiz)}
        </FormModal>
      )}
    </>
  );
}

// ======================================================= VISITS
export function VisitsTab({ c, act }) {
  const [add, setAdd] = useState(false);
  const visits = [...c.visits].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <Section
      title="Visits and reviews"
      action={
        <button className="btn sm" onClick={() => setAdd(true)}>
          Record visit
        </button>
      }
    >
      {visits.length === 0 ? (
        <Empty title="No visits yet">Quarterly site visits with a financial review and corrective action keep a case on track.</Empty>
      ) : (
        <ul className="timeline">
          {visits.map((v) => (
            <li key={v._id}>
              <div className="tl-head">
                <strong>{VISIT_TYPES[v.type]}</strong>
                <span className="muted">{date(v.date)}</span>
              </div>
              {v.observations && <p>{v.observations}</p>}
              {v.financialReview && <p className="muted">Financial review: {v.financialReview}</p>}
              {v.correctiveAction && <p>Action: {v.correctiveAction}</p>}
              {v.nextReviewDate && <p className="small muted">Next review {date(v.nextReviewDate)}</p>}
            </li>
          ))}
        </ul>
      )}
      {add && (
        <FormModal title="Record visit or review" initial={{ date: dateInput(new Date()), type: 'site_visit' }} onClose={() => setAdd(false)} onSubmit={(v) => act('/visits', 'POST', v, 'Visit recorded')}>
          {(form, setForm) => (
            <>
              <Field label="Type" name="type" type="select" options={VISIT_TYPES} form={form} setForm={setForm} />
              <Field label="Date" name="date" type="date" form={form} setForm={setForm} />
              <Field label="Observations" name="observations" type="textarea" span={2} form={form} setForm={setForm} />
              <Field label="Financial review" name="financialReview" type="textarea" rows={2} span={2} form={form} setForm={setForm} />
              <Field label="Corrective action" name="correctiveAction" type="textarea" rows={2} span={2} form={form} setForm={setForm} />
              <Field label="Next review date" name="nextReviewDate" type="date" form={form} setForm={setForm} hint="Updates the case review date" />
            </>
          )}
        </FormModal>
      )}
    </Section>
  );
}

// ======================================================= TRAINING (Checkpoint 7)
export function TrainingTab({ c, act }) {
  const [edit, setEdit] = useState(null);
  return (
    <Section
      title="Capability and independence"
      action={
        <button className="btn sm" onClick={() => setEdit({ status: 'planned', category: 'accounting' })}>
          Add training or mentoring
        </button>
      }
    >
      {c.trainings.length === 0 ? (
        <Empty title="No training planned">Accounts, pricing, stock, GST and Udyam, digital payments and mentoring help families grow beyond dependence on support.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Programme</th>
                <th>Area</th>
                <th>Planned</th>
                <th>Status</th>
                <th>Applied in practice</th>
              </tr>
            </thead>
            <tbody>
              {c.trainings.map((t) => (
                <tr key={t._id} onClick={() => setEdit(t)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEdit(t)}>
                  <td>
                    {t.program}
                    {t.provider && <small className="block muted">{t.provider}</small>}
                  </td>
                  <td>{TRAINING[t.category]}</td>
                  <td>{date(t.plannedDate)}</td>
                  <td>{{ planned: 'Planned', ongoing: 'Ongoing', completed: `Completed ${date(t.completedDate)}`, dropped: 'Dropped' }[t.status]}</td>
                  <td>{t.status === 'completed' ? t.applied ? 'Yes' : <span className="tx-medium">Not yet</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <FormModal
          title={edit._id ? 'Update training' : 'Add training or mentoring'}
          initial={{ ...edit, plannedDate: dateInput(edit.plannedDate), completedDate: dateInput(edit.completedDate) }}
          onClose={() => setEdit(null)}
          onSubmit={(v) => (edit._id ? act(`/trainings/${edit._id}`, 'PUT', v, 'Training updated') : act('/trainings', 'POST', v, 'Training added'))}
        >
          {(form, setForm) => (
            <>
              <Field label="Programme" name="program" required span={2} form={form} setForm={setForm} />
              <Field label="Area" name="category" type="select" options={TRAINING} form={form} setForm={setForm} />
              <Field label="Provider / mentor" name="provider" form={form} setForm={setForm} />
              <Field label="Planned date" name="plannedDate" type="date" form={form} setForm={setForm} />
              <Field label="Status" name="status" type="select" options={{ planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed', dropped: 'Dropped' }} form={form} setForm={setForm} />
              <Field label="Learning is being applied in the business" name="applied" type="checkbox" span={2} form={form} setForm={setForm} />
              <Field label="Notes" name="notes" type="textarea" rows={2} span={2} form={form} setForm={setForm} />
            </>
          )}
        </FormModal>
      )}
    </Section>
  );
}

// ======================================================= ALERTS / RECOVERY PLANS
export function AlertsTab({ c, act }) {
  const [edit, setEdit] = useState(null);
  const staff = useStaff(c);
  const list = [...c.alerts].sort((a, b) => Number(a.resolved) - Number(b.resolved));
  return (
    <Section
      title="Alerts and recovery plans"
      action={
        <button className="btn sm" onClick={() => setEdit({ level: 'medium', mentor: c.mentor?._id })}>
          Raise alert
        </button>
      }
    >
      <p className="small muted">Contact families discreetly. Monitoring should be supportive, respectful and never stigmatising.</p>
      {list.length === 0 ? (
        <p className="muted">No alerts raised by the committee.</p>
      ) : (
        <ul className="timeline">
          {list.map((a) => (
            <li key={a._id} className={a.resolved ? 'resolved' : `tl-${a.level}`}>
              <div className="tl-head">
                <strong>{a.reason}</strong>
                <span className="muted">
                  {a.level === 'high' ? 'High' : 'Medium'}, {date(a.createdAt)}
                </span>
              </div>
              {a.action && <p>Recovery plan: {a.action}</p>}
              <p className="small muted">
                {a.mentor ? `Responsible: ${a.mentor.name}. ` : ''}
                {a.reviewDate ? `Review ${date(a.reviewDate)}. ` : ''}
                {a.referredToCommittee ? 'Referred to the authorised committee.' : ''}
              </p>
              {a.resolved ? (
                <p className="tx-good small">
                  Resolved {date(a.resolvedAt)}: {a.resolution}
                </p>
              ) : (
                <button className="link-btn" onClick={() => setEdit({ ...a, mentor: a.mentor?._id, reviewDate: dateInput(a.reviewDate) })}>
                  Update or resolve
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {edit && (
        <FormModal
          title={edit._id ? 'Update alert' : 'Raise alert'}
          initial={edit}
          onClose={() => setEdit(null)}
          onSubmit={(v) => (edit._id ? act(`/alerts/${edit._id}`, 'PUT', v, v.resolved ? 'Alert resolved' : 'Alert updated') : act('/alerts', 'POST', v, 'Alert raised'))}
        >
          {(form, setForm) => (
            <>
              <Field label="Priority" name="level" type="select" options={{ high: 'High: immediate intervention', medium: 'Medium: corrective action' }} required form={form} setForm={setForm} span={2} />
              <Field label="What is the concern?" name="reason" required span={2} form={form} setForm={setForm} />
              <Field label="Written recovery plan" name="action" type="textarea" span={2} form={form} setForm={setForm} />
              <Field label="Responsible mentor" name="mentor" type="select" options={staffOptions(staff)} form={form} setForm={setForm} />
              <Field label="Review date" name="reviewDate" type="date" form={form} setForm={setForm} />
              <Field label="Referred to the authorised committee" name="referredToCommittee" type="checkbox" span={2} form={form} setForm={setForm} />
              {edit._id && (
                <>
                  <Field label="Resolved" name="resolved" type="checkbox" form={form} setForm={setForm} />
                  <Field label="Resolution" name="resolution" span={2} form={form} setForm={setForm} />
                </>
              )}
            </>
          )}
        </FormModal>
      )}
    </Section>
  );
}

// ======================================================= OUTCOMES (6 & 12 months)
const STABILITY = { worse: 'Worse', same: 'About the same', better: 'Better', much_better: 'Much better' };
const RELIANCE = { dependent: 'Still dependent on support', improving: 'Improving', independent: 'Independent' };

function OutcomeForm({ which, c, act }) {
  const o = c[`outcome${which}`] || {};
  const [form, setForm] = useState(o);
  const [busy, setBusy] = useState(false);
  const b = c.baseline || {};
  const P = { form, setForm };
  const delta = (now, base) => (now != null && now !== '' && base != null ? <small className={now >= base ? 'tx-good' : 'tx-high'}> {now >= base ? '+' : ''}{inr(now - base)} vs baseline</small> : null);
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await act(`/outcome/${which}`, 'PUT', form, `${which}-month outcome saved`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="panel-head">
        <h2>At {which} months</h2>
        {o.recordedAt && <span className="muted small">Recorded {date(o.recordedAt)}</span>}
      </div>
      <div className="grid-form">
        <div>
          <Field label="Household income (₹ / month)" name="householdIncome" type="number" {...P} />
          {delta(form.householdIncome, b.householdIncome)}
        </div>
        <div>
          <Field label="Net profit (₹ / month)" name="netProfit" type="number" {...P} />
          {delta(form.netProfit, b.netProfit)}
        </div>
        <Field label="Jobs / earning members" name="employment" type="number" {...P} />
        <Field label="Financial stability" name="financialStability" type="select" options={STABILITY} {...P} />
        <Field label="Self-reliance" name="selfReliance" type="select" options={RELIANCE} {...P} />
        <Field label="Education continuing" name="educationContinuity" type="checkbox" {...P} />
        <Field label="Notes" name="notes" type="textarea" rows={2} span={2} {...P} />
      </div>
      <div className="form-actions">
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save outcome'}
        </button>
      </div>
    </form>
  );
}

export function OutcomeTab({ c, act }) {
  return (
    <>
      <p className="small muted">Has the support produced a measurable benefit, and what action is needed next? Compare with the baseline of {inr(c.baseline?.householdIncome)} household income.</p>
      <div className="cols-2">
        <OutcomeForm which="6" c={c} act={act} />
        <OutcomeForm which="12" c={c} act={act} />
      </div>
    </>
  );
}

// ======================================================= HISTORY
export function HistoryTab({ c }) {
  return (
    <div className="cols-2">
      <Section title="Activity log">
        <ul className="log">
          {[...(c.log || [])].reverse().map((l, i) => (
            <li key={i}>
              <span className="muted small">{new Date(l.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span>
                {l.action}
                {l.byName && <span className="muted"> by {l.byName}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Other cases for this family">
        {c.history?.length ? (
          <ul className="plain-list">
            {c.history.map((h) => (
              <li key={h._id}>
                <Link to={`/admin/cases/${h._id}`}>{h.caseNo}</Link> {SCHEMES[h.scheme]}, <StageBadge stage={h.stage} /> {h.amountSanctioned ? inr(h.amountSanctioned) : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">This is the family’s first case.</p>
        )}
      </Section>
    </div>
  );
}
