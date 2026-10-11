import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Field } from '../../ui';
import { MPI_DIMENSIONS, MPI_INDICATORS, UMOOR, CHECKLIST, inr, dateInput } from '../../lib';

const blankExpert = { type: 'local', name: '', itsNo: '', mobile: '', expertise: '', dimension: '', indicator: '', solution: '' };
const blankAction = { indicator: '', plan: '', responsible: '', timeRequired: '', status: 'pending' };

export function initialMpi(c, user) {
  const m = c.mpi || {};
  const byKey = Object.fromEntries((m.indicators || []).map((i) => [i.key, i]));
  const budgetByUmoor = Object.fromEntries((m.budget || []).map((b) => [b.umoor, b]));
  return {
    jamiat: m.jamiat || '',
    researcher: m.researcher || { name: user?.name, mobile: user?.mobile },
    profileDate: dateInput(m.profileDate || new Date()),
    researcherRemarks: m.researcherRemarks || '',
    dimensions: m.dimensions || {},
    deprivationSummary: m.deprivationSummary || '',
    sdgs: m.sdgs || '',
    objectives: m.objectives || '',
    indicators: MPI_INDICATORS.map((i) => ({ key: i.key, dimension: i.dimension, indicator: i.indicator, applicable: false, investigation: '', ...(byKey[i.key] || {}) })),
    experts: m.experts?.length ? m.experts : [],
    actionPlan: m.actionPlan?.length ? m.actionPlan : [],
    budget: UMOOR.map((u) => ({ umoor: u, potential: false, willingness: false, scope: '', hrCount: '', skills: '', timeFrame: '', own: '', other: '', qardanHasana: '', enayat: '', ...(budgetByUmoor[u] || {}) })),
    consents: {
      aamil: { ...(m.consents?.aamil || {}), date: dateInput(m.consents?.aamil?.date) },
      jamaatSecretary: { ...(m.consents?.jamaatSecretary || {}), date: dateInput(m.consents?.jamaatSecretary?.date) },
      marafiqMember: { ...(m.consents?.marafiqMember || {}), date: dateInput(m.consents?.marafiqMember?.date) },
    },
    journal: m.journal || [],
  };
}

const rowTotal = (b) => ['own', 'other', 'qardanHasana', 'enayat'].reduce((s, k) => s + (Number(b[k]) || 0), 0);

// Checklist status: section filled in the system, or matching document uploaded
export function checklistStatus(c, mpi = c.mpi || {}) {
  const docs = new Set((c.documents || []).map((d) => d.category));
  const filled = {
    family_profile: true,
    survey_details: true,
    case_profile: !!(mpi.researcher?.name || mpi.profileDate),
    mpi_survey: Object.values(mpi.dimensions || {}).some(Boolean),
    mpi_analysis: !!(mpi.sdgs || mpi.objectives),
    deprivation_investigation: (mpi.indicators || []).some((i) => i.applicable && i.investigation),
    expert_advice: (mpi.experts || []).some((e) => e.name || e.solution),
    action_plan: (mpi.actionPlan || []).some((a) => a.plan),
    budget_sheet: (mpi.budget || []).some((b) => rowTotal(b) > 0),
    consent_form: !!(mpi.consents?.aamil?.signed || mpi.consents?.jamaatSecretary?.signed),
    journal_log: (mpi.journal || []).length > 0,
  };
  return CHECKLIST.map(([group, no, key, label, mode]) => ({ group, no, key, label, mode, done: !!filled[key] || docs.has(key), byDoc: docs.has(key) }));
}

