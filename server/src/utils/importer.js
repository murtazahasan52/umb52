// Excel / CSV import of the household database (HQ only).
// Columns are matched by header name (case and spacing ignored), so a sheet only needs the columns it has.

const COLUMNS = [
  { key: 'mauze', header: 'Mauze', required: true, example: 'Pandharkawada', help: 'Mauze name or short code, as set up in Mauzes & zones' },
  { key: 'zone', header: 'Zone', example: 'Vidarbha Zone', help: 'Only needed to create a Mauze that does not exist yet' },
  { key: 'headName', header: 'Head of family', required: true, example: 'Mustafa Saifee', aliases: ['name', 'head name', 'family head', 'head of household'] },
  { key: 'itsNo', header: 'ITS number', example: '20312345', aliases: ['its', 'its no', 'its id', 'itsno'] },
  { key: 'mobile', header: 'Mobile', example: '9876543210', aliases: ['mobile number', 'phone', 'contact', 'mobile no'] },
  { key: 'address', header: 'Address', example: '12, Bohri Mohalla' },
  { key: 'categories', header: 'Categories', example: 'Business owner, Youth', help: 'Business owner, Salaried, Daily-wage earner, Woman entrepreneur, Youth, Student, Financial hardship' },
  { key: 'totalMembers', header: 'Total members', example: 5, aliases: ['members', 'family members'] },
  { key: 'earningMembers', header: 'Earning members', example: 2 },
  { key: 'mainIncomeSource', header: 'Main income source', example: 'Hardware shop', aliases: ['occupation', 'income source'] },
  { key: 'monthlyHouseholdIncome', header: 'Monthly household income', example: 25000, aliases: ['monthly income', 'income', 'household income'] },
  { key: 'businessName', header: 'Business name', example: 'Burhani Hardware' },
  { key: 'businessType', header: 'Business type', example: 'Hardware & paints', aliases: ['type of business'] },
  { key: 'monthlyTurnover', header: 'Monthly turnover', example: 150000, aliases: ['turnover'] },
  { key: 'monthlyNetIncome', header: 'Monthly net income', example: 18000, aliases: ['net income', 'business income', 'profit'] },
  { key: 'gstRegistered', header: 'GST registered', example: 'Y' },
  { key: 'udyamRegistered', header: 'Udyam registered', example: 'N' },
  { key: 'debts', header: 'Total debts', example: 50000, aliases: ['debts', 'loans', 'debt'] },
  { key: 'monthlyEmi', header: 'Monthly EMI', example: 3000, aliases: ['emi'] },
  { key: 'housing', header: 'Housing', example: 'Rented', help: 'Owned, Rented, Family, Other' },
  { key: 'housingNeed', header: 'Housing need' },
  { key: 'educationNeed', header: 'Education need', example: 'School fees for 2 children' },
  { key: 'healthcareNeed', header: 'Healthcare need' },
  { key: 'skills', header: 'Skills', example: 'Accounting, tailoring' },
  { key: 'employmentInterests', header: 'Employment interests' },
  { key: 'existingQHAmount', header: 'Existing QH amount', example: 0, aliases: ['existing qardan hasana', 'qh amount'] },
  { key: 'needLevel', header: 'Need level', example: 'Medium', help: 'None, Low, Medium, High, Urgent' },
  { key: 'assessed', header: 'Survey completed', example: 'Y', aliases: ['assessed', 'surveyed'] },
  { key: 'notes', header: 'Notes', aliases: ['remarks', 'comment'] },
  { key: 'caseType', header: 'Case type', example: 'Business', help: 'Fill only to open a case: Housing, Education or Business', aliases: ['case', 'type of case', 'upliftment type'] },
  { key: 'scheme', header: 'Scheme', example: 'QH', help: 'Optional: QH, TR, Skill or Welfare (a suitable one is chosen if blank)' },
  { key: 'need', header: 'Need for support', example: 'Working capital for stock', aliases: ['support needed', 'need'] },
  { key: 'amountApplied', header: 'Amount requested', example: 100000, aliases: ['amount', 'amount applied'] },
  { key: 'counsellorMobile', header: 'Counsellor mobile', example: '9000000201' },
  { key: 'estimatedCost', header: 'Estimated cost', example: 250000, help: 'Housing or business: total cost of the work / plan' },
  { key: 'housingPurpose', header: 'Housing purpose', example: 'Repair', help: 'Purchase, Construction, Repair, Rent deposit, Other' },
  { key: 'studentName', header: 'Student name', example: 'Huzefa Saifee', help: 'Education cases' },
  { key: 'course', header: 'Course / class', example: 'B.Com 2nd year', aliases: ['class', 'course'] },
  { key: 'institution', header: 'Institution', example: 'Hislop College', aliases: ['school', 'college'] },
  { key: 'annualFees', header: 'Annual fees', example: 45000, aliases: ['fees'] },
];

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const HEADER_MAP = {};
COLUMNS.forEach((c) => {
  [c.header, c.key, ...(c.aliases || [])].forEach((h) => {
    HEADER_MAP[norm(h)] = c.key;
  });
});

