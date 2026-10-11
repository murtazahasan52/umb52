// The beneficiary-level record — follows a case from identification to final outcome
const router = require('express').Router();
const Case = require('../models/Case');
const Household = require('../models/Household');
const User = require('../models/User');
const { requireAuth, allow, scopeFilter, canAccessDoc } = require('../middleware/auth');
const { ROLES, STAFF_ROLES, STAGES, CASE_TYPES, CASE_PREFIX, TYPE_SCHEMES } = require('../config/constants');
const { nextSeq } = require('../models/Counter');
const { ah, audit, pick, rx } = require('../utils/helpers');
const { refreshRisk, financials, improvement, freshen } = require('../utils/warnings');

router.use(requireAuth, allow(...STAFF_ROLES));

const SANCTION_ROLES = [ROLES.HQ, ROLES.ZBC]; // authorised review committee
const POP = [
  { path: 'household', select: 'code headName mobile itsNo address monthlyHouseholdIncome mainIncomeSource business categories totalMembers earningMembers members debts housing' },
  { path: 'mauze zone', select: 'name code' },
  { path: 'counsellor mentor createdBy beneficiaryUser', select: 'name mobile designation' },
  { path: 'feasibility.assessedBy feasibility.decidedBy', select: 'name' },
  { path: 'alerts.mentor', select: 'name' },
];

function log(c, req, action) {
  c.log.push({ by: req.user._id, byName: req.user.name, action });
}

async function load(req, res) {
  const c = await Case.findById(req.params.id);
  if (!canAccessDoc(req.user, c)) {
    res.status(404).json({ message: 'Case not found' });
    return null;
  }
  return c;
}

async function saveAndSend(c, req, res, action, status = 200) {
  if (action) log(c, req, action);
  refreshRisk(c);
  await c.save();
  if (action) audit(req, action, 'Case', c._id, c.caseNo);
  const full = await Case.findById(c._id).populate(POP);
  res.status(status).json(present(full));
}

function present(c) {
  const o = c.toObject();
  o.financials = financials(c);
  o.improvement = improvement(c);
  return o;
}

// Move a case forward automatically as data comes in (never backwards)
function advance(c, to) {
  if (STAGES.indexOf(to) > STAGES.indexOf(c.stage)) c.stage = to;
}

// ------------------------------------------------------------------ list
router.get(
  '/',
  ah(async (req, res) => {
    const f = { ...scopeFilter(req.user) };
    const { mauze, zone, caseType, scheme, stage, risk, finalStatus, counsellor, mine, q, page = 1, limit = 50 } = req.query;
    if (mauze && ![ROLES.MAUZE, ROLES.COUNSELLOR].includes(req.user.role)) f.mauze = mauze;
    if (zone && req.user.role === ROLES.HQ) f.zone = zone;
    if (caseType) f.caseType = caseType;
    if (scheme) f.scheme = scheme;
    if (stage) f.stage = stage;
    if (risk) f.risk = risk;
    if (finalStatus) f.finalStatus = finalStatus;
    if (counsellor) f.counsellor = counsellor;
    if (mine === '1') f.$or = [{ counsellor: req.user._id }, { mentor: req.user._id }];
    if (q) f.$and = [{ $or: [{ caseNo: rx(q) }, { beneficiaryName: rx(q) }, { beneficiaryMobile: rx(q) }] }];
    const lim = Math.min(Number(limit) || 50, 500);
    const [items, total] = await Promise.all([
      Case.find(f)
        .select('-log -visits -feasibility -baseline -outcome6 -outcome12 -documents')
        .populate('mauze', 'name')
        .populate('counsellor', 'name')
        .sort('-updatedAt')
        .skip((Number(page) - 1) * lim)
        .limit(lim),
      Case.countDocuments(f),
    ]);
    await freshen(items, Case);
    const HEAVY = ['disbursements', 'utilizations', 'repayments', 'monthlyUpdates', 'trainings', 'alerts', 'previousCases'];
    res.json({
      items: items.map((c) => {
        const o = c.toObject();
        o.financials = financials(c);
        HEAVY.forEach((k) => delete o[k]);
        return o;
      }),
      total,
      page: Number(page),
      pages: Math.ceil(total / lim),
    });
  })
);

