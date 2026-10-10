import { useState } from 'react';
import { api } from '../../api';
import { Field, useLoad } from '../../ui';
import { SUPPORT_TYPES } from '../../lib';

export default function RequestSupport() {
  const mauzes = useLoad(() => api('/public/mauzes'), []);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  const opts = Object.fromEntries((mauzes.data || []).map((m) => [m._id, `${m.name}${m.town && m.town !== m.name ? `, ${m.town}` : ''}`]));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api('/public/enquiry', { method: 'POST', body: form });
      setDone(r.refNo);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="pub-wrap page narrow">
        <div className="done-card">
          <h1>Request received</h1>
          <p>
            Your reference number is <strong className="ref">{done}</strong>. A member of your Mauze committee will contact you on your mobile, usually within a week. Keep
            this number for any follow-up.
          </p>
        </div>
      </div>
    );

  return (
    <div className="pub-wrap page narrow">
      <h1>Request support</h1>
      <p className="lede">
        Tell your Mauze committee what would help your family. A counsellor will meet you, understand your situation and suggest the most suitable support. This is not a
        loan application.
      </p>
      <form className="card form-card" onSubmit={submit}>
        <div className="grid-form">
          <Field label="Your name" name="name" form={form} setForm={setForm} required />
          <Field label="Mobile number" name="mobile" type="tel" form={form} setForm={setForm} required placeholder="10-digit mobile" />
          <Field label="ITS number" name="itsNo" form={form} setForm={setForm} hint="Optional" />
          <Field label="Your Mauze" name="mauze" type="select" options={opts} form={form} setForm={setForm} required />
          <Field label="What kind of help are you looking for?" name="supportType" type="select" options={SUPPORT_TYPES} form={form} setForm={setForm} required span={2} />
          <Field label="What do you do currently?" name="currentOccupation" form={form} setForm={setForm} span={2} placeholder="For example: run a small tailoring unit from home" />
          <Field label="Anything else you would like the counsellor to know" name="message" type="textarea" form={form} setForm={setForm} span={2} rows={4} />
        </div>
        <p className="fine">Your details are shared only with authorised members of your Mauze committee and Zonal Business Council.</p>
        {err && <p className="form-error">{err}</p>}
        <button className="btn lg" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </div>
  );
}
