import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Field, Chips, Loading, useToast } from '../../ui';
import { CASE_TYPES, SUPPORT_TYPES, date } from '../../lib';
import FamilyFields from '../../components/FamilyFields';
import { TypePicker, TypeFields } from '../../components/TypeDetails';
import { UploadBox, DOC_CATEGORIES, FAMILY_DOC_CATEGORIES } from '../../components/Documents';

const BASE = import.meta.env.VITE_API_URL || '';
const REQ_KEY = { housing: 'housingRequest', education: 'educationRequest', business: 'businessRequest' };
const OTHER_SUPPORT = Object.fromEntries(Object.entries(SUPPORT_TYPES).filter(([k]) => ['skill_training', 'employment', 'medical', 'counselling', 'qardan_hasana', 'other'].includes(k)));

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}/api/public/form${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

// Opened by the family from the personal link the committee sent them
export default function FamilyForm() {
  const { token } = useParams();
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    call(`/${token}`)
      .then((r) => {
        setInfo(r);
        setDocs(r.documents || []);
        setForm({ categories: [], members: [], business: { exists: false }, debts: {}, caseTypes: [], supportSought: [], ...r.data, consent: false });
      })
      .catch((e) => setErr(e.message));
  }, [token]);

  if (err)
    return (
      <FormShell>
        <div className="done-card warn">
          <h1>Link not valid</h1>
          <p>{err}</p>
        </div>
      </FormShell>
    );
  if (!info || !form)
    return (
      <FormShell>
        <Loading text="Opening your form…" />
      </FormShell>
    );

  if (!info.open && info.status === 'converted')
    return (
      <FormShell>
        <div className="done-card">
          <h1>Thank you</h1>
          <p>Your form has been received and your Mauze committee is taking it forward. Your counsellor will be in touch.</p>
        </div>
      </FormShell>
    );
  if (!info.open)
    return (
      <FormShell>
        <div className="done-card warn">
          <h1>This form is closed</h1>
          <p>{info.expired ? 'The link has expired.' : 'This form is no longer open.'} Please ask your Mauze committee to send you a new link.</p>
        </div>
      </FormShell>
    );

  if (sent)
    return (
      <FormShell>
        <div className="done-card">
          <h1>Form submitted</h1>
          <p>
            Shukran. Your details have reached your Mauze committee (ref <strong>{info.refNo}</strong>). A counsellor will contact you soon. You can open this link again to make
            changes until the committee reviews it.
          </p>
          <button className="btn ghost" onClick={() => setSent(false)}>
            Review or edit my form
          </button>
        </div>
      </FormShell>
    );

  const upload = async (files, meta) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    fd.append('category', meta.category);
    if (meta.title) fd.append('title', meta.title);
    setDocs(await call(`/${token}/documents`, { method: 'POST', body: fd }));
  };
  const removeDoc = async (d) => {
    try {
      setDocs(await call(`/${token}/documents/${d._id}`, { method: 'DELETE' }));
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.caseTypes?.length && !form.supportSought?.length) return setFormErr('Choose at least one kind of help you need.');
    setBusy(true);
    try {
      const r = await call(`/${token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setInfo(r);
      setSent(true);
      window.scrollTo(0, 0);
    } catch (x) {
      setFormErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const P = { form, setForm };
  return (
    <FormShell>
      <div className="ff-intro">
        <h1>Family form</h1>
        <p>
          Salaam {info.name}. This form is from the Upliftment Department{info.mauze ? `, ${info.mauze}` : ''}. Please fill in what you can. Your details are seen only by
          the committee members helping your family.
        </p>
        {info.message && <p className="ff-note">{info.message}</p>}
        {info.submittedAt && <p className="small muted">You submitted this form on {date(info.submittedAt)}. You can update it and submit again.</p>}
      </div>

      <form onSubmit={submit} className="stack">
        <FamilyFields form={form} setForm={setForm} simple />

        <section className="panel form-section">
          <h2>What help do you need?</h2>
          <p className="muted small">Choose one or more.</p>
          <TypePicker multiple value={form.caseTypes} onChange={(v) => setForm((f) => ({ ...f, caseTypes: v }))} />
          {(form.caseTypes || []).map((t) => (
            <div key={t} className="ff-type">
              <h3 className="sub-h">{CASE_TYPES[t]}</h3>
              <TypeFields type={t} base={REQ_KEY[t]} family {...P} />
            </div>
          ))}
          <Chips label="Any other help" name="supportSought" options={OTHER_SUPPORT} {...P} />
          <div className="grid-form">
            <Field label="Tell us in your own words" name="supportDetails" type="textarea" rows={4} span={2} {...P} placeholder="What is the situation, and what would make the biggest difference for your family?" />
            <Field label="Approximate amount needed, if any (₹)" name="amountNeeded" type="number" {...P} />
          </div>
        </section>

        <section className="panel form-section">
          <h2>Documents</h2>
          <p className="muted small">Optional, but helpful: ITS card or Aadhaar, income proof, fee receipts, quotations or photos of the home or shop. You can take a photo with your phone.</p>
          <UploadBox onUpload={upload} categories={FAMILY_DOC_CATEGORIES} />
          {docs.length > 0 && (
            <ul className="doc-list">
              {docs.map((d) => (
                <li key={d._id}>
                  <span className="doc-icon" aria-hidden="true">
                    {/\.pdf$/i.test(d.fileName || '') ? 'PDF' : 'IMG'}
                  </span>
                  <span className="doc-main">
                    <strong>{d.title}</strong>
                    <small className="muted block">{DOC_CATEGORIES[d.category] || d.category}</small>
                  </span>
                  <button type="button" className="link-btn danger" onClick={() => removeDoc(d)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel form-section">
          <Field
            label="I confirm the details are true, and I agree that the Upliftment Department and my Mauze committee may use them to help my family."
            name="consent"
            type="checkbox"
            {...P}
          />
          {formErr && <p className="form-error">{formErr}</p>}
          <button className="btn lg block" disabled={busy}>
            {busy ? 'Submitting…' : info.submittedAt ? 'Submit updated form' : 'Submit form'}
          </button>
        </section>
      </form>
    </FormShell>
  );
}

function FormShell({ children }) {
  return (
    <div className="ff">
      <header className="ff-head">
        <img src="/brand/logo-blue.png" alt="Upliftment Department" height="56" />
        <div>
          <strong>Upliftment Department</strong>
          <small lang="ar" dir="rtl">
            رفع مستوى معيشة المؤمنين
          </small>
        </div>
      </header>
      <main className="ff-main">{children}</main>
    </div>
  );
}