// ------------------------------------------------------------------ detail
router.get(
  '/:id',
  ah(async (req, res) => {
    const c = await Case.findById(req.params.id).populate(POP);
    if (!canAccessDoc(req.user, c)) return res.status(404).json({ message: 'Case not found' });
    const history = await Case.find({ household: c.household._id, _id: { $ne: c._id } }).select('caseNo caseType scheme stage finalStatus amountSanctioned createdAt');
    audit(req, 'view', 'Case', c._id, c.caseNo);
    res.json({ ...present(c), history });
  })
);

// ------------------------------------------------------------------ create (Checkpoint 2 + 3)
const PLAN_FIELDS = [
  'beneficiaryName',
  'beneficiaryMobile',
  'segment',
  'caseType',
  'scheme',
  'housing',
  'education',
  'businessDetail',
  'need',
  'interventions',
  'planDetails',
  'targetOutcome',
  'targetDate',
  'counsellor',
  'mentor',
  'reviewDate',
  'termsExplained',
  'matchingNotes',
  'baseline',
  'amountApplied',
  'repeatReason',
  'successStory',
];

router.post(
  '/',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE, ROLES.COUNSELLOR),
  ah(async (req, res) => {
    const h = await Household.findById(req.body.household);
    if (!canAccessDoc(req.user, h)) return res.status(400).json({ message: 'Select a household in your scope' });
    const data = pick(req.body, PLAN_FIELDS);
    if (!CASE_TYPES[data.caseType]) return res.status(400).json({ message: 'Choose the case type: Housing, Education or Business' });
    if (!data.scheme) data.scheme = TYPE_SCHEMES[data.caseType][0];
    const seq = await nextSeq(`case-${data.caseType}`);
    const yy = String(new Date().getFullYear()).slice(-2);
    const prev = await Case.find({ household: h._id }).select('_id');
    const c = new Case({
      ...data,
      beneficiaryName: data.beneficiaryName || h.headName,
      beneficiaryMobile: data.beneficiaryMobile || h.mobile,
      household: h._id,
      mauze: h.mauze,
      zone: h.zone,
      caseNo: `${CASE_PREFIX[data.caseType]}-${yy}-${String(seq).padStart(4, '0')}`,
      previousCases: prev.map((p) => p._id),
      createdBy: req.user._id,
      baseline: {
        recordedAt: new Date(),
        monthlySales: h.business?.monthlyTurnover,
        netProfit: h.business?.monthlyNetIncome,
        householdIncome: h.monthlyHouseholdIncome,
        debts: h.debts?.total,
        ...(data.baseline || {}),
      },
    });
    if (data.termsExplained) c.termsExplainedAt = new Date();
    if (c.need && c.interventions?.length) c.stage = 'planned';
    if (!h.supportPlanIdentified) {
      h.supportPlanIdentified = true;
      await h.save();
    }
    await saveAndSend(c, req, res, 'Case opened', 201);
  })
);

// ------------------------------------------------------------------ update plan
router.put(
  '/:id',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const data = pick(req.body, PLAN_FIELDS);
    if (data.termsExplained && !c.termsExplained) c.termsExplainedAt = new Date();
    if (data.baseline) data.baseline = { ...(c.baseline?.toObject?.() || c.baseline || {}), ...data.baseline };
    ['housing', 'education', 'businessDetail'].forEach((k) => {
      if (data[k]) data[k] = { ...(c[k]?.toObject?.() || c[k] || {}), ...data[k] };
    });
    if (data.caseType && !CASE_TYPES[data.caseType]) delete data.caseType;
    if (data.housing?.completionStatus === 'completed' && !data.housing.completedAt) data.housing.completedAt = new Date();
    Object.assign(c, data);
    if (c.need && c.interventions?.length) advance(c, 'planned');
    await saveAndSend(c, req, res, 'Plan updated');
  })
);

// ------------------------------------------------------------------ stage / status (manual override)
router.patch(
  '/:id/status',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const { stage, finalStatus, closureNote } = req.body;
    if (stage && STAGES.includes(stage)) {
      if (['sanctioned', 'disbursed'].includes(stage) && !SANCTION_ROLES.includes(req.user.role))
        return res.status(403).json({ message: 'Only ZBC / HQ can mark a case sanctioned or disbursed' });
      c.stage = stage;
    }
    if (finalStatus) c.finalStatus = finalStatus;
    if (closureNote !== undefined) c.closureNote = closureNote;
    if (c.stage === 'closed' || ['achieved', 'closed'].includes(c.finalStatus)) {
      c.closedAt = c.closedAt || new Date();
      if (c.finalStatus === 'achieved' || c.finalStatus === 'closed') c.stage = 'closed';
    }
    await saveAndSend(c, req, res, `Status → ${c.stage} / ${c.finalStatus}`);
  })
);

