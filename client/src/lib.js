// Formatting + labels shared across the app

export const inr = (n) => (n == null || n === '' ? '—' : `${Number(n) < 0 ? '−' : ''}₹${Math.abs(Number(n)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
export const inrShort = (n) => {
  if (Number(n) < 0) return `−${inrShort(-Number(n))}`;
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return `₹${v}`;
};
export const num = (n) => (n == null || n === '' ? '—' : Number(n).toLocaleString('en-IN'));
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const monthLabel = (m) => {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const prevMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

export const SCHEMES = {
  QH: 'Qardan Hasana',
  TR: 'Tijaarat Raabehah',
  SKILL: 'Skill & Employment',
  WELFARE: 'Family Welfare',
};

export const ROLES = {
  hq: 'HQ / Scheme authority',
  zbc: 'Zonal Business Council',
  mauze: 'Mauze committee',
  counsellor: 'Counsellor / mentor',
  beneficiary: 'Beneficiary family',
};

export const STAGES = {
  identified: 'Identified',
  planned: 'Plan agreed',
  feasibility: 'Feasibility review',
  sanctioned: 'Sanctioned',
  disbursed: 'Disbursed',
  monitoring: 'Monitoring',
  closed: 'Closed',
};
export const STAGE_ORDER = Object.keys(STAGES);

export const FINAL = {
  ongoing: 'Ongoing',
  achieved: 'Achieved',
  needs_intervention: 'Needs intervention',
  closed: 'Closed',
};

export const RISK = { high: 'Immediate intervention', medium: 'Corrective action', on_track: 'On track' };
export const RISK_SHORT = { high: 'High', medium: 'Medium', on_track: 'On track' };

export const CATEGORIES = {
  business_owner: 'Business owner',
  salaried: 'Salaried',
  daily_wage: 'Daily-wage earner',
  woman_entrepreneur: 'Woman entrepreneur',
  youth: 'Youth',
  student: 'Student',
  financial_hardship: 'Financial hardship',
};

export const INTERVENTIONS = {
  business_expansion: 'Business expansion',
  business_formalization: 'Business formalization',
  employment: 'Employment',
  skill_development: 'Skill development',
  entrepreneurship: 'Entrepreneurship',
  education: 'Education',
  medical: 'Medical',
  housing: 'Housing',
  financial_counselling: 'Financial counselling',
  business_mentoring: 'Business mentoring',
};

export const SEGMENTS = {
  micro_business: 'Micro / home business',
  existing_business: 'Existing business',
  youth: 'Youth development',
  woman_entrepreneur: 'Woman entrepreneur',
  agriculture: 'Agriculture',
  industrial: 'Industrial',
  welfare: 'Family welfare',
};

export const TRAINING = {
  accounting: 'Business accounting',
  pricing: 'Pricing',
  stock_management: 'Stock management',
  cash_flow: 'Cash-flow management',
  gst_udyam: 'GST / Udyam formalization',
  digital_payments: 'Digital payments',
  digital_marketing: 'Digital marketing',
  online_sales: 'Online sales',
  mentorship: 'Mentorship',
  vocational: 'Vocational training',
  other: 'Other',
};

export const NEED = { none: 'No need', low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export const VISIT_TYPES = {
  site_visit: 'Site visit',
  quarterly_review: 'Quarterly review',
  half_yearly_review: 'Half-yearly review',
  phone_followup: 'Phone follow-up',
  counselling: 'Counselling session',
};

export const SUPPORT_TYPES = {
  business: 'Start or grow a business',
  qardan_hasana: 'Qardan Hasana (interest-free assistance)',
  skill_training: 'Skill training',
  employment: 'Job / employment',
  education: 'Education',
  medical: 'Medical',
  housing: 'Housing',
  counselling: 'Financial counselling',
  other: 'Something else',
};

export const GRIEVANCE_CATEGORIES = {
  delay: 'Delay in response',
  eligibility: 'Eligibility',
  disbursement: 'Disbursement',
  repayment: 'Repayment',
  conduct: 'Conduct of a team member',
  other: 'Other',
};

// Deep-set helper for nested form fields: set(obj, 'business.type', v)
export function setPath(obj, path, value) {
  const keys = path.split('.');
  const out = { ...obj };
  let cur = out;
  keys.slice(0, -1).forEach((k) => {
    cur[k] = { ...(cur[k] || {}) };
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
  return out;
}
export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
