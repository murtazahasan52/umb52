// Beneficiary app — family sees its own plan, repayments, trainings and submits monthly updates
const router = require('express').Router();
const Case = require('../models/Case');
const { requireAuth, allow } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { ah, pick } = require('../utils/helpers');
const { refreshRisk, financials, improvement } = require('../utils/warnings');

router.use(requireAuth, allow(ROLES.BENEFICIARY));

// Fields a beneficiary may see — no internal risk notes, committee reasons or confidential notes
function view(c) {
  const f = financials(c);
  return {
    _id: c._id,
    caseNo: c.caseNo,
    scheme: c.scheme,
    stage: c.stage,
    finalStatus: c.finalStatus,
    mauze: c.mauze?.name,
    counsellor: c.counsellor ? { name: c.counsellor.name, mobile: c.counsellor.mobile } : null,
    mentor: c.mentor ? { name: c.mentor.name, mobile: c.mentor.mobile } : null,
    need: c.need,
    interventions: c.interventions,
    planDetails: c.planDetails,
    targetOutcome: c.targetOutcome,
    targetDate: c.targetDate,
    reviewDate: c.reviewDate,
    amountSanctioned: c.amountSanctioned,
    tenureMonths: c.tenureMonths,
    installmentAmount: c.installmentAmount,
    disbursements: (c.disbursements || []).map((d) => pick(d, ['amount', 'date', 'tranche'])),
    repayments: (c.repayments || []).map((r) => pick(r, ['_id', 'no', 'dueDate', 'amount', 'paidAmount', 'paidDate'])),
    utilizations: (c.utilizations || []).map((u) => pick(u, ['date', 'item', 'amount', 'verified'])),
    trainings: (c.trainings || []).map((t) => pick(t, ['program', 'category', 'plannedDate', 'status', 'completedDate'])),
    monthlyUpdates: (c.monthlyUpdates || [])
      .map((u) => pick(u, ['_id', 'month', 'sales', 'netProfit', 'householdIncome', 'jobsCreated', 'newCustomers', 'challenges', 'source']))
      .sort((a, b) => (a.month < b.month ? 1 : -1)),
    baseline: c.baseline,
    financials: { sanctioned: f.sanctioned, disbursed: f.disbursed, repaid: f.repaid, outstanding: f.outstanding, overdueAmount: f.overdueAmount },
    improvement: improvement(c),
  };
}

router.get(
  '/cases',
  ah(async (req, res) => {
    const cases = await Case.find({ $or: [{ beneficiaryUser: req.user._id }, { household: req.user.household || null }] })
      .populate('mauze', 'name')
      .populate('counsellor mentor', 'name mobile')
      .sort('-createdAt');
    res.json(cases.map(view));
  })
);

router.post(
  '/cases/:id/monthly',
  ah(async (req, res) => {
    const c = await Case.findOne({ _id: req.params.id, $or: [{ beneficiaryUser: req.user._id }, { household: req.user.household || null }] });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    const data = pick(req.body, [
      'month',
      'sales',
      'netProfit',
      'grossMarginPct',
      'stockValue',
      'receivables',
      'jobsCreated',
      'familyMembersEmployed',
      'newCustomers',
      'householdIncome',
      'businessOperating',
      'educationContinuing',
      'challenges',
    ]);
    if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) return res.status(400).json({ message: 'Select the month' });
    const existing = c.monthlyUpdates.find((u) => u.month === data.month);
    if (existing) {
      if (existing.reviewed) return res.status(400).json({ message: 'This month has already been reviewed by your counsellor' });
      Object.assign(existing, data, { source: 'beneficiary', by: req.user._id });
    } else {
      c.monthlyUpdates.push({ ...data, source: 'beneficiary', by: req.user._id });
    }
    c.log.push({ by: req.user._id, byName: req.user.name, action: `Beneficiary submitted update for ${data.month}` });
    refreshRisk(c);
    await c.save();
    await c.populate('mauze', 'name');
    await c.populate('counsellor mentor', 'name mobile');
    res.status(201).json(view(c));
  })
);

module.exports = router;