// ------------------------------------------------------------------ Checkpoint 4: feasibility
router.put(
  '/:id/feasibility',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const fields = [
      'purpose',
      'investmentType',
      'marketDemand',
      'grossMarginPct',
      'projectedMonthlySales',
      'projectedMonthlyProfit',
      'existingLiabilities',
      'monthlyRepaymentCapacity',
      'securityOffered',
      'documentsVerified',
      'documentsNotes',
      'proposedTenureMonths',
      'phasedDisbursement',
      'recommendation',
    ];
    Object.assign(c.feasibility, pick(req.body, fields), { assessedBy: req.user._id, assessedAt: new Date() });
    advance(c, 'feasibility');
    await saveAndSend(c, req, res, 'Feasibility assessment saved');
  })
);

router.post(
  '/:id/decision',
  allow(...SANCTION_ROLES),
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const { decision, decisionReason, amountSanctioned, tenureMonths, installmentAmount } = req.body;
    if (!['approved', 'modified', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Choose approve, modify or reject' });
    if (!decisionReason) return res.status(400).json({ message: 'Record the reason for this decision' });
    Object.assign(c.feasibility, { decision, decisionReason, decidedBy: req.user._id, decidedAt: new Date() });
    if (decision === 'rejected') {
      c.finalStatus = 'closed';
      c.stage = 'closed';
      c.closedAt = new Date();
      c.closureNote = `Rejected: ${decisionReason}`;
    } else {
      c.amountSanctioned = Number(amountSanctioned) || c.amountApplied || 0;
      c.tenureMonths = Number(tenureMonths) || c.feasibility.proposedTenureMonths;
      c.installmentAmount = Number(installmentAmount) || (c.tenureMonths ? Math.ceil(c.amountSanctioned / c.tenureMonths) : undefined);
      c.sanctionDate = new Date();
      advance(c, 'sanctioned');
    }
    await saveAndSend(c, req, res, `Decision: ${decision}`);
  })
);

// ------------------------------------------------------------------ disbursements
router.post(
  '/:id/disbursements',
  allow(...SANCTION_ROLES),
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const d = pick(req.body, ['amount', 'date', 'mode', 'reference', 'note']);
    if (!(Number(d.amount) > 0) || !d.date) return res.status(400).json({ message: 'Amount and date are required' });
    const already = c.disbursements.reduce((s, x) => s + x.amount, 0);
    if (c.amountSanctioned && already + Number(d.amount) > c.amountSanctioned)
      return res.status(400).json({ message: `Total disbursed would exceed sanctioned amount (₹${c.amountSanctioned})` });
    c.disbursements.push({ ...d, tranche: c.disbursements.length + 1, by: req.user._id });
    advance(c, 'disbursed');
    await saveAndSend(c, req, res, `Disbursed ₹${d.amount}`);
  })
);

// ------------------------------------------------------------------ repayment schedule & payments (QH)
router.post(
  '/:id/repayments/schedule',
  allow(...SANCTION_ROLES),
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const { startDate, months, amount } = req.body;
    const n = Number(months) || c.tenureMonths;
    const total = c.disbursements.reduce((s, x) => s + x.amount, 0) || c.amountSanctioned;
    if (!n || !startDate) return res.status(400).json({ message: 'Start date and number of months are required' });
    if (c.repayments.some((r) => r.paidAmount > 0)) return res.status(400).json({ message: 'Payments already recorded — edit installments individually' });
    const each = Number(amount) || Math.ceil(total / n);
    const start = new Date(startDate);
    c.repayments = [];
    let remaining = total;
    for (let i = 0; i < n; i += 1) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      const amt = i === n - 1 ? remaining : Math.min(each, remaining);
      remaining -= amt;
      c.repayments.push({ no: i + 1, dueDate: due, amount: amt });
      if (remaining <= 0) break;
    }
    c.tenureMonths = n;
    c.installmentAmount = each;
    await saveAndSend(c, req, res, `Repayment schedule created (${c.repayments.length} installments)`);
  })
);