const CATEGORY_MAP = {
  businessowner: 'business_owner',
  business: 'business_owner',
  salaried: 'salaried',
  service: 'salaried',
  dailywage: 'daily_wage',
  dailywageearner: 'daily_wage',
  labour: 'daily_wage',
  womanentrepreneur: 'woman_entrepreneur',
  womenentrepreneur: 'woman_entrepreneur',
  youth: 'youth',
  student: 'student',
  financialhardship: 'financial_hardship',
  hardship: 'financial_hardship',
};
const SCHEME_MAP = { qh: 'QH', qardanhasana: 'QH', tr: 'TR', tijaaratraabehah: 'TR', tijaarat: 'TR', skill: 'SKILL', skillemployment: 'SKILL', skillandemployment: 'SKILL', employment: 'SKILL', welfare: 'WELFARE', familywelfare: 'WELFARE' };
const TYPE_MAP = { housing: 'housing', house: 'housing', home: 'housing', makan: 'housing', education: 'education', study: 'education', school: 'education', college: 'education', business: 'business', tijarat: 'business', trade: 'business' };
const HPURPOSE_MAP = { purchase: 'purchase', buy: 'purchase', construction: 'construction', build: 'construction', repair: 'repair', renovation: 'repair', rentdeposit: 'rent_deposit', deposit: 'rent_deposit', rent: 'rent_deposit', other: 'other' };
const NEED_MAP = { none: 'none', low: 'low', medium: 'medium', med: 'medium', high: 'high', urgent: 'urgent' };
const HOUSING_MAP = { owned: 'owned', own: 'owned', rented: 'rented', rent: 'rented', family: 'family', familyhome: 'family', other: 'other' };

const num = (v) => {
  if (v === '' || v == null) return undefined;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const yes = (v) => /^(y|yes|true|1|haan|ha)$/i.test(String(v || '').trim());
const text = (v) => (v == null ? '' : String(v).trim());
const digits = (v) => String(v ?? '').replace(/\.0+$/, '').replace(/\D/g, '');

// Turn one raw sheet row (header -> value) into clean fields + list of problems
function normaliseRow(raw) {
  const r = {};
  Object.entries(raw || {}).forEach(([h, v]) => {
    const key = HEADER_MAP[norm(h)];
    if (key && v !== '' && v != null) r[key] = v;
  });
  const errors = [];
  const out = {
    mauze: text(r.mauze),
    zone: text(r.zone),
    headName: text(r.headName),
    itsNo: digits(r.itsNo) || undefined,
    mobile: digits(r.mobile).slice(-10) || undefined,
    address: text(r.address) || undefined,
    categories: text(r.categories)
      .split(/[,;/|]/)
      .map((c) => CATEGORY_MAP[norm(c)])
      .filter(Boolean),
    totalMembers: num(r.totalMembers),
    earningMembers: num(r.earningMembers),
    mainIncomeSource: text(r.mainIncomeSource) || undefined,
    monthlyHouseholdIncome: num(r.monthlyHouseholdIncome),
    business: undefined,
    debts: undefined,
    housing: HOUSING_MAP[norm(r.housing)] || undefined,
    housingNeed: text(r.housingNeed) || undefined,
    educationNeed: text(r.educationNeed) || undefined,
    healthcareNeed: text(r.healthcareNeed) || undefined,
    skills: text(r.skills) || undefined,
    employmentInterests: text(r.employmentInterests) || undefined,
    existingQHAmount: num(r.existingQHAmount),
    needLevel: NEED_MAP[norm(r.needLevel)] || undefined,
    assessed: r.assessed !== undefined ? yes(r.assessed) : undefined,
    confidentialNotes: text(r.notes) || undefined,
    caseType: r.caseType ? TYPE_MAP[norm(r.caseType)] : undefined,
    scheme: r.scheme ? SCHEME_MAP[norm(r.scheme)] : undefined,
    estimatedCost: num(r.estimatedCost),
    housingPurpose: HPURPOSE_MAP[norm(r.housingPurpose)] || undefined,
    studentName: text(r.studentName) || undefined,
    course: text(r.course) || undefined,
    institution: text(r.institution) || undefined,
    annualFees: num(r.annualFees),
    need: text(r.need) || undefined,
    amountApplied: num(r.amountApplied),
    counsellorMobile: digits(r.counsellorMobile).slice(-10) || undefined,
  };
  if (r.businessName || r.businessType || r.monthlyTurnover || r.monthlyNetIncome) {
    out.business = {
      exists: true,
      name: text(r.businessName) || undefined,
      type: text(r.businessType) || undefined,
      monthlyTurnover: num(r.monthlyTurnover),
      monthlyNetIncome: num(r.monthlyNetIncome),
      gstRegistered: r.gstRegistered !== undefined ? yes(r.gstRegistered) : undefined,
      udyamRegistered: r.udyamRegistered !== undefined ? yes(r.udyamRegistered) : undefined,
    };
  }
  if (r.debts !== undefined || r.monthlyEmi !== undefined) out.debts = { total: num(r.debts), monthlyEmi: num(r.monthlyEmi) };
  if (out.existingQHAmount) out.existingQH = true;

  if (!out.headName) errors.push('Head of family is missing');
  if (!out.mauze) errors.push('Mauze is missing');
  if (r.mobile && out.mobile && out.mobile.length !== 10) errors.push('Mobile should have 10 digits');
  if (r.scheme && !out.scheme) errors.push(`Scheme "${r.scheme}" not recognised (use QH, TR, Skill or Welfare)`);
  if (r.caseType && !out.caseType) errors.push(`Case type "${r.caseType}" not recognised (use Housing, Education or Business)`);
  if (!out.caseType && out.scheme) {
    if (['QH', 'TR'].includes(out.scheme)) out.caseType = 'business';
    else errors.push('Add a Case type (Housing, Education or Business) to open a case');
  }
  if (out.caseType && !out.need) errors.push('Need for support is required to open a case');
  const empty = Object.keys(r).length === 0;
  return { row: out, errors, empty };
}

// Remove undefined keys so updates don't wipe existing values
function clean(obj) {
  const o = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const c = clean(v);
      if (Object.keys(c).length) o[k] = c;
    } else if (!(Array.isArray(v) && v.length === 0)) o[k] = v;
  });
  return o;
}

module.exports = { COLUMNS, normaliseRow, clean };