export default function CaseMpi({ c, act, user }) {
  const [m, setM] = useState(() => initialMpi(c, user));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const set = (fn) => {
    setDirty(true);
    setM(fn);
  };
  const P = { form: m, setForm: set };
  const checklist = useMemo(() => checklistStatus(c, m), [c, m]);
  const deprived = MPI_DIMENSIONS.filter(([k]) => m.dimensions[k] === 'deprived');

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...m,
        indicators: m.indicators.filter((i) => i.applicable || i.investigation),
        budget: m.budget.map((b) => ({ ...b, hrCount: b.hrCount === '' ? undefined : Number(b.hrCount), own: Number(b.own) || 0, other: Number(b.other) || 0, qardanHasana: Number(b.qardanHasana) || 0, enayat: Number(b.enayat) || 0 })),
      };
      await act('/mpi', 'PUT', body, 'Case profile saved');
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };

  const updList = (key, i, k, v) => set((x) => ({ ...x, [key]: x[key].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const grand = m.budget.reduce((acc, b) => ({ own: acc.own + (Number(b.own) || 0), other: acc.other + (Number(b.other) || 0), qardanHasana: acc.qardanHasana + (Number(b.qardanHasana) || 0), enayat: acc.enayat + (Number(b.enayat) || 0) }), { own: 0, other: 0, qardanHasana: 0, enayat: 0 });

  return (
    <div className="mpi">
      <div className="mpi-bar">
        <span className="small muted">Upliftment Case Profile, in the department’s case-file format.</span>
        <Link className="btn ghost sm" to={`/admin/cases/${c._id}/print`} target="_blank">
          Print case file
        </Link>
        <button className="btn sm" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save case profile' : 'Saved'}
        </button>
      </div>

      <section className="panel">
        <h2>Check list</h2>
        <div className="table-wrap">
          <table className="table checklist">
            <thead>
              <tr>
                <th>Type</th>
                <th>Sr no.</th>
                <th>Document</th>
                <th>Attached</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((r, i) => (
                <tr key={r.no}>
                  <td>{i === 0 || checklist[i - 1].group !== r.group ? r.group : ''}</td>
                  <td>{r.no}</td>
                  <td>
                    {r.label}
                    {r.mode === 'upload' && !r.done && <small className="block muted">Upload in Forms & documents</small>}
                  </td>
                  <td>{r.done ? <span className="tx-good">Yes{r.byDoc ? ' (uploaded)' : ''}</span> : <span className="tx-medium">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Case profile and researcher</h2>
        <dl className="kv">
          <dt>Case no.</dt>
          <dd>{c.caseNo}</dd>
          <dt>HOF name</dt>
          <dd>{c.household?.headName}</dd>
          <dt>ITS ID / Members</dt>
          <dd>
            {c.household?.itsNo || '—'} / {c.household?.totalMembers ?? '—'}
          </dd>
          <dt>Mauze</dt>
          <dd>{c.mauze?.name}</dd>
          <dt>Contact no.</dt>
          <dd>{c.household?.mobile || c.beneficiaryMobile || '—'}</dd>
        </dl>
        <div className="grid-form three mt">
          <Field label="Jamiat" name="jamiat" {...P} />
          <Field label="Date" name="profileDate" type="date" {...P} />
          <div />
          <Field label="Researcher ITS ID" name="researcher.itsNo" {...P} />
          <Field label="Researcher name" name="researcher.name" {...P} />
          <Field label="Researcher contact no." name="researcher.mobile" {...P} />
          <Field label="Researcher remarks" name="researcherRemarks" type="textarea" rows={2} span={3} {...P} />
        </div>
      </section>

      <section className="panel">
        <h2>MPI survey report</h2>
        <div className="mpi-dims">
          {MPI_DIMENSIONS.map(([k, l]) => (
            <div key={k} className="mpi-dim">
              <span>{l}</span>
              <div className="seg">
                {[
                  ['not_deprived', 'Not deprived'],
                  ['deprived', 'Deprived'],
                ].map(([v, t]) => (
                  <button
                    type="button"
                    key={v}
                    className={m.dimensions[k] === v ? `on ${v}` : ''}
                    aria-pressed={m.dimensions[k] === v}
                    onClick={() => set((x) => ({ ...x, dimensions: { ...x.dimensions, [k]: x.dimensions[k] === v ? '' : v } }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Field label="Deprivation summary (observation)" name="deprivationSummary" type="textarea" rows={2} {...P} />
        <p className="small muted">Photo report: upload home-visit photos under Forms & documents as “Photo report”.</p>
      </section>

      <section className="panel">
        <h2>MPI analysis</h2>
        <div className="grid-form">
          <Field label="Applicable Sustainable Development Goals" name="sdgs" type="textarea" rows={2} {...P} hint="See page 13 of the MPI researcher guide book" />
          <Field label="Applicable objectives" name="objectives" type="textarea" rows={2} {...P} />
        </div>
      </section>

      <section className="panel">
        <h2>Deprivation investigation</h2>
        <p className="small muted">
          Tick each applicable indicator and record the root cause in detail, with what could help remove the deprivation.
          {deprived.length > 0 && ` Deprived: ${deprived.map(([, l]) => l).join(', ')}.`}
        </p>
        {[...new Set(MPI_INDICATORS.map((i) => i.group))].map((group) => (
          <div key={group} className="ind-group">
            <h3 className="sub-h">{group}</h3>
            {m.indicators
              .map((ind, i) => ({ ind, i, meta: MPI_INDICATORS[i] }))
              .filter((x) => x.meta.group === group)
              .map(({ ind, i, meta }) => (
                <div key={ind.key} className={`ind-row ${ind.applicable ? 'on' : ''}`}>
                  <label className="check">
                    <input type="checkbox" checked={!!ind.applicable} onChange={(e) => updList('indicators', i, 'applicable', e.target.checked)} />
                    <span>{meta.indicator}</span>
                  </label>
                  {(ind.applicable || ind.investigation) && (
                    <textarea rows={2} value={ind.investigation || ''} onChange={(e) => updList('indicators', i, 'investigation', e.target.value)} placeholder="Detailed investigation (root cause)" aria-label={`${meta.indicator} investigation`} />
                  )}
                </div>
              ))}
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Expert advice (local) / Expert consultation (Idara)</h2>
          <button type="button" className="btn ghost sm" onClick={() => set((x) => ({ ...x, experts: [...x.experts, { ...blankExpert }] }))}>
            Add expert
          </button>
        </div>
        <p className="small muted">Take each solution in writing on the expert’s letterhead and upload it as “Consultant / expert letterhead”.</p>
        {m.experts.map((e, i) => (
          <div className="member-card" key={i}>
            <div className="member-head">
              <strong>Expert {i + 1}</strong>
              <button type="button" className="link-btn danger" onClick={() => set((x) => ({ ...x, experts: x.experts.filter((_, j) => j !== i) }))}>
                Remove
              </button>
            </div>
            <div className="grid-form three">
              <div className="field">
                <label>Type</label>
                <select value={e.type} onChange={(ev) => updList('experts', i, 'type', ev.target.value)}>
                  <option value="local">Local</option>
                  <option value="idara">Idara</option>
                </select>
              </div>
              <LineInput label="Name" value={e.name} onChange={(v) => updList('experts', i, 'name', v)} />
              <LineInput label="ITS (if applicable)" value={e.itsNo} onChange={(v) => updList('experts', i, 'itsNo', v)} />
              <LineInput label="Contact number" value={e.mobile} onChange={(v) => updList('experts', i, 'mobile', v)} />
              <LineInput label="Expertise in" value={e.expertise} onChange={(v) => updList('experts', i, 'expertise', v)} />
              <div className="field">
                <label>Dimension</label>
                <select value={e.dimension} onChange={(ev) => updList('experts', i, 'dimension', ev.target.value)}>
                  <option value="">Select…</option>
                  {MPI_DIMENSIONS.map(([k, l]) => (
                    <option key={k} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <LineInput label="Indicator" value={e.indicator} onChange={(v) => updList('experts', i, 'indicator', v)} />
              <div className="field span-3">
                <label>Proposed solution by expert</label>
                <textarea rows={2} value={e.solution || ''} onChange={(ev) => updList('experts', i, 'solution', ev.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Proposed action plan by researcher</h2>
          <button type="button" className="btn ghost sm" onClick={() => set((x) => ({ ...x, actionPlan: [...x.actionPlan, { ...blankAction }] }))}>
            Add step
          </button>
        </div>
        {m.actionPlan.length === 0 ? (
          <p className="muted small">Add a step for each deprived indicator: the sustainable solution, who is responsible and the time needed.</p>
        ) : (
          <div className="table-wrap">
            <table className="table edit-table">
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Deprived indicator</th>
                  <th>Proposed action plan</th>
                  <th>Person responsible</th>
                  <th>Time required</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {m.actionPlan.map((a, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <input aria-label="Indicator" value={a.indicator || ''} list="mpi-ind" onChange={(e) => updList('actionPlan', i, 'indicator', e.target.value)} />
                    </td>
                    <td>
                      <textarea aria-label="Plan" rows={2} value={a.plan || ''} onChange={(e) => updList('actionPlan', i, 'plan', e.target.value)} />
                    </td>
                    <td>
                      <input aria-label="Responsible" value={a.responsible || ''} onChange={(e) => updList('actionPlan', i, 'responsible', e.target.value)} />
                    </td>
                    <td>
                      <input aria-label="Time required" value={a.timeRequired || ''} onChange={(e) => updList('actionPlan', i, 'timeRequired', e.target.value)} />
                    </td>
                    <td>
                      <select aria-label="Status" value={a.status || 'pending'} onChange={(e) => updList('actionPlan', i, 'status', e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>
                      <button type="button" className="link-btn danger" onClick={() => set((x) => ({ ...x, actionPlan: x.actionPlan.filter((_, j) => j !== i) }))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="mpi-ind">
              {MPI_INDICATORS.map((i) => (
                <option key={i.key} value={i.indicator} />
              ))}
            </datalist>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Budget sheet</h2>
        <div className="table-wrap">
          <table className="table edit-table budget">
            <thead>
              <tr>
                <th rowSpan={2}>Umoor</th>
                <th colSpan={2}>Scope</th>
                <th rowSpan={2}>H.R. (count)</th>
                <th rowSpan={2}>Skills (type of professional)</th>
                <th rowSpan={2}>Time frame</th>
                <th rowSpan={2} className="r">Own contribution (₹)</th>
                <th rowSpan={2} className="r">Other contribution (₹)</th>
                <th rowSpan={2} className="r">Qardan Hasana (₹)</th>
                <th rowSpan={2} className="r">Enayat (₹)</th>
                <th rowSpan={2} className="r">Total (₹)</th>
              </tr>
              <tr>
                <th>Potential</th>
                <th>Willingness</th>
              </tr>
            </thead>
            <tbody>
              {m.budget.map((b, i) => (
                <tr key={b.umoor}>
                  <th scope="row">{b.umoor}</th>
                  <td className="c">
                    <input type="checkbox" aria-label={`${b.umoor} potential`} checked={!!b.potential} onChange={(e) => updList('budget', i, 'potential', e.target.checked)} />
                  </td>
                  <td className="c">
                    <input type="checkbox" aria-label={`${b.umoor} willingness`} checked={!!b.willingness} onChange={(e) => updList('budget', i, 'willingness', e.target.checked)} />
                  </td>
                  <td>
                    <input className="w-sm" type="number" aria-label="HR count" value={b.hrCount ?? ''} onChange={(e) => updList('budget', i, 'hrCount', e.target.value)} />
                  </td>
                  <td>
                    <input aria-label="Skills" value={b.skills || ''} onChange={(e) => updList('budget', i, 'skills', e.target.value)} />
                  </td>
                  <td>
                    <input aria-label="Time frame" value={b.timeFrame || ''} onChange={(e) => updList('budget', i, 'timeFrame', e.target.value)} />
                  </td>
                  {['own', 'other', 'qardanHasana', 'enayat'].map((k) => (
                    <td key={k}>
                      <input className="num" type="number" aria-label={k} value={b[k] ?? ''} onChange={(e) => updList('budget', i, k, e.target.value)} />
                    </td>
                  ))}
                  <td className="r">{inr(rowTotal(b))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>Grand total</td>
                <td className="r">{inr(grand.own)}</td>
                <td className="r">{inr(grand.other)}</td>
                <td className="r">{inr(grand.qardanHasana)}</td>
                <td className="r">{inr(grand.enayat)}</td>
                <td className="r">{inr(grand.own + grand.other + grand.qardanHasana + grand.enayat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="small muted">Upload professionals’ quotations under Forms & documents as “Quotation”.</p>
      </section>

      <section className="panel">
        <h2>Consent forms</h2>
        <div className="consents">
          {[
            ['aamil', 'Aamil Saheb'],
            ['jamaatSecretary', 'Jamaat Secretary'],
            ['marafiqMember', 'Marafiq Burhaniyah member'],
          ].map(([k, l]) => (
            <div key={k} className="consent">
              <strong>{l}</strong>
              <div className="grid-form">
                <Field label="Name" name={`consents.${k}.name`} {...P} />
                <Field label="Date" name={`consents.${k}.date`} type="date" {...P} />
                <Field label="Signed consent received" name={`consents.${k}.signed`} type="checkbox" span={2} {...P} />
              </div>
            </div>
          ))}
        </div>
        <p className="small muted">Upload signed consent forms under Forms & documents as “Signed consent form”, and the Araz as “Araz to Al-Vazarat al-Saifiyah”.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Daily journal log</h2>
          <button type="button" className="btn ghost sm" onClick={() => set((x) => ({ ...x, journal: [...x.journal, { date: dateInput(new Date()), note: '' }] }))}>
            Add entry
          </button>
        </div>
        {m.journal.length === 0 ? (
          <p className="muted small">Record each visit, call and action taken on the case.</p>
        ) : (
          <div className="journal">
            {m.journal.map((j, i) => (
              <div className="journal-row" key={i}>
                <input type="date" aria-label="Date" value={dateInput(j.date)} onChange={(e) => updList('journal', i, 'date', e.target.value)} />
                <textarea rows={2} aria-label="Note" value={j.note || ''} onChange={(e) => updList('journal', i, 'note', e.target.value)} placeholder="What was done" />
                <button type="button" className="link-btn danger" onClick={() => set((x) => ({ ...x, journal: x.journal.filter((_, k2) => k2 !== i) }))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="form-actions sticky">
        <button className="btn" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save case profile' : 'All changes saved'}
        </button>
      </div>
    </div>
  );
}

function LineInput({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