router.post(
  '/:id/repayments/:rid/pay',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const r = c.repayments.id(req.params.rid);
    if (!r) return res.status(404).json({ message: 'Installment not found' });
    r.paidAmount = Number(req.body.paidAmount ?? r.amount);
    r.paidDate = req.body.paidDate || new Date();
    r.reference = req.body.reference;
    r.note = req.body.note;
    await saveAndSend(c, req, res, `Installment #${r.no} payment ₹${r.paidAmount}`);
  })
);

// ------------------------------------------------------------------ generic sub-records
const SUBS = {
  utilizations: {
    fields: ['date', 'item', 'approvedPurpose', 'amount', 'vendor', 'invoiceNo', 'evidence', 'siteVisit', 'resultingAsset', 'remarks'],
    label: 'Utilization',
  },
  monthlyUpdates: {
    fields: [
      'month',
      'sales',
      'grossMarginPct',
      'netProfit',
      'workingCapital',
      'stockValue',
      'stockMovement',
      'receivables',
      'otherDebtObligations',
      'jobsCreated',
      'familyMembersEmployed',
      'newCustomers',
      'householdIncome',
      'educationContinuing',
      'businessOperating',
      'challenges',
      'notes',
      'reviewed',
    ],
    label: 'Monthly update',
  },
  visits: { fields: ['date', 'type', 'observations', 'financialReview', 'correctiveAction', 'nextReviewDate', 'photos'], label: 'Visit / review' },
  trainings: { fields: ['program', 'category', 'provider', 'plannedDate', 'status', 'completedDate', 'applied', 'notes'], label: 'Training' },
  alerts: { fields: ['level', 'reason', 'action', 'mentor', 'reviewDate', 'referredToCommittee', 'resolved', 'resolution'], label: 'Early-warning alert' },
  repayments: { fields: ['no', 'dueDate', 'amount', 'paidAmount', 'paidDate', 'reference', 'note'], label: 'Installment', roles: SANCTION_ROLES },
  disbursements: { fields: ['amount', 'date', 'mode', 'reference', 'note'], label: 'Disbursement', roles: SANCTION_ROLES, noCreate: true },
  documents: { fields: ['title', 'category', 'url', 'fileName', 'note'], label: 'Document' },
};

function afterSub(c, key, item) {
  if (key === 'monthlyUpdates' || key === 'visits') advance(c, c.stage === 'disbursed' || c.stage === 'sanctioned' ? 'monitoring' : c.stage);
  if (key === 'visits' && item?.nextReviewDate) c.reviewDate = item.nextReviewDate;
  if (key === 'alerts' && item?.resolved && !item.resolvedAt) item.resolvedAt = new Date();
  if (key === 'alerts' && item?.level === 'high' && !item.resolved) c.finalStatus = 'needs_intervention';
  if (key === 'trainings' && item?.status === 'completed' && !item.completedDate) item.completedDate = new Date();
}

router.post(
  '/:id/:sub',
  ah(async (req, res, next) => {
    const cfg = SUBS[req.params.sub];
    if (!cfg || cfg.noCreate) return next();
    if (cfg.roles && !cfg.roles.includes(req.user.role)) return res.status(403).json({ message: 'Not permitted' });
    const c = await load(req, res);
    if (!c) return;
    const data = { ...pick(req.body, cfg.fields), by: req.user._id, byName: req.user.name };
    if (req.params.sub === 'documents' && !/^\/api\/files\/[a-f0-9]{24}$/.test(String(data.url || ''))) return res.status(400).json({ message: 'Upload the file first' });
    if (req.params.sub === 'monthlyUpdates') {
      if (!data.month) return res.status(400).json({ message: 'Month is required' });
      const existing = c.monthlyUpdates.find((u) => u.month === data.month);
      if (existing) return res.status(400).json({ message: `An update for ${data.month} already exists — edit it instead` });
      data.source = 'counsellor';
    }
    c[req.params.sub].push(data);
    const item = c[req.params.sub][c[req.params.sub].length - 1];
    afterSub(c, req.params.sub, item);
    await saveAndSend(c, req, res, `${cfg.label} added`, 201);
  })
);

