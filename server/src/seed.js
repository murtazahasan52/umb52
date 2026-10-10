/* eslint-disable no-console */
// Demo data: `npm run seed` (adds demo data)  |  `npm run seed -- --reset` (wipes everything first)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Zone = require('./models/Zone');
const Mauze = require('./models/Mauze');
const User = require('./models/User');
const Household = require('./models/Household');
const Case = require('./models/Case');
const Grievance = require('./models/Grievance');
const Enquiry = require('./models/Enquiry');
const AuditLog = require('./models/AuditLog');
const { Counter } = require('./models/Counter');
const { refreshRisk } = require('./utils/warnings');
const { monthKey } = require('./utils/helpers');

const R = (a, b) => Math.round(a + Math.random() * (b - a));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const monthsAgo = (n, day = 5) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, day);
};

const FIRST = ['Mustafa', 'Hussain', 'Taher', 'Murtaza', 'Burhanuddin', 'Qutbuddin', 'Juzar', 'Ali Asgar', 'Shabbir', 'Aliasger', 'Mohammed', 'Huzefa', 'Abbas', 'Yusuf', 'Idris', 'Fakhruddin'];
const FEM = ['Fatema', 'Zainab', 'Sakina', 'Rashida', 'Batul', 'Tasneem', 'Insiya', 'Arwa', 'Nafisa', 'Sherbano'];
const LAST = ['Rampurawala', 'Lokhandwala', 'Saifee', 'Kapadia', 'Jamali', 'Bharmal', 'Barodawala', 'Hakimuddin', 'Tinwala', 'Electricwala', 'Kagalwala', 'Nalwala'];
const BIZ = [
  { type: 'Hardware & paints shop', sector: 'trading' },
  { type: 'Tailoring unit', sector: 'tailoring' },
  { type: 'Home food & tiffin service', sector: 'food production' },
  { type: 'Mobile & electronics repair', sector: 'repair services' },
  { type: 'Kirana / general store', sector: 'trading' },
  { type: 'Steel fabrication', sector: 'small manufacturing' },
  { type: 'Agri inputs & seeds', sector: 'agriculture' },
  { type: 'Garments retail', sector: 'trading' },
];

