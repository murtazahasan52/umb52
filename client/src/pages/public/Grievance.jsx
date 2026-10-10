import { useState } from 'react';
import { api } from '../../api';
import { Field, useLoad, Tabs } from '../../ui';
import { GRIEVANCE_CATEGORIES, date } from '../../lib';

const STATUS = { open: 'Received', in_progress: 'Being looked into', resolved: 'Resolved', rejected: 'Closed' };

export default function Grievance() {
  const [tab, setTab] = useState('new');
  const mauzes = useLoad(() => api('/public/mauzes'), []);
  const opts = Object.fromEntries((mauzes.data || []).map((m) => [m._id, m.name]));

  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  const [track, setTrack] = useState({});
  const [result, setResult] = useState(null);
  const [terr, setTerr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api('/public/grievance', { method: 'POST', body: form });
      setDone(r.ticketNo);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  const find = async (e) => {
    e.preventDefault();
    setTerr('');
    setResult(null);
    try {
      setResult(await api(`/public/grievance/track?ticketNo=${encodeURIComponent(track.ticketNo || '')}&mobile=${encodeURIComponent(track.mobile || '')}`));
    } catch (x) {
      setTerr(x.message);
    }
  };

  return (
    <div className="pub-wrap page narrow">
      <h1>Raise a concern</h1>
      <p className="lede">If a request has been delayed, a decision is unclear, or something did not feel right, tell us. Concerns go to your Zonal Business Council and are answered within 15 days.</p>
      <Tabs
        tabs={[
          { key: 'new', label: 'Raise a concern' },
          { key: 'track', label: 'Track a concern' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'new' &&
        (done ? (
          <div className="done-card">
            <h2>Concern registered</h2>
            <p>
              Your ticket number is <strong className="ref">{done}</strong>. Use it with your mobile number to track the response.
            </p>
          </div>
        ) : (
          <form className="card form-card" onSubmit={submit}>
            <div className="grid-form">
              <Field label="Your name" name="name" form={form} setForm={setForm} required />
              <Field label="Mobile number" name="mobile" type="tel" form={form} setForm={setForm} required />
              <Field label="Your Mauze" name="mauze" type="select" options={opts} form={form} setForm={setForm} />
              <Field label="About" name="category" type="select" options={GRIEVANCE_CATEGORIES} form={form} setForm={setForm} />
              <Field label="Subject" name="subject" form={form} setForm={setForm} required span={2} />
              <Field label="Describe what happened" name="message" type="textarea" rows={5} form={form} setForm={setForm} required span={2} />
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn lg" disabled={busy}>
              {busy ? 'Sending…' : 'Register concern'}
            </button>
          </form>
        ))}
      {tab === 'track' && (
        <form className="card form-card" onSubmit={find}>
          <div className="grid-form">
            <Field label="Ticket number" name="ticketNo" form={track} setForm={setTrack} required placeholder="GRV-00012" />
            <Field label="Mobile number" name="mobile" type="tel" form={track} setForm={setTrack} required />
          </div>
          {terr && <p className="form-error">{terr}</p>}
          <button className="btn">Check status</button>
          {result && (
            <div className="track-result">
              <p>
                <strong>{result.ticketNo}</strong> {result.subject}
              </p>
              <p>
                Status: <strong>{STATUS[result.status]}</strong>, raised {date(result.createdAt)}
                {result.resolvedAt && `, resolved ${date(result.resolvedAt)}`}
              </p>
              {result.response && <p className="response">{result.response}</p>}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