router.put(
  '/:id/:sub/:sid',
  ah(async (req, res, next) => {
    const cfg = SUBS[req.params.sub];
    if (!cfg) return next();
    if (cfg.roles && !cfg.roles.includes(req.user.role)) return res.status(403).json({ message: 'Not permitted' });
    const c = await load(req, res);
    if (!c) return;
    const item = c[req.params.sub].id(req.params.sid);
    if (!item) return res.status(404).json({ message: 'Record not found' });
    Object.assign(item, pick(req.body, cfg.fields));
    afterSub(c, req.params.sub, item);
    await saveAndSend(c, req, res, `${cfg.label} updated`);
  })
);

router.delete(
  '/:id/:sub/:sid',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res, next) => {
    const cfg = SUBS[req.params.sub];
    if (!cfg) return next();
    if (cfg.roles && !cfg.roles.includes(req.user.role)) return res.status(403).json({ message: 'Not permitted' });
    const c = await load(req, res);
    if (!c) return;
    const item = c[req.params.sub].id(req.params.sid);
    if (!item) return res.status(404).json({ message: 'Record not found' });
    item.deleteOne();
    await saveAndSend(c, req, res, `${cfg.label} removed`);
  })
);

// Verify a utilization entry (Checkpoint 5)
router.post(
  '/:id/utilizations/:sid/verify',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const u = c.utilizations.id(req.params.sid);
    if (!u) return res.status(404).json({ message: 'Record not found' });
    u.verified = req.body.verified !== false;
    u.approvedPurpose = req.body.approvedPurpose !== false;
    u.siteVisit = req.body.siteVisit ?? u.siteVisit;
    u.verifiedBy = req.user._id;
    u.verifiedAt = new Date();
    if (req.body.remarks) u.remarks = req.body.remarks;
    advance(c, 'monitoring');
    await saveAndSend(c, req, res, `Utilization ${u.approvedPurpose ? 'verified' : 'flagged as diverted'} (₹${u.amount})`);
  })
);

// ------------------------------------------------------------------ MPI Upliftment Case Profile
router.put(
  '/:id/mpi',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const body = req.body || {};
    const prev = c.mpi?.toObject?.() || {};
    const next = { ...prev };
    ['jamiat', 'researcher', 'profileDate', 'researcherRemarks', 'dimensions', 'deprivationSummary', 'sdgs', 'objectives', 'indicators', 'experts', 'actionPlan', 'budget', 'consents', 'journal'].forEach((k) => {
      if (body[k] !== undefined) next[k] = body[k];
    });
    if (Array.isArray(next.journal)) next.journal = next.journal.map((j) => ({ ...j, byName: j.byName || req.user.name }));
    next.updatedBy = req.user._id;
    c.mpi = next;
    await saveAndSend(c, req, res, 'MPI case profile updated');
  })
);

// ------------------------------------------------------------------ 6 / 12 month outcomes (Checkpoint 8)
router.put(
  '/:id/outcome/:which',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const key = req.params.which === '12' ? 'outcome12' : 'outcome6';
    c[key] = {
      ...pick(req.body, ['householdIncome', 'netProfit', 'employment', 'educationContinuity', 'financialStability', 'selfReliance', 'notes']),
      recordedAt: new Date(),
      by: req.user._id,
    };
    await saveAndSend(c, req, res, `${key === 'outcome12' ? '12' : '6'}-month outcome recorded`);
  })
);

// ------------------------------------------------------------------ beneficiary app login
router.post(
  '/:id/beneficiary-login',
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    const mobile = String(req.body.mobile || c.beneficiaryMobile || '').replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) return res.status(400).json({ message: 'A valid 10-digit mobile is required' });
    if (!req.body.password || req.body.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    let u = await User.findOne({ mobile });
    if (u && u.role !== ROLES.BENEFICIARY) return res.status(400).json({ message: 'This mobile belongs to a staff account' });
    if (!u) {
      u = new User({ name: c.beneficiaryName, mobile, role: ROLES.BENEFICIARY, zone: c.zone, mauze: c.mauze, household: c.household });
    }
    u.password = req.body.password;
    u.active = true;
    await u.save();
    c.beneficiaryUser = u._id;
    c.beneficiaryMobile = mobile;
    await saveAndSend(c, req, res, 'Beneficiary app login issued');
  })
);

router.delete(
  '/:id',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    const c = await load(req, res);
    if (!c) return;
    await c.deleteOne();
    audit(req, 'delete', 'Case', c._id, c.caseNo);
    res.json({ ok: true });
  })
);

module.exports = router;
