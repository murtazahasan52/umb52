import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Field, Chips, useLoad, Loading, useToast } from '../../ui';
import { CATEGORIES, NEED } from '../../lib';
import MauzeInput, { resolveMauze } from '../../components/MauzeInput';

const blankMember = { name: '', relation: '', age: '', gender: '', occupation: '', earning: false, monthlyIncome: '', education: '', studying: false };

export default function HouseholdForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(id ? null : { categories: [], members: [], business: { exists: false }, debts: {}, assessed: true, mauze: user.mauze?._id || user.mauze });
  const [place, setPlace] = useState({ mauzeName: '', zoneName: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (id)
      api(`/households/${id}`).then((r) => {
        setForm({ ...r.household, mauze: r.household.mauze?._id, assessed: !!r.household.assessedAt });
        setPlace({ mauzeName: r.household.mauze?.name || '', zoneName: '' });
      });
  }, [id]);

  if (!form) return <Loading />;
  const members = form.members || [];
  const setMember = (i, k, v) => setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const body = { ...form, mauze: await resolveMauze(user, place) };
      const r = id ? await api(`/households/${id}`, { method: 'PUT', body }) : await api('/households', { method: 'POST', body });
      toast(id ? 'Household updated' : `Household ${r.code} added`);
      nav(`/admin/households/${r._id}`);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const P = { form, setForm };
  return (
    <div className="page-admin">
      <div className="page-head">
        <div>
          <h1>{id ? `Edit ${form.code}` : 'New household survey'}</h1>
          <p className="sub">Record what the family tells you. Leave fields blank if unknown. This becomes the baseline for every case.</p>
        </div>
      </div>
      <form onSubmit={submit} className="stack">
        <section className="panel">
          <h2>Family</h2>
          <div className="grid-form three">
            <Field label="Head of family" name="headName" required {...P} />
            <Field label="ITS number" name="itsNo" {...P} />
            <Field label="Mobile" name="mobile" type="tel" {...P} />
            <MauzeInput value={place} onChange={setPlace} />
            <Field label="Address" name="address" span={2} {...P} />
            <Chips label="Who is this family?" name="categories" options={CATEGORIES} {...P} hint="Select all that apply" />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Members</h2>
            <button type="button" className="btn ghost sm" onClick={() => setForm((f) => ({ ...f, members: [...(f.members || []), { ...blankMember }] }))}>
              Add member
            </button>
          </div>
          {members.length === 0 ? (
            <p className="muted">Optional. Add members to record earners, students and skills individually.</p>
          ) : (
            <div className="table-wrap">
              <table className="table members">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>Age</th>
                    <th>Occupation / class</th>
                    <th>Earning</th>
                    <th>Income / month</th>
                    <th>Skills</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={i}>
                      <td><input aria-label="Name" value={m.name || ''} onChange={(e) => setMember(i, 'name', e.target.value)} /></td>
                      <td><input aria-label="Relation" value={m.relation || ''} onChange={(e) => setMember(i, 'relation', e.target.value)} /></td>
                      <td><input aria-label="Age" type="number" value={m.age ?? ''} onChange={(e) => setMember(i, 'age', e.target.value)} className="w-sm" /></td>
                      <td><input aria-label="Occupation" value={m.occupation || ''} onChange={(e) => setMember(i, 'occupation', e.target.value)} /></td>
                      <td className="c"><input aria-label="Earning" type="checkbox" checked={!!m.earning} onChange={(e) => setMember(i, 'earning', e.target.checked)} /></td>
                      <td><input aria-label="Income" type="number" value={m.monthlyIncome ?? ''} onChange={(e) => setMember(i, 'monthlyIncome', e.target.value)} /></td>
                      <td><input aria-label="Skills" value={m.skills || ''} onChange={(e) => setMember(i, 'skills', e.target.value)} /></td>
                      <td>
                        <button type="button" className="link-btn danger" onClick={() => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Income and debts</h2>
          <div className="grid-form three">
            <Field label="Main source of income" name="mainIncomeSource" {...P} />
            <Field label="Total members" name="totalMembers" type="number" min={1} {...P} />
            <Field label="Earning members" name="earningMembers" type="number" min={0} {...P} />
            <Field label="Monthly household income (₹)" name="monthlyHouseholdIncome" type="number" {...P} />
            <Field label="Total debts (₹)" name="debts.total" type="number" {...P} />
            <Field label="Monthly EMIs (₹)" name="debts.monthlyEmi" type="number" {...P} />
            <Field label="Debt details" name="debts.details" span={3} {...P} />
          </div>
        </section>

        <section className="panel">
          <h2>Business</h2>
          <Field label="The family runs a business" name="business.exists" type="checkbox" {...P} />
          {form.business?.exists && (
            <div className="grid-form three">
              <Field label="Business name" name="business.name" {...P} />
              <Field label="Type of business" name="business.type" placeholder="Tailoring, kirana, repairs…" {...P} />
              <Field label="Years running" name="business.yearsRunning" type="number" {...P} />
              <Field label="Monthly turnover (₹)" name="business.monthlyTurnover" type="number" {...P} />
              <Field label="Approx. monthly net income (₹)" name="business.monthlyNetIncome" type="number" {...P} />
              <div />
              <Field label="GST registered" name="business.gstRegistered" type="checkbox" {...P} />
              <Field label="Udyam registered" name="business.udyamRegistered" type="checkbox" {...P} />
              <Field label="Accepts digital payments" name="business.digitalPayments" type="checkbox" {...P} />
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Essential needs</h2>
          <div className="grid-form">
            <Field label="Housing" name="housing" type="select" options={{ owned: 'Owned', rented: 'Rented', family: 'Family home', other: 'Other' }} {...P} />
            <Field label="Housing need" name="housingNeed" {...P} />
            <Field label="Education need" name="educationNeed" {...P} />
            <Field label="Healthcare need" name="healthcareNeed" {...P} />
            <Field label="Other essential needs" name="otherNeeds" span={2} {...P} />
          </div>
        </section>

        <section className="panel">
          <h2>Skills and opportunities</h2>
          <div className="grid-form">
            <Field label="Skills in the family" name="skills" type="textarea" rows={2} {...P} />
            <Field label="Employment interests" name="employmentInterests" type="textarea" rows={2} {...P} />
            <Field label="Business opportunities seen" name="businessOpportunities" type="textarea" rows={2} span={2} {...P} />
          </div>
        </section>

        <section className="panel">
          <h2>Existing support and assessment</h2>
          <div className="grid-form three">
            <Field label="Has existing Qardan Hasana" name="existingQH" type="checkbox" {...P} />
            <Field label="Existing QH amount (₹)" name="existingQHAmount" type="number" {...P} />
            <Field label="Receiving Tijaarat Raabehah support" name="existingTR" type="checkbox" {...P} />
            <Field label="Notes on existing support" name="existingSupportNotes" span={3} {...P} />
            <Field label="Level of need" name="needLevel" type="select" options={NEED} {...P} />
            <Field label="Survey completed (counts towards coverage)" name="assessed" type="checkbox" span={2} {...P} />
            <Field label="Confidential notes (staff only)" name="confidentialNotes" type="textarea" span={3} {...P} />
          </div>
        </section>

        {err && <p className="form-error">{err}</p>}
        <div className="form-actions sticky">
          <button type="button" className="btn ghost" onClick={() => nav(-1)}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Saving…' : id ? 'Save changes' : 'Save household'}
          </button>
        </div>
      </form>
    </div>
  );
}
