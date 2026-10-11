import { Field, Chips } from '../ui';
import { CATEGORIES } from '../lib';

const blankMember = { name: '', relation: '', age: '', gender: '', occupation: '', earning: false, monthlyIncome: '', education: '', studying: false, skills: '' };

// Family / household sections shared by the admin register form and the public family form.
// `simple` uses plainer wording for families filling it on a phone.
export default function FamilyFields({ form, setForm, simple = false, sections = ['family', 'members', 'income', 'needs'] }) {
  const P = { form, setForm };
  const members = form.members || [];
  const setMember = (i, k, v) => setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const addMember = () => setForm((f) => ({ ...f, members: [...(f.members || []), { ...blankMember }] }));
  const removeMember = (i) => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }));

  return (
    <>
      {sections.includes('family') && (
        <section className="panel form-section">
          <h2>{simple ? 'About your family' : 'Family'}</h2>
          <div className="grid-form three">
            <Field label="Head of family (full name)" name="headName" required {...P} />
            <Field label="ITS number" name="itsNo" inputMode="numeric" {...P} />
            <Field label="Mobile number" name="mobile" type="tel" required={simple} {...P} />
            <Field label="Address" name="address" span={3} {...P} />
            <Chips label={simple ? 'Which of these describe your family?' : 'Who is this family?'} name="categories" options={CATEGORIES} {...P} hint="Select all that apply" />
          </div>
        </section>
      )}

      {sections.includes('members') && (
        <section className="panel form-section">
          <div className="panel-head">
            <h2>{simple ? 'Family members' : 'Members'}</h2>
            <button type="button" className="btn ghost sm" onClick={addMember}>
              Add member
            </button>
          </div>
          {members.length === 0 ? (
            <p className="muted small">{simple ? 'Add each person living in your home, including children.' : 'Optional. Add members to record earners, students and skills.'}</p>
          ) : (
            <div className="member-cards">
              {members.map((m, i) => (
                <div className="member-card" key={i}>
                  <div className="member-head">
                    <strong>Member {i + 1}</strong>
                    <button type="button" className="link-btn danger" onClick={() => removeMember(i)}>
                      Remove
                    </button>
                  </div>
                  <div className="grid-form three">
                    <MemberInput label="Name" value={m.name} onChange={(v) => setMember(i, 'name', v)} />
                    <MemberInput label="Relation to head" value={m.relation} onChange={(v) => setMember(i, 'relation', v)} placeholder="Wife, son, daughter…" />
                    <MemberInput label="Age" type="number" value={m.age} onChange={(v) => setMember(i, 'age', v)} />
                    <div className="field">
                      <label>Gender</label>
                      <select value={m.gender || ''} onChange={(e) => setMember(i, 'gender', e.target.value)}>
                        <option value="">Select…</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                    <MemberInput label="Work / class" value={m.occupation} onChange={(v) => setMember(i, 'occupation', v)} placeholder="Shop, job, Class 8, B.Com…" />
                    <MemberInput label="Skills" value={m.skills} onChange={(v) => setMember(i, 'skills', v)} />
                    <label className="check">
                      <input type="checkbox" checked={!!m.earning} onChange={(e) => setMember(i, 'earning', e.target.checked)} />
                      <span>Earns an income</span>
                    </label>
                    {m.earning && <MemberInput label="Income per month (₹)" type="number" value={m.monthlyIncome} onChange={(v) => setMember(i, 'monthlyIncome', v)} />}
                    <label className="check">
                      <input type="checkbox" checked={!!m.studying} onChange={(e) => setMember(i, 'studying', e.target.checked)} />
                      <span>Currently studying</span>
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={addMember}>
                Add another member
              </button>
            </div>
          )}
        </section>
      )}

      {sections.includes('income') && (
        <section className="panel form-section">
          <h2>{simple ? 'Income and work' : 'Income, business and debts'}</h2>
          <div className="grid-form three">
            <Field label="Main source of income" name="mainIncomeSource" {...P} placeholder="Shop, job, daily wage…" />
            <Field label="Total family income per month (₹)" name="monthlyHouseholdIncome" type="number" {...P} />
            <Field label="Earning members" name="earningMembers" type="number" {...P} />
            <Field label={simple ? 'We run a business' : 'The family runs a business'} name="business.exists" type="checkbox" span={3} {...P} />
            {form.business?.exists && (
              <>
                <Field label="Business name" name="business.name" {...P} />
                <Field label="Type of business" name="business.type" {...P} placeholder="Tailoring, kirana, repairs…" />
                <Field label="Years running" name="business.yearsRunning" type="number" {...P} />
                <Field label="Sales per month (₹)" name="business.monthlyTurnover" type="number" {...P} />
                <Field label="Profit per month (₹)" name="business.monthlyNetIncome" type="number" {...P} />
                <div />
                <Field label="GST registered" name="business.gstRegistered" type="checkbox" {...P} />
                <Field label="Udyam registered" name="business.udyamRegistered" type="checkbox" {...P} />
                <Field label="Accepts UPI / digital payments" name="business.digitalPayments" type="checkbox" {...P} />
              </>
            )}
            <Field label="Total loans / debts (₹)" name="debts.total" type="number" {...P} />
            <Field label="Monthly EMI (₹)" name="debts.monthlyEmi" type="number" {...P} />
            <Field label="Loan details" name="debts.details" {...P} />
          </div>
        </section>
      )}

      {sections.includes('needs') && (
        <section className="panel form-section">
          <h2>{simple ? 'Home and needs' : 'Housing and essential needs'}</h2>
          <div className="grid-form">
            <Field label="Your home is" name="housing" type="select" options={{ owned: 'Owned', rented: 'Rented', family: 'Family home', other: 'Other' }} {...P} />
            <Field label="Housing need" name="housingNeed" {...P} placeholder="Repairs, more space, rent…" />
            <Field label="Education need" name="educationNeed" {...P} placeholder="School or college fees…" />
            <Field label="Health need" name="healthcareNeed" {...P} />
            <Field label="Skills in the family" name="skills" {...P} />
            <Field label="Work or business interests" name="employmentInterests" {...P} />
            <Field label="Existing Qardan Hasana" name="existingQH" type="checkbox" {...P} />
            {form.existingQH && <Field label="Existing Qardan Hasana amount (₹)" name="existingQHAmount" type="number" {...P} />}
          </div>
        </section>
      )}
    </>
  );
}

function MemberInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value ?? ''} placeholder={placeholder} inputMode={type === 'number' ? 'numeric' : undefined} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
