import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Field, Chips, useLoad, useToast } from '../../ui';
import { SCHEMES, INTERVENTIONS, TYPE_SCHEMES, CASE_TYPES, NEED, MPI_DIMENSIONS } from '../../lib';
import MauzeInput, { resolveMauze } from '../../components/MauzeInput';
import FamilyFields from '../../components/FamilyFields';
import { TypePicker, TypeFields } from '../../components/TypeDetails';
import { UploadBox, DocumentList } from '../../components/Documents';

const DETAIL_KEY = { housing: 'housing', education: 'education', business: 'businessDetail' };

// One page to register a family and open their upliftment case, with forms uploaded
export default function Register() {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [place, setPlace] = useState({ mauzeName: '', zoneName: '' });
  const [family, setFamily] = useState({ categories: [], members: [], business: { exists: false }, debts: {}, needLevel: 'medium' });
  const [kase, setKase] = useState({ caseType: '', interventions: [], termsExplained: false, mpi: { dimensions: {}, researcher: { name: user.name, mobile: user.mobile } } });
  const [pending, setPending] = useState([]); // files to upload after saving
  const [dupe, setDupe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const staff = useLoad(() => api('/users/staff'), []);
  const staffOpts = Object.fromEntries((staff.data || []).map((s) => [s._id, `${s.name}${s.designation ? ` (${s.designation})` : ''}`]));

  // Warn if this family is already registered (ITS or mobile)
  useEffect(() => {
    const key = (family.itsNo || '').replace(/\D/g, '').length >= 6 ? family.itsNo : (family.mobile || '').replace(/\D/g, '').length >= 10 ? family.mobile : '';
    if (!key) return setDupe(null);
    const t = setTimeout(() => api(`/search?q=${encodeURIComponent(key.replace(/\D/g, ''))}`).then((r) => setDupe(r.households[0] || null)).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [family.itsNo, family.mobile]);

  const setType = (t) =>
    setKase((k) => ({
      ...k,
      caseType: t,
      scheme: TYPE_SCHEMES[t][0],
      interventions: k.interventions.length ? k.interventions : t === 'business' ? ['business_expansion'] : t === 'education' ? ['education'] : ['housing'],
    }));
  const schemeOpts = kase.caseType ? Object.fromEntries(TYPE_SCHEMES[kase.caseType].map((s) => [s, SCHEMES[s]])) : SCHEMES;

  const submit = async (e) => {
    e.preventDefault();
    if (!kase.caseType) return setErr('Choose the case type: Housing, Education or Business');
    setBusy(true);
    setErr('');
    try {
      const mauze = await resolveMauze(user, place);
      const h = await api('/households', { method: 'POST', body: { ...family, mauze, assessed: true } });
      const dk = DETAIL_KEY[kase.caseType];
      const c = await api('/cases', {
        method: 'POST',
        body: {
          household: h._id,
          caseType: kase.caseType,
          scheme: kase.scheme,
          [dk]: kase[dk],
          need: kase.need,
          interventions: kase.interventions,
          planDetails: kase.planDetails,
          targetOutcome: kase.targetOutcome,
          targetDate: kase.targetDate,
          reviewDate: kase.reviewDate,
          counsellor: kase.counsellor || undefined,
          mentor: kase.mentor || undefined,
          amountApplied: kase.amountApplied,
          termsExplained: kase.termsExplained,
        },
      });
      // MPI survey summary
      const dims = kase.mpi.dimensions || {};
      if (Object.values(dims).some(Boolean) || kase.mpi.researcherRemarks) {
        await api(`/cases/${c._id}/mpi`, { method: 'PUT', body: { ...kase.mpi, profileDate: new Date() } });
      }
      // Upload forms queued on this page
      for (const p of pending) {
        const fd = new FormData();
        p.files.forEach((f) => fd.append('files', f));
        const up = await api('/uploads', { method: 'POST', form: fd });
        for (const [i, url] of up.urls.entries()) {
          await api(`/cases/${c._id}/documents`, { method: 'POST', body: { title: p.title || p.files[i].name, category: p.category, url, fileName: p.files[i].name } });
        }
      }
      toast(`Registered ${h.code} and opened case ${c.caseNo}`);
      nav(`/admin/cases/${c._id}`);
    } catch (x) {
      setErr(x.message);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const KP = { form: kase, setForm: setKase };
  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>Register a case</h1>
          <p className="sub">Family details, the upliftment case and its forms on one page. To have the family fill it themselves, <Link to="/admin/forms">send them a form link</Link>.</p>
        </div>
      </div>

      <form onSubmit={submit} className="stack">
        <section className="panel form-section">
          <h2>Mauze</h2>
          <div className="grid-form three">
            <MauzeInput value={place} onChange={setPlace} />
            <Field label="Level of need" name="needLevel" type="select" options={NEED} form={family} setForm={setFamily} />
          </div>
        </section>

        <FamilyFields form={family} setForm={setFamily} />
        {dupe && (
          <div className="dupe-box">
            <strong>This family may already be registered:</strong> {dupe.headName}, {dupe.code}, {dupe.mauze}
            {dupe.itsNo ? `, ITS ${dupe.itsNo}` : ''}. <Link to={`/admin/cases/new?household=${dupe._id}`}>Open a case for this family instead</Link>
          </div>
        )}

        <section className="panel form-section">
          <h2>Upliftment case</h2>
          <TypePicker value={kase.caseType} onChange={setType} />
          {kase.caseType && (
            <>
              <h3 className="sub-h">{CASE_TYPES[kase.caseType]} details</h3>
              <TypeFields type={kase.caseType} base={DETAIL_KEY[kase.caseType]} {...KP} />
              <h3 className="sub-h">Plan</h3>
              <div className="grid-form three">
                <Field label="Support route" name="scheme" type="select" options={schemeOpts} required {...KP} />
                <Field label="Amount requested (₹)" name="amountApplied" type="number" {...KP} />
                <div />
                <Field label="Documented need" name="need" type="textarea" rows={2} span={3} required {...KP} />
                <Chips label="Agreed interventions" name="interventions" options={INTERVENTIONS} {...KP} />
                <Field label="Plan details" name="planDetails" type="textarea" rows={2} span={3} {...KP} />
                <Field label="Outcome to achieve in 6–12 months" name="targetOutcome" span={2} {...KP} />
                <Field label="Target date" name="targetDate" type="date" {...KP} />
                <Field label="Responsible counsellor" name="counsellor" type="select" options={staffOpts} {...KP} />
                <Field label="Mentor" name="mentor" type="select" options={staffOpts} {...KP} />
                <Field label="First review date" name="reviewDate" type="date" {...KP} />
                <Field label="Terms, obligations and expected outcomes explained to the family" name="termsExplained" type="checkbox" span={3} {...KP} />
              </div>
            </>
          )}
        </section>

        <section className="panel form-section">
          <h2>MPI survey report</h2>
          <p className="muted small">Mark each dimension after the home visit. The full deprivation investigation, expert advice, action plan and budget sheet can be filled in the case’s Case profile tab.</p>
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
                      className={kase.mpi.dimensions[k] === v ? `on ${v}` : ''}
                      aria-pressed={kase.mpi.dimensions[k] === v}
                      onClick={() => setKase((x) => ({ ...x, mpi: { ...x.mpi, dimensions: { ...x.mpi.dimensions, [k]: x.mpi.dimensions[k] === v ? '' : v } } }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid-form three">
            <Field label="Researcher name" name="mpi.researcher.name" {...KP} />
            <Field label="Researcher ITS" name="mpi.researcher.itsNo" {...KP} />
            <Field label="Researcher contact" name="mpi.researcher.mobile" {...KP} />
            <Field label="Deprivation summary (observation)" name="mpi.deprivationSummary" type="textarea" rows={2} span={3} {...KP} />
            <Field label="Researcher remarks" name="mpi.researcherRemarks" type="textarea" rows={2} span={3} {...KP} />
          </div>
        </section>

        <section className="panel form-section">
          <h2>Forms and documents</h2>
          <p className="muted small">Scanned survey forms, ID and income proof, photos of the home, quotations. They are uploaded when you save.</p>
          <UploadBox
            queued
            onUpload={async (files, meta) =>
              setPending((p) => [...p, { ...meta, files }])
            }
          />
          {pending.length > 0 && (
            <DocumentList
              viewable={false}
              docs={pending.flatMap((p, pi) => p.files.map((f, fi) => ({ _id: `${pi}-${fi}`, title: p.title || f.name, category: p.category, fileName: f.name, pi, fi })))}
              onDelete={(d) => setPending((p) => p.map((x, i) => (i === d.pi ? { ...x, files: x.files.filter((_, j) => j !== d.fi) } : x)).filter((x) => x.files.length))}
            />
          )}
        </section>

        {err && <p className="form-error">{err}</p>}
        <div className="form-actions sticky">
          <button type="button" className="btn ghost" onClick={() => nav(-1)}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Registering…' : 'Register family and open case'}
          </button>
        </div>
      </form>
    </div>
  );
}