async function run() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/upliftment_monitor');
  if (process.argv.includes('--reset')) {
    await Promise.all([Zone, Mauze, User, Household, Case, Grievance, Enquiry, AuditLog, Counter].map((M) => M.deleteMany({})));
    console.log('Database cleared');
  }

  const zone = await Zone.findOneAndUpdate({ name: 'Vidarbha Zone (Demo)' }, { name: 'Vidarbha Zone (Demo)', code: 'VID' }, { upsert: true, new: true });
  const zone2 = await Zone.findOneAndUpdate({ name: 'Marathwada Zone (Demo)' }, { name: 'Marathwada Zone (Demo)', code: 'MAR' }, { upsert: true, new: true });

  const mauzeDefs = [
    { name: 'Pandharkawada', code: 'PKD', zone: zone._id, town: 'Pandharkawada', district: 'Yavatmal', type: 'small_town', totalHouseholds: 48, prioritySectors: ['trading', 'tailoring', 'agriculture'] },
    { name: 'Wani', code: 'WNI', zone: zone._id, town: 'Wani', district: 'Yavatmal', type: 'small_town', totalHouseholds: 36, prioritySectors: ['hardware', 'repair services'] },
    { name: 'Achalpur', code: 'ACH', zone: zone._id, town: 'Achalpur', district: 'Amravati', type: 'town', totalHouseholds: 62, prioritySectors: ['garments', 'food production'] },
    { name: 'Karanja Lad', code: 'KRJ', zone: zone._id, town: 'Karanja', district: 'Washim', type: 'village', totalHouseholds: 22, prioritySectors: ['agriculture', 'small trading'] },
    { name: 'Partur', code: 'PTR', zone: zone2._id, town: 'Partur', district: 'Jalna', type: 'village', totalHouseholds: 18, prioritySectors: ['agri inputs'] },
  ];
  const mauzes = [];
  for (const d of mauzeDefs) mauzes.push(await Mauze.findOneAndUpdate({ zone: d.zone, name: d.name }, d, { upsert: true, new: true }));

  async function user(data) {
    let u = await User.findOne({ mobile: data.mobile });
    if (!u) u = await User.create(data);
    return u;
  }
  const pw = 'Demo@123';
  await user({ name: 'HQ Administrator', mobile: process.env.ADMIN_MOBILE || '9999999999', password: process.env.ADMIN_PASSWORD || 'Admin@123', role: 'hq', designation: 'System Administrator' });
  const zbc = await user({ name: 'Shk. Qaidjohar Saifee', mobile: '9000000001', password: pw, role: 'zbc', zone: zone._id, designation: 'ZBC Convenor' });
  const counsellors = {};
  for (const [i, m] of mauzes.entries()) {
    await user({ name: `${pickOne(FIRST)} ${pickOne(LAST)}`, mobile: `90000001${i}0`, password: pw, role: 'mauze', mauze: m._id, zone: m.zone, designation: 'Tijaarat Committee Head' });
    counsellors[m._id] = [
      await user({ name: `${pickOne(FIRST)} ${pickOne(LAST)}`, mobile: `90000002${i}1`, password: pw, role: 'counsellor', mauze: m._id, zone: m.zone, designation: 'Counsellor', expertise: ['accounting', 'stock'] }),
      await user({ name: `${pickOne(FIRST)} ${pickOne(LAST)}`, mobile: `90000002${i}2`, password: pw, role: 'counsellor', mauze: m._id, zone: m.zone, designation: 'Mentor (Businessman)', expertise: ['marketing', 'trading'] }),
    ];
  }

  // ---------------- Households
  const households = [];
  let hhSeq = {};
  for (const m of mauzes) {
    const n = Math.round(m.totalHouseholds * (m.name === 'Partur' ? 0.4 : 0.75));
    hhSeq[m._id] = await Household.countDocuments({ mauze: m._id });
    for (let i = 0; i < n; i += 1) {
      hhSeq[m._id] += 1;
      const woman = Math.random() < 0.2;
      const hasBiz = Math.random() < 0.6;
      const biz = pickOne(BIZ);
      const turnover = hasBiz ? R(30, 400) * 1000 : 0;
      const income = hasBiz ? Math.round(turnover * (0.08 + Math.random() * 0.1)) : R(8, 35) * 1000;
      const cats = [];
      if (hasBiz) cats.push(woman ? 'woman_entrepreneur' : 'business_owner');
      else cats.push(pickOne(['salaried', 'daily_wage', 'salaried']));
      if (income < 12000) cats.push('financial_hardship');
      if (Math.random() < 0.3) cats.push('youth');
      const assessed = Math.random() < 0.82;
      households.push({
        code: `HH-${m.code}-${String(hhSeq[m._id]).padStart(4, '0')}`,
        mauze: m._id,
        zone: m.zone,
        headName: `${woman ? pickOne(FEM) : pickOne(FIRST)} ${pickOne(LAST)}`,
        itsNo: String(R(20000000, 40999999)),
        mobile: `9${R(100000000, 899999999)}`,
        address: `${R(1, 120)}, Bohri Mohalla, ${m.town}`,
        categories: cats,
        totalMembers: R(3, 7),
        earningMembers: R(1, 2),
        mainIncomeSource: hasBiz ? biz.type : pickOne(['Shop salesman', 'Accountant', 'Daily wage', 'Teacher', 'Driver']),
        monthlyHouseholdIncome: income,
        business: hasBiz
          ? { exists: true, name: `${pickOne(['Fakhri', 'Burhani', 'Saifee', 'Mohammedi', 'Najmi'])} ${biz.type.split(' ')[0]}`, type: biz.type, yearsRunning: R(1, 20), monthlyTurnover: turnover, monthlyNetIncome: income, gstRegistered: turnover > 150000, udyamRegistered: Math.random() < 0.4, digitalPayments: Math.random() < 0.7 }
          : { exists: false },
        debts: { total: Math.random() < 0.4 ? R(20, 300) * 1000 : 0, monthlyEmi: Math.random() < 0.3 ? R(2, 12) * 1000 : 0 },
        housing: pickOne(['owned', 'rented', 'family', 'owned']),
        educationNeed: Math.random() < 0.25 ? 'School fees for 2 children' : '',
        skills: pickOne(['Accounting', 'Tailoring', 'Cooking', 'Electrical repair', 'Sales', 'Computer basics']),
        employmentInterests: pickOne(['Expand shop', 'Start online sales', 'Government job', 'Own business', '']),
        existingQH: Math.random() < 0.2,
        needLevel: income < 12000 ? pickOne(['high', 'urgent']) : pickOne(['none', 'low', 'medium']),
        supportPlanIdentified: false,
        assessedAt: assessed ? daysAgo(R(20, 300)) : null,
      });
    }
  }
  const createdHH = await Household.insertMany(households);
  console.log(`Households: ${createdHH.length}`);

  // ---------------- Cases — a spread of realistic situations
  const scenarios = [
    { scheme: 'QH', kind: 'great' },
    { scheme: 'QH', kind: 'great' },
    { scheme: 'QH', kind: 'ok' },
    { scheme: 'QH', kind: 'ok' },
    { scheme: 'QH', kind: 'repaying_not_improving' },
    { scheme: 'QH', kind: 'diverted' },
    { scheme: 'QH', kind: 'overdue' },
    { scheme: 'QH', kind: 'falling_sales' },
    { scheme: 'QH', kind: 'no_utilization' },
    { scheme: 'QH', kind: 'feasibility' },
    { scheme: 'QH', kind: 'pending_decision' },
    { scheme: 'TR', kind: 'tr_good' },
    { scheme: 'TR', kind: 'tr_good' },
    { scheme: 'TR', kind: 'tr_not_applied' },
    { scheme: 'TR', kind: 'planned' },
    { scheme: 'SKILL', kind: 'skill' },
    { scheme: 'SKILL', kind: 'skill' },
    { scheme: 'WELFARE', kind: 'welfare' },
    { scheme: 'QH', kind: 'achieved' },
    { scheme: 'TR', kind: 'identified' },
  ];
  const caseSeq = {};
  const bizHH = createdHH.filter((h) => h.business?.exists && h.assessedAt);
  const otherHH = createdHH.filter((h) => !h.business?.exists && h.assessedAt);
  let made = 0;
  let firstCase;
  for (const [i, s] of scenarios.entries()) {
    const pool = ['SKILL', 'WELFARE'].includes(s.scheme) ? otherHH : bizHH;
    const h = pool[(i * 7) % pool.length];
    const [cou, men] = counsellors[h.mauze];
    caseSeq[s.scheme] = (caseSeq[s.scheme] || 0) + 1;
    const amt = R(5, 30) * 10000;
    const base = { monthlySales: h.business?.monthlyTurnover || 0, netProfit: h.business?.monthlyNetIncome || 0, householdIncome: h.monthlyHouseholdIncome, employees: R(0, 3), debts: h.debts?.total, recordedAt: monthsAgo(9) };
    const c = new Case({
      caseNo: `${s.scheme}-${String(new Date().getFullYear()).slice(-2)}-${String(caseSeq[s.scheme]).padStart(4, '0')}`,
      household: h._id,
      mauze: h.mauze,
      zone: h.zone,
      beneficiaryName: h.headName,
      beneficiaryMobile: h.mobile,
      scheme: s.scheme,
      segment: s.scheme === 'SKILL' ? 'youth' : s.scheme === 'WELFARE' ? 'welfare' : h.categories.includes('woman_entrepreneur') ? 'woman_entrepreneur' : 'existing_business',
      need:
        s.scheme === 'QH'
          ? `Working capital to increase stock for ${h.business?.type || 'business'}`
          : s.scheme === 'TR'
          ? 'Business has no accounting or stock control; wants to start digital sales'
          : s.scheme === 'SKILL'
          ? 'Son (19) needs vocational training and job placement'
          : 'School fees and essential household support for one academic year',
      interventions:
        s.scheme === 'QH' ? ['business_expansion', 'financial_counselling'] : s.scheme === 'TR' ? ['business_formalization', 'business_mentoring'] : s.scheme === 'SKILL' ? ['skill_development', 'employment'] : ['education'],
      planDetails: 'Agreed with family in counselling session; mentor to visit monthly for first 3 months.',
      targetOutcome: s.scheme === 'QH' ? 'Raise monthly net profit by 25% within 12 months' : s.scheme === 'TR' ? 'Maintain daily books, register on Udyam, start UPI & WhatsApp catalogue' : s.scheme === 'SKILL' ? 'Complete course and secure a job within 6 months' : 'Child completes the academic year',
      targetDate: monthsAgo(-6),
      counsellor: cou._id,
      mentor: men._id,
      reviewDate: s.kind === 'overdue' ? daysAgo(12) : new Date(Date.now() + R(3, 40) * 86400000),
      termsExplained: s.kind !== 'identified',
      termsExplainedAt: monthsAgo(9),
      baseline: base,
      amountApplied: ['QH'].includes(s.scheme) ? amt : 0,
      createdBy: cou._id,
      stage: 'planned',
    });
    if (s.kind === 'identified') {
      c.stage = 'identified';
      c.interventions = [];
      c.counsellor = undefined;
    }

    const disburse = (monthsBack, amount) => c.disbursements.push({ amount, date: monthsAgo(monthsBack, 10), mode: 'Bank transfer', reference: `NEFT${R(100000, 999999)}`, tranche: c.disbursements.length + 1 });
    const sanction = (monthsBack) => {
      c.feasibility = {
        purpose: c.need,
        investmentType: pickOne(['working_capital', 'fixed_asset', 'mixed']),
        marketDemand: 'Steady local demand; nearest competitor 3 km away',
        grossMarginPct: R(12, 28),
        projectedMonthlySales: Math.round(base.monthlySales * 1.3),
        projectedMonthlyProfit: Math.round(base.netProfit * 1.3),
        existingLiabilities: base.debts,
        monthlyRepaymentCapacity: Math.round(amt / 18),
        securityOffered: 'Two guarantors from Jamaat',
        documentsVerified: true,
        proposedTenureMonths: 24,
        phasedDisbursement: amt > 150000,
        recommendation: 'Viable — recommend sanction',
        assessedBy: cou._id,
        assessedAt: monthsAgo(monthsBack + 1),
        decision: 'approved',
        decisionReason: 'Cash flow supports repayment; purpose verified',
        decidedBy: zbc._id,
        decidedAt: monthsAgo(monthsBack),
      };
      c.amountSanctioned = amt;
      c.sanctionDate = monthsAgo(monthsBack);
      c.tenureMonths = 24;
      c.installmentAmount = Math.ceil(amt / 24);
      c.stage = 'sanctioned';
    };
    const schedule = (startMonthsBack, payBehaviour) => {
      for (let k = 0; k < 24; k += 1) {
        const due = monthsAgo(startMonthsBack - k, 10);
        const inst = { no: k + 1, dueDate: due, amount: k === 23 ? amt - c.installmentAmount * 23 : c.installmentAmount };
        if (due < new Date()) {
          const late = payBehaviour === 'overdue' && k >= startMonthsBack - 3;
          if (!late) {
            inst.paidAmount = inst.amount;
            inst.paidDate = new Date(due.getTime() + R(0, 5) * 86400000);
          }
        }
        c.repayments.push(inst);
      }
    };
    const recvBase = R(8, 25) * 1000;
    const updates = (n, trendFn) => {
      for (let k = n; k >= 1; k -= 1) {
        const f = trendFn(n - k + 1);
        c.monthlyUpdates.push({
          month: monthKey(monthsAgo(k)),
          sales: Math.round(base.monthlySales * f.sales),
          grossMarginPct: R(14, 26),
          netProfit: Math.round(base.netProfit * f.profit),
          stockValue: R(50, 250) * 1000,
          stockMovement: f.stock || 'normal',
          receivables: Math.round(recvBase * (f.recv || 1)),
          jobsCreated: f.jobs || 0,
          householdIncome: Math.round(base.householdIncome * f.income),
          newCustomers: R(0, 25),
          businessOperating: true,
          source: k % 2 ? 'counsellor' : 'beneficiary',
          reviewed: k > 1,
        });
      }
      c.stage = 'monitoring';
    };
    const util = (pctUsed, verified = true, diverted = false) => {
      const total = c.disbursements.reduce((x, d) => x + d.amount, 0);
      c.utilizations.push({ date: monthsAgo(6, 20), item: 'Stock purchase from wholesaler', amount: Math.round(total * pctUsed * 0.7), vendor: 'Gujarat Traders', invoiceNo: `INV-${R(1000, 9999)}`, verified, approvedPurpose: true, verifiedBy: cou._id, verifiedAt: monthsAgo(6, 25), siteVisit: true, resultingAsset: 'Additional stock on shelves' });
      c.utilizations.push({
        date: monthsAgo(5, 20),
        item: diverted ? 'Family function expenses' : 'Display racks & weighing machine',
        amount: Math.round(total * pctUsed * 0.3),
        vendor: diverted ? '' : 'Local carpenter',
        verified,
        approvedPurpose: !diverted,
        verifiedBy: verified ? cou._id : undefined,
        verifiedAt: verified ? monthsAgo(5, 25) : undefined,
        resultingAsset: diverted ? '' : 'Fixed asset — racks',
      });
    };
    const visit = (monthsBack, obs, action) => c.visits.push({ date: monthsAgo(monthsBack, 15), type: 'quarterly_review', observations: obs, correctiveAction: action, by: men._id });
    const followUp = () => c.visits.push({ date: daysAgo(R(1, 8)), type: 'phone_followup', observations: 'Called beneficiary — business running normally', by: cou._id });
    const training = (program, category, status, applied) => c.trainings.push({ program, category, provider: 'ZBC Training Cell', plannedDate: monthsAgo(4), status, completedDate: status === 'completed' ? monthsAgo(3) : undefined, applied });

    switch (s.kind) {
      case 'great':
      case 'achieved':
        sanction(10);
        disburse(9, amt);
        util(1);
        schedule(8);
        updates(8, (k) => ({ sales: 1 + k * 0.05, profit: 1 + k * 0.06, income: 1 + k * 0.04, jobs: k === 4 ? 1 : 0 }));
        visit(4, 'Stock well organised, footfall increased', 'Continue; explore second outlet');
        visit(1, 'Books maintained daily, repayments regular', 'None');
        followUp();
        training('Daily bookkeeping & cash flow', 'accounting', 'completed', true);
        c.outcome6 = { recordedAt: monthsAgo(3), householdIncome: Math.round(base.householdIncome * 1.2), netProfit: Math.round(base.netProfit * 1.3), employment: 1, financialStability: 'better', selfReliance: 'improving' };
        c.successStory = true;
        if (s.kind === 'achieved') {
          c.outcome12 = { recordedAt: daysAgo(10), householdIncome: Math.round(base.householdIncome * 1.4), netProfit: Math.round(base.netProfit * 1.5), employment: 2, financialStability: 'much_better', selfReliance: 'independent' };
          c.finalStatus = 'achieved';
          c.stage = 'closed';
          c.closedAt = daysAgo(5);
          c.closureNote = 'Target achieved — business self-sustaining';
        }
        break;
      case 'ok':
        sanction(7);
        disburse(6, amt);
        util(0.95);
        schedule(5);
        updates(5, (k) => ({ sales: 1 + k * 0.02, profit: 1 + k * 0.02, income: 1.05 }));
        visit(2, 'Progress steady', 'Introduce UPI QR for counter sales');
        followUp();
        training('Digital payments & UPI', 'digital_payments', 'planned', false);
        c.trainings[c.trainings.length - 1].plannedDate = new Date(Date.now() + 10 * 86400000);
        break;
      case 'repaying_not_improving':
        sanction(9);
        disburse(8, amt);
        util(1);
        schedule(7);
        updates(6, () => ({ sales: 0.98, profit: 0.95, income: 0.97 }));
        visit(3, 'Repaying on time but margins squeezed by competitor', 'Pricing review with mentor');
        followUp();
        break;
      case 'diverted':
        sanction(6);
        disburse(5, amt);
        util(1, true, true);
        schedule(4);
        updates(3, () => ({ sales: 1, profit: 1, income: 1 }));
        break;
      case 'overdue':
        sanction(9);
        disburse(8, amt);
        util(0.9);
        schedule(7, 'overdue');
        updates(6, (k) => ({ sales: 1 - k * 0.03, profit: 1 - k * 0.05, income: 0.95, recv: 1 + k * 0.4 }));
        c.alerts.push({ level: 'medium', reason: 'Repayment delays and rising credit sales', action: 'Mentor to review credit policy, weekly collection plan', mentor: men._id, reviewDate: new Date(Date.now() + 7 * 86400000) });
        break;
      case 'falling_sales':
        sanction(6);
        disburse(5, amt);
        util(1);
        schedule(4);
        updates(4, (k) => ({ sales: 1.05 - k * 0.07, profit: 1 - k * 0.08, income: 1, stock: k > 2 ? 'slow' : 'normal' }));
        break;
      case 'no_utilization':
        sanction(3);
        disburse(2, amt);
        break;
      case 'feasibility':
        c.feasibility = { purpose: c.need, investmentType: 'working_capital', marketDemand: 'To be verified', assessedBy: cou._id, assessedAt: daysAgo(5), decision: 'pending' };
        c.stage = 'feasibility';
        break;
      case 'pending_decision':
        c.feasibility = { purpose: c.need, investmentType: 'fixed_asset', marketDemand: 'Strong — only fabrication unit in town', grossMarginPct: 22, projectedMonthlySales: Math.round(base.monthlySales * 1.4), projectedMonthlyProfit: Math.round(base.netProfit * 1.4), existingLiabilities: base.debts, monthlyRepaymentCapacity: Math.round(amt / 20), securityOffered: 'Machinery hypothecation + 2 guarantors', documentsVerified: true, proposedTenureMonths: 20, phasedDisbursement: true, recommendation: 'Recommend sanction in 2 tranches', assessedBy: cou._id, assessedAt: daysAgo(8), decision: 'pending' };
        c.stage = 'feasibility';
        break;
      case 'tr_good':
        c.stage = 'monitoring';
        training('Stock management & reordering', 'stock_management', 'completed', true);
        training('GST & Udyam registration', 'gst_udyam', 'completed', true);
        training('WhatsApp Business & online sales', 'online_sales', 'ongoing', false);
        updates(5, (k) => ({ sales: 1 + k * 0.04, profit: 1 + k * 0.05, income: 1 + k * 0.03 }));
        visit(2, 'Udyam registered, books started', 'Start WhatsApp catalogue');
        followUp();
        break;
      case 'tr_not_applied':
        c.stage = 'monitoring';
        training('Pricing & costing workshop', 'pricing', 'completed', false);
        training('Daily bookkeeping', 'accounting', 'completed', false);
        updates(3, () => ({ sales: 1, profit: 0.98, income: 1 }));
        break;
      case 'planned':
        training('Mentorship — retail layout', 'mentorship', 'planned', false);
        c.trainings[0].plannedDate = new Date(Date.now() + 15 * 86400000);
        break;
      case 'skill':
        c.stage = 'monitoring';
        training('Electrician course (ITI short-term)', 'vocational', i % 2 ? 'completed' : 'ongoing', i % 2 === 1);
        c.monthlyUpdates.push({ month: monthKey(monthsAgo(1)), householdIncome: Math.round(base.householdIncome * (i % 2 ? 1.25 : 1)), jobsCreated: i % 2 ? 1 : 0, familyMembersEmployed: i % 2 ? 1 : 0, source: 'counsellor' });
        break;
      case 'welfare':
        c.stage = 'monitoring';
        c.amountSanctioned = 24000;
        c.disbursements.push({ amount: 24000, date: monthsAgo(4), mode: 'Direct to school', reference: 'Fee receipt', tranche: 1 });
        c.utilizations.push({ date: monthsAgo(4), item: 'School fees paid directly', amount: 24000, verified: true, approvedPurpose: true, verifiedAt: monthsAgo(4), resultingAsset: 'Education continued' });
        c.monthlyUpdates.push({ month: monthKey(monthsAgo(1)), householdIncome: base.householdIncome, educationContinuing: true, source: 'counsellor' });
        break;
      default:
        break;
    }
    refreshRisk(c);
    c.log.push({ at: monthsAgo(9), byName: 'Seed', action: 'Case opened (demo data)' });
    await c.save();
    await Household.updateOne({ _id: h._id }, { supportPlanIdentified: true });
    if (!firstCase && s.kind === 'great') firstCase = c;
    made += 1;
  }
  await Counter.findByIdAndUpdate('case-QH', { seq: caseSeq.QH || 0 }, { upsert: true });
  await Counter.findByIdAndUpdate('case-TR', { seq: caseSeq.TR || 0 }, { upsert: true });
  await Counter.findByIdAndUpdate('case-SKILL', { seq: caseSeq.SKILL || 0 }, { upsert: true });
  await Counter.findByIdAndUpdate('case-WELFARE', { seq: caseSeq.WELFARE || 0 }, { upsert: true });
  for (const m of mauzes) await Counter.findByIdAndUpdate(`hh-${m._id}`, { seq: hhSeq[m._id] }, { upsert: true });
  console.log(`Cases: ${made}`);

  // Beneficiary app login for one demo family
  if (firstCase) {
    let b = await User.findOne({ mobile: '9000000099' });
    if (!b) b = await User.create({ name: firstCase.beneficiaryName, mobile: '9000000099', password: pw, role: 'beneficiary', mauze: firstCase.mauze, zone: firstCase.zone, household: firstCase.household });
    await Case.updateOne({ _id: firstCase._id }, { beneficiaryUser: b._id });
  }

  // Grievances & enquiries
  const g = [
    { subject: 'Delay in second tranche', category: 'disbursement', status: 'resolved', createdAt: daysAgo(40), resolvedAt: daysAgo(32) },
    { subject: 'Application not responded to', category: 'delay', status: 'resolved', createdAt: daysAgo(30), resolvedAt: daysAgo(5) },
    { subject: 'Need to reschedule installment', category: 'repayment', status: 'in_progress', createdAt: daysAgo(6) },
    { subject: 'Eligibility clarification', category: 'eligibility', status: 'open', createdAt: daysAgo(2) },
  ];
  for (const [i, x] of g.entries()) {
    await Grievance.create({ ...x, ticketNo: `GRV-${String(i + 1).padStart(5, '0')}`, name: `${pickOne(FIRST)} ${pickOne(LAST)}`, mobile: `98${R(10000000, 99999999)}`, mauze: mauzes[i % 4]._id, zone: zone._id, message: 'Demo grievance message.', response: x.status === 'resolved' ? 'Resolved after discussion with committee.' : '' }).catch(() => {});
  }
  await Counter.findByIdAndUpdate('grievance', { seq: g.length }, { upsert: true });
  const e = ['business', 'qardan_hasana', 'skill_training', 'education'];
  for (const [i, t] of e.entries()) {
    await Enquiry.create({ refNo: `REQ-${String(i + 1).padStart(5, '0')}`, name: `${pickOne(FEM)} ${pickOne(LAST)}`, mobile: `97${R(10000000, 99999999)}`, mauze: mauzes[i]._id, zone: mauzes[i].zone, supportType: t, message: 'Would like guidance (demo request).', status: i ? 'new' : 'contacted' }).catch(() => {});
  }
  await Counter.findByIdAndUpdate('enquiry', { seq: e.length }, { upsert: true });

  console.log('\nDemo logins (password Demo@123 unless noted):');
  console.log(`  HQ admin        ${process.env.ADMIN_MOBILE || '9999999999'} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  console.log('  ZBC             9000000001');
  console.log('  Mauze head      9000000100 (Pandharkawada)');
  console.log('  Counsellor      9000000201 (Pandharkawada)');
  console.log('  Beneficiary app 9000000099');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
