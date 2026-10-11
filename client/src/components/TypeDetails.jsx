import { Field } from '../ui';
import { CASE_TYPES, HOUSING_PURPOSE, EDU_LEVEL, STUDY_STATUS, BUSINESS_PURPOSE, COMPLETION } from '../lib';

export const TYPE_ICONS = {
  housing: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 22 24 9l16 13" />
      <path d="M12 19v20h24V19" />
      <path d="M20 39V28h8v11" />
    </svg>
  ),
  education: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M4 18 24 9l20 9-20 9z" />
      <path d="M12 22v9c0 3 5 6 12 6s12-3 12-6v-9" />
    </svg>
  ),
  business: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 18h36v22H6z" />
      <path d="M17 18v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" />
      <path d="M6 27h36" />
    </svg>
  ),
};

const HINT = {
  housing: 'Repair, construction, purchase or rent deposit',
  education: 'School, college, professional or skill course',
  business: 'Start, expand or formalise a business',
};

// Big pickable cards: single (value = string) or multiple (value = array)
export function TypePicker({ value, onChange, multiple = false }) {
  const isOn = (k) => (multiple ? (value || []).includes(k) : value === k);
  const toggle = (k) => {
    if (!multiple) return onChange(k);
    const v = value || [];
    return onChange(v.includes(k) ? v.filter((x) => x !== k) : [...v, k]);
  };
  return (
    <div className="type-pick" role={multiple ? 'group' : 'radiogroup'}>
      {Object.entries(CASE_TYPES).map(([k, l]) => (
        <button type="button" key={k} className={`type-opt type-${k} ${isOn(k) ? 'on' : ''}`} aria-pressed={isOn(k)} onClick={() => toggle(k)}>
          {TYPE_ICONS[k]}
          <strong>{l}</strong>
          <span>{HINT[k]}</span>
        </button>
      ))}
    </div>
  );
}

// Type-specific detail fields. `base` is the object key: housing / education / businessDetail (admin)
// or housingRequest / educationRequest / businessRequest (family form)
export function TypeFields({ type, form, setForm, base, family = false }) {
  const P = { form, setForm };
  const n = (k) => `${base}.${k}`;
  if (type === 'housing')
    return (
      <div className="grid-form three">
        <Field label="Help needed for" name={n('purpose')} type="select" options={HOUSING_PURPOSE} {...P} />
        <Field label="Estimated total cost (₹)" name={n('estimatedCost')} type="number" {...P} />
        <Field label="Family can contribute (₹)" name={n('ownContribution')} type="number" {...P} />
        {!family && <Field label="Current housing" name={n('currentHousing')} type="select" options={{ owned: 'Owned', rented: 'Rented', family: 'Family home', other: 'Other' }} {...P} />}
        {!family && <Field label="Property address" name={n('propertyAddress')} span={2} {...P} />}
        <Field label={family ? 'Describe the home and the work needed' : 'Property details / work needed'} name={n('propertyDetails')} type="textarea" rows={2} span={3} {...P} />
        {!family && <Field label="Work status" name={n('completionStatus')} type="select" options={COMPLETION} {...P} />}
      </div>
    );
  if (type === 'education')
    return (
      <div className="grid-form three">
        <Field label="Student name" name={n('studentName')} {...P} />
        <Field label="Relation to head" name={n('relation')} {...P} />
        {!family && <Field label="Age" name={n('age')} type="number" {...P} />}
        {!family && <Field label="Level" name={n('level')} type="select" options={EDU_LEVEL} {...P} />}
        <Field label="Class / course" name={n('course')} {...P} placeholder="Class 9, B.Com 2nd year…" />
        <Field label="School / college / institute" name={n('institution')} {...P} />
        <Field label="Academic year" name={n('academicYear')} {...P} placeholder="2026-27" />
        <Field label="Annual fees (₹)" name={n('annualFees')} type="number" {...P} />
        {!family && <Field label="Other costs: books, travel (₹)" name={n('otherCosts')} type="number" {...P} />}
        {!family && <Field label="Family contribution (₹)" name={n('familyContribution')} type="number" {...P} />}
        <Field label="Last result / marks" name={n('lastResult')} {...P} />
        {!family && <Field label="Study status" name={n('studyStatus')} type="select" options={STUDY_STATUS} {...P} />}
      </div>
    );
  return (
    <div className="grid-form three">
      <Field label="Help needed for" name={n('purpose')} type="select" options={BUSINESS_PURPOSE} {...P} />
      <Field label="Estimated cost (₹)" name={n('estimatedCost')} type="number" {...P} />
      <Field label="Own contribution (₹)" name={n('ownContribution')} type="number" {...P} />
      {!family && <Field label="Business name" name={n('businessName')} {...P} />}
      {!family && <Field label="Business type" name={n('businessType')} {...P} />}
    </div>
  );
}

export function TypeBadge({ type }) {
  if (!type) return null;
  return <span className={`badge tb-${type}`}>{CASE_TYPES[type]}</span>;
}
