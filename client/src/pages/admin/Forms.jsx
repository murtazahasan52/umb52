import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, Loading, ErrorBox, Empty, Modal, Field, useToast, FormModal } from '../../ui';
import { date, inr, CASE_TYPES, TYPE_SCHEMES, SCHEMES, CATEGORIES, SUPPORT_TYPES, NEED, HOUSING_PURPOSE, BUSINESS_PURPOSE } from '../../lib';
import MauzeInput, { resolveMauze } from '../../components/MauzeInput';
import { DocumentList } from '../../components/Documents';

const STATUS = { sent: 'Sent', opened: 'Opened', submitted: 'Ready to review', converted: 'Registered', rejected: 'Not taken up', cancelled: 'Cancelled' };

export const formLink = (token) => `${window.location.origin}/form/${token}`;
export function shareText(f) {
  return `Salaam ${f.name}. Please fill in your family form for the Upliftment Department${f.mauze ? ` (${f.mauze})` : ''}. It is private and only seen by the committee: ${formLink(f.token)}`;
}

// Share card shown right after a link is created (the token is only shown once here)
export function ShareLink({ form, onClose }) {
  const toast = useToast();
  const link = formLink(form.token);
  const text = shareText(form);
  const wa = `https://wa.me/${form.mobile ? `91${form.mobile}` : ''}?text=${encodeURIComponent(text)}`;
  const sms = `sms:${form.mobile || ''}?body=${encodeURIComponent(text)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied');
    } catch {
      toast('Select the link and copy it', 'err');
    }
  };
  return (
    <Modal title={`Form link for ${form.name}`} onClose={onClose}>
      <p className="small">
        Send this personal link to the family. It opens the family form on their phone, already addressed to them. Ref {form.refNo}, valid until {date(form.expiresAt)}.
      </p>
      <div className="link-box">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Form link" />
        <button type="button" className="btn ghost sm" onClick={copy}>
          Copy
        </button>
      </div>
      <div className="share-row">
        <a className="btn wa" href={wa} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
        <a className="btn ghost" href={sms}>
          Send by SMS
        </a>
      </div>
      <p className="fine">The message opens in WhatsApp or Messages for you to send. Nothing is sent automatically.</p>
    </Modal>
  );
}

export function SendFormModal({ household, onClose, onCreated }) {
  const { user } = useAuth();
  return (
    <FormModal
      title={household ? `Send update form to ${household.headName}` : 'Send a family form'}
      submitLabel="Create link"
      initial={{ name: household?.headName || '', mobile: household?.mobile || '', place: {}, message: '' }}
      onClose={onClose}
      onSubmit={async (v) => {
        const mauze = household ? undefined : await resolveMauze(user, v.place || {});
        const f = await api('/forms', { method: 'POST', body: { name: v.name, mobile: v.mobile, mauze, household: household?._id, message: v.message } });
        onCreated(f);
      }}
    >
      {(form, setForm) => (
        <>
          <Field label="Head of family" name="name" required form={form} setForm={setForm} disabled={!!household} />
          <Field label="Mobile (for WhatsApp)" name="mobile" type="tel" form={form} setForm={setForm} />
          {!household && <MauzeInput value={form.place} onChange={(p) => setForm((f) => ({ ...f, place: p }))} />}
          <Field label="Personal note shown on the form (optional)" name="message" type="textarea" rows={2} span={2} form={form} setForm={setForm} placeholder="e.g. Please fill this before Friday's visit" />
        </>
      )}
    </FormModal>
  );
}

export default function Forms() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const [q, setQ] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [share, setShare] = useState(null);
  const [openId, setOpenId] = useState(null);
  const d = useLoad(() => api(`/forms?${new URLSearchParams({ ...(status && { status }), ...(q && { q }) })}`), [status, q]);

  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Family forms</h1>
          <p className="sub">Send a personal form link to a family on WhatsApp or SMS. They fill it on their phone with documents, and you review it here before it becomes a household and case.</p>
        </div>
        <button className="btn" onClick={() => setSendOpen(true)}>
          Send a family form
        </button>
      </div>

      <div className="filters bar">
        <label className="grow">
          <span>Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, mobile or reference" />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setSp(e.target.value ? { status: e.target.value } : {})}>
            <option value="">All</option>
            {Object.entries(STATUS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {d.loading && !d.data ? (
        <Loading />
      ) : d.error ? (
        <ErrorBox error={d.error} onRetry={d.reload} />
      ) : d.data.length === 0 ? (
        <Empty title="No family forms yet">Send a form link to a family to let them fill in their details from their phone.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table hover">
            <thead>
              <tr>
                <th>Family</th>
                <th>Mauze</th>
                <th>Purpose</th>
                <th>Documents</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.data.map((f) => (
                <tr key={f._id} tabIndex={0} onClick={() => setOpenId(f._id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(f._id)}>
                  <td>
                    <strong>{f.name}</strong>
                    <small className="block muted">
                      {f.refNo}
                      {f.mobile ? `, ${f.mobile}` : ''}
                    </small>
                  </td>
                  <td>{f.mauze?.name}</td>
                  <td>{f.purpose === 'update' ? 'Update details' : 'New registration'}</td>
                  <td>{f.documentCount || '—'}</td>
                  <td className="nowrap">{date(f.submittedAt || f.updatedAt)}</td>
                  <td>
                    <span className={`badge fs-${f.status}`}>{STATUS[f.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sendOpen && (
        <SendFormModal
          onClose={() => setSendOpen(false)}
          onCreated={(f) => {
            setShare(f);
            d.reload();
          }}
        />
      )}
      {share && <ShareLink form={share} onClose={() => setShare(null)} />}
      {openId && <FormReview id={openId} onClose={() => setOpenId(null)} onChanged={d.reload} onShare={setShare} />}
    </div>
  );
}

function FormReview({ id, onClose, onChanged, onShare }) {
  const toast = useToast();
  const r = useLoad(() => api(`/forms/${id}`), [id]);
  const staff = useLoad(() => api('/users/staff'), []);
  const [conv, setConv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const f = r.data;
  const x = f?.data || {};

  const startConvert = () => {
    const types = x.caseTypes?.length ? x.caseTypes : [];
    setConv({ needLevel: 'medium', cases: types.map((t) => ({ caseType: t, scheme: TYPE_SCHEMES[t][0], need: '', counsellor: '' })) });
  };
  const convert = async () => {
    setBusy(true);
    try {
      const res = await api(`/forms/${id}/convert`, { method: 'POST', body: conv });
      setDone(res);
      toast(`Registered ${res.household.code}${res.cases.length ? ` with ${res.cases.length} case(s)` : ''}`);
      onChanged();
      r.reload();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (status) => {
    await api(`/forms/${id}`, { method: 'PATCH', body: { status } });
    toast('Form updated');
    onChanged();
    r.reload();
  };
  const renew = async () => {
    const res = await api(`/forms/${id}/renew`, { method: 'POST', body: { newLink: true } });
    onShare({ ...res, mauze: f.mauze?.name });
    onChanged();
    onClose();
  };
  const staffOpts = Object.fromEntries((staff.data || []).map((s) => [s._id, s.name]));

  return (
    <Modal title={f ? `${f.refNo}: ${f.name}` : 'Family form'} onClose={onClose} wide>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorBox error={r.error} />
      ) : (
        <div className="review">
          <p className="small muted">
            {STATUS[f.status]}. Created {date(f.createdAt)} by {f.createdBy?.name}
            {f.openedAt ? `. Opened ${date(f.openedAt)}` : ''}
            {f.submittedAt ? `. Submitted ${date(f.submittedAt)}` : ''}
            {f.household ? `. Update for ${f.household.code}` : ''}.
          </p>

          {f.status === 'converted' || done ? (
            <div className="done-card slim">
              Registered as{' '}
              <Link to={`/admin/households/${(done?.household || f.convertedHousehold)?._id}`} onClick={onClose}>
                {(done?.household || f.convertedHousehold)?.code}
              </Link>
              {(done?.cases || (f.convertedCase ? [f.convertedCase] : [])).map((c) => (
                <span key={c._id}>
                  {', case '}
                  <Link to={`/admin/cases/${c._id}`} onClick={onClose}>
                    {c.caseNo}
                  </Link>
                </span>
              ))}
              .
            </div>
          ) : !f.data ? (
            <div className="readout">
              <p>The family has not submitted this form yet.</p>
              <button className="btn sm" onClick={renew}>
                Get a fresh link to share again
              </button>
            </div>
          ) : null}

          {f.data && (
            <>
              <h3 className="sub-h">Family</h3>
              <dl className="kv wide">
                <dt>Head of family</dt>
                <dd>
                  {x.headName}
                  {x.itsNo ? `, ITS ${x.itsNo}` : ''}, {x.mobile}
                </dd>
                <dt>Address</dt>
                <dd>{x.address || '—'}</dd>
                <dt>Describes the family</dt>
                <dd>{(x.categories || []).map((c) => CATEGORIES[c]).join(', ') || '—'}</dd>
                <dt>Income</dt>
                <dd>
                  {inr(x.monthlyHouseholdIncome)} per month{x.mainIncomeSource ? `, from ${x.mainIncomeSource}` : ''}
                </dd>
                {x.business?.exists && (
                  <>
                    <dt>Business</dt>
                    <dd>
                      {[x.business.name, x.business.type].filter(Boolean).join(', ')}. Sales {inr(x.business.monthlyTurnover)}, profit {inr(x.business.monthlyNetIncome)} per month
                    </dd>
                  </>
                )}
                <dt>Debts</dt>
                <dd>
                  {inr(x.debts?.total)}
                  {x.debts?.monthlyEmi ? `, EMI ${inr(x.debts.monthlyEmi)}` : ''}
                </dd>
                <dt>Home</dt>
                <dd>{[x.housing, x.housingNeed].filter(Boolean).join('. ') || '—'}</dd>
                <dt>Members</dt>
                <dd>{(x.members || []).map((m) => `${m.name}${m.relation ? ` (${m.relation}${m.age ? `, ${m.age}` : ''})` : ''}`).join('; ') || '—'}</dd>
              </dl>

              <h3 className="sub-h">Help requested</h3>
              <dl className="kv wide">
                <dt>Case type</dt>
                <dd>{(x.caseTypes || []).map((t) => CASE_TYPES[t]).join(', ') || '—'}</dd>
                {x.housingRequest?.purpose && (
                  <>
                    <dt>Housing</dt>
                    <dd>
                      {HOUSING_PURPOSE[x.housingRequest.purpose]}. Est. {inr(x.housingRequest.estimatedCost)}. {x.housingRequest.propertyDetails}
                    </dd>
                  </>
                )}
                {x.educationRequest?.studentName && (
                  <>
                    <dt>Education</dt>
                    <dd>
                      {x.educationRequest.studentName}, {x.educationRequest.course} at {x.educationRequest.institution}. Fees {inr(x.educationRequest.annualFees)} a year
                    </dd>
                  </>
                )}
                {x.businessRequest?.purpose && (
                  <>
                    <dt>Business</dt>
                    <dd>
                      {BUSINESS_PURPOSE[x.businessRequest.purpose]}. Est. {inr(x.businessRequest.estimatedCost)}
                    </dd>
                  </>
                )}
                <dt>Other support</dt>
                <dd>{(x.supportSought || []).map((s) => SUPPORT_TYPES[s] || s).join(', ') || '—'}</dd>
                <dt>In their words</dt>
                <dd className="pre">{x.supportDetails || '—'}</dd>
                <dt>Amount needed</dt>
                <dd>{inr(x.amountNeeded)}</dd>
              </dl>
            </>
          )}

          <h3 className="sub-h">Documents ({f.documents?.length || 0})</h3>
          <DocumentList docs={f.documents} />

          {f.data && f.status !== 'converted' && !done && !conv && (
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setStatus('rejected')}>
                Not taking up
              </button>
              <button className="btn" onClick={startConvert}>
                Register this family
              </button>
            </div>
          )}

          {conv && !done && (
            <div className="convert-box">
              <h3 className="sub-h">Register {f.household ? `(updates ${f.household.code})` : 'as a new household'}</h3>
              <div className="grid-form three">
                <div className="field">
                  <label>Level of need</label>
                  <select value={conv.needLevel} onChange={(e) => setConv((c) => ({ ...c, needLevel: e.target.value }))}>
                    {Object.entries(NEED).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="small">Cases to open:</p>
              {conv.cases.map((c, i) => (
                <div className="grid-form three conv-case" key={i}>
                  <div className="field">
                    <label>Case type</label>
                    <select value={c.caseType} onChange={(e) => setConv((v) => ({ ...v, cases: v.cases.map((x2, j) => (j === i ? { ...x2, caseType: e.target.value, scheme: TYPE_SCHEMES[e.target.value][0] } : x2)) }))}>
                      {Object.entries(CASE_TYPES).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Support route</label>
                    <select value={c.scheme} onChange={(e) => setConv((v) => ({ ...v, cases: v.cases.map((x2, j) => (j === i ? { ...x2, scheme: e.target.value } : x2)) }))}>
                      {TYPE_SCHEMES[c.caseType].map((s) => (
                        <option key={s} value={s}>
                          {SCHEMES[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Counsellor</label>
                    <select value={c.counsellor} onChange={(e) => setConv((v) => ({ ...v, cases: v.cases.map((x2, j) => (j === i ? { ...x2, counsellor: e.target.value } : x2)) }))}>
                      <option value="">Assign later</option>
                      {Object.entries(staffOpts).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="link-btn danger" onClick={() => setConv((v) => ({ ...v, cases: v.cases.filter((_, j) => j !== i) }))}>
                    Don’t open this case
                  </button>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={() => setConv((v) => ({ ...v, cases: [...v.cases, { caseType: 'business', scheme: 'QH', counsellor: '' }] }))}>
                Add a case
              </button>
              <div className="form-actions">
                <button className="btn ghost" onClick={() => setConv(null)}>
                  Back
                </button>
                <button className="btn" disabled={busy} onClick={convert}>
                  {busy ? 'Registering…' : conv.cases.length ? `Register and open ${conv.cases.length} case${conv.cases.length > 1 ? 's' : ''}` : 'Register household only'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
