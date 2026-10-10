// Mauze / ZBC / HQ dashboard — community upliftment scorecard (Section 4)
const router = require('express').Router();
const mongoose = require('mongoose');
const Case = require('../models/Case');
const Household = require('../models/Household');
const Mauze = require('../models/Mauze');
const Grievance = require('../models/Grievance');
const Enquiry = require('../models/Enquiry');
const AuditLog = require('../models/AuditLog');
const { requireAuth, allow, scopeFilter } = require('../middleware/auth');
const { ROLES, STAFF_ROLES, BUSINESS_SCHEMES, SCHEMES } = require('../config/constants');
const { ah, sum, pct, quarterStart, monthKey } = require('../utils/helpers');
const { financials, improvement, evaluateCase, freshen } = require('../utils/warnings');

router.use(requireAuth, allow(...STAFF_ROLES));

const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(String(v)) : undefined);

function buildScope(req) {
  const f = { ...scopeFilter(req.user) };
  if (req.query.zone && req.user.role === ROLES.HQ) f.zone = oid(req.query.zone);
  if (req.query.mauze && [ROLES.HQ, ROLES.ZBC].includes(req.user.role)) f.mauze = oid(req.query.mauze);
  return f;
}

router.get(
  '/',
  ah(async (req, res) => {
    const scope = buildScope(req);
    const mauzeFilter = {};
    if (scope.zone) mauzeFilter.zone = scope.zone;
    if (scope.mauze) mauzeFilter._id = scope.mauze;

    const [cases, mauzes, hhAgg, grievances, newEnquiries] = await Promise.all([
      Case.find(scope).select('-log').populate('mauze', 'name').populate('counsellor', 'name'),
      Mauze.find({ ...mauzeFilter, active: true }).select('name totalHouseholds zone').lean(),
      Household.aggregate([
        { $match: scope },
        {
          $group: {
            _id: '$mauze',
            registered: { $sum: 1 },
            assessed: { $sum: { $cond: [{ $ifNull: ['$assessedAt', false] }, 1, 0] } },
            withPlan: { $sum: { $cond: ['$supportPlanIdentified', 1, 0] } },
          },
        },
      ]),
      Grievance.find(scope).select('status createdAt resolvedAt slaDays eligible').lean(),
      Enquiry.countDocuments({ ...scope, status: 'new' }),
    ]);

    await freshen(cases, Case);
    const now = new Date();
    const qStart = quarterStart(now);
    const active = cases.filter((c) => c.stage !== 'closed');
    const hhMap = Object.fromEntries(hhAgg.map((h) => [String(h._id), h]));

    // 1. Community coverage
    const totalHH = sum(mauzes, (m) => m.totalHouseholds);
    const assessedHH = sum(hhAgg, (h) => h.assessed);
    const withPlanHH = sum(hhAgg, (h) => h.withPlan);

    // 2. Support-plan coverage — documented need, agreed intervention, counsellor, review date
    const planned = active.filter((c) => c.need && c.interventions?.length && c.counsellor && c.reviewDate);

    // 3. Utilization verification
    const disbursedCases = cases.filter((c) => c.disbursements?.length);
    const fullyVerified = disbursedCases.filter((c) => {
      const f = financials(c);
      return f.disbursed > 0 && f.verified >= f.disbursed;
    });

    // 4. Business follow-up this quarter
    const activeBiz = active.filter(
      (c) => BUSINESS_SCHEMES.includes(c.scheme) && ['sanctioned', 'disbursed', 'monitoring'].includes(c.stage)
    );
    const qKey = monthKey(qStart);
    const reviewedThisQ = activeBiz.filter(
      (c) => (c.visits || []).some((v) => new Date(v.date) >= qStart) || (c.monthlyUpdates || []).some((u) => u.month >= qKey)
    );

    // 5. Repayment
    const dueInst = [];
    cases.forEach((c) => (c.repayments || []).forEach((r) => r.dueDate && new Date(r.dueDate) <= now && dueInst.push(r)));
    const onTime = dueInst.filter((r) => r.paidAmount >= r.amount && r.paidDate && new Date(r.paidDate) <= new Date(new Date(r.dueDate).getTime() + 7 * 86400000));
    const overdueInst = dueInst.filter((r) => (r.paidAmount || 0) < r.amount);
    const overdueCases = cases.filter((c) => financials(c).overdueCount > 0);

    // 6. Livelihood improvement
    const imp = cases.map((c) => ({ c, i: improvement(c) })).filter((x) => x.i.hasData);
    const improved = imp.filter((x) => x.i.improved);

    // 7. Capability building
    const trainings = cases.flatMap((c) => c.trainings || []).filter((t) => t.status !== 'dropped');
    const completed = trainings.filter((t) => t.status === 'completed');

    // 8. Grievances (eligible, resolved within SLA)
    const eligibleG = grievances.filter((g) => g.eligible !== false);
    const resolvedInSla = eligibleG.filter(
      (g) => g.status === 'resolved' && g.resolvedAt && (new Date(g.resolvedAt) - new Date(g.createdAt)) / 86400000 <= (g.slaDays || 15)
    );
    const gDue = eligibleG.filter(
      (g) => g.status === 'resolved' || (new Date() - new Date(g.createdAt)) / 86400000 > (g.slaDays || 15)
    );

    const kpi = (key, label, num, den, target, note) => ({ key, label, num, den, pct: pct(num, den), target, note });
    const kpis = [
      kpi('coverage', 'Community coverage', assessedHH, totalHH, 90, 'Households assessed ÷ total households'),
      kpi('plan', 'Support-plan coverage', planned.length, active.length, 100, 'Active cases with need, intervention, counsellor & review date'),
      kpi('utilization', 'Utilization verification', fullyVerified.length, disbursedCases.length, 100, 'Disbursed cases fully verified against approved purpose'),
      kpi('followup', 'Business follow-up', reviewedThisQ.length, activeBiz.length, 90, 'Active business cases reviewed this quarter'),
      kpi('repayment', 'Repayment on time', onTime.length, dueInst.length, null, `${overdueInst.length} installment${overdueInst.length === 1 ? '' : 's'} overdue in ${overdueCases.length} case${overdueCases.length === 1 ? '' : 's'}`),
      kpi('livelihood', 'Livelihood improvement', improved.length, imp.length, null, 'Beneficiaries with improved income / profit / employment vs baseline'),
      kpi('capability', 'Capability building', completed.length, trainings.length, null, 'Planned trainings / mentoring completed'),
      kpi('grievance', 'Grievance resolution', resolvedInSla.length, gDue.length, 90, 'Eligible complaints resolved within service standard'),
    ];

    // The four measurements that must never be merged
    const fin = cases.map((c) => financials(c));
    const money = {
      sanctioned: sum(fin, (f) => f.sanctioned),
      disbursed: sum(fin, (f) => f.disbursed),
      verified: sum(fin, (f) => f.verified),
      diverted: sum(fin, (f) => f.diverted),
      repaid: sum(fin, (f) => f.repaid),
      overdue: sum(fin, (f) => f.overdueAmount),
      outstanding: sum(fin, (f) => f.outstanding),
      outcomesAchieved: cases.filter((c) => c.finalStatus === 'achieved').length,
      improved: improved.length,
    };

    // Scheme-wise (QH and TR measured differently)
    const schemes = Object.keys(SCHEMES).map((s) => {
      const list = cases.filter((c) => c.scheme === s);
      const f = list.map((c) => financials(c));
      const im = list.map((c) => improvement(c)).filter((i) => i.hasData);
      const tr = list.flatMap((c) => c.trainings || []);
      const dueS = list.flatMap((c) => (c.repayments || []).filter((r) => r.dueDate && new Date(r.dueDate) <= now));
      return {
        scheme: s,
        name: SCHEMES[s],
        cases: list.length,
        active: list.filter((c) => c.stage !== 'closed').length,
        sanctioned: sum(f, (x) => x.sanctioned),
        disbursed: sum(f, (x) => x.disbursed),
        verified: sum(f, (x) => x.verified),
        repaid: sum(f, (x) => x.repaid),
        overdueCases: f.filter((x) => x.overdueCount > 0).length,
        repaymentOnTimePct: pct(dueS.filter((r) => r.paidAmount >= r.amount).length, dueS.length),
        repayingButNotImproved: list.filter((c) => financials(c).repaid > 0 && improvement(c).hasData && !improvement(c).improved).length,
        improved: im.filter((i) => i.improved).length,
        withOutcomeData: im.length,
        trainingCompleted: tr.filter((t) => t.status === 'completed').length,
        trainingApplied: tr.filter((t) => t.applied).length,
        trainingTotal: tr.length,
        high: list.filter((c) => c.risk === 'high').length,
        medium: list.filter((c) => c.risk === 'medium').length,
        achieved: list.filter((c) => c.finalStatus === 'achieved').length,
      };
    });

    const risk = {
      high: active.filter((c) => c.risk === 'high').length,
      medium: active.filter((c) => c.risk === 'medium').length,
      on_track: active.filter((c) => c.risk === 'on_track').length,
    };

    const stages = {};
    cases.forEach((c) => {
      stages[c.stage] = (stages[c.stage] || 0) + 1;
    });
    const finalStatus = {};
    cases.forEach((c) => {
      finalStatus[c.finalStatus] = (finalStatus[c.finalStatus] || 0) + 1;
    });

    // Mauze-wise table
    const mauzeTable = mauzes
      .map((m) => {
        const list = cases.filter((c) => String(c.mauze?._id) === String(m._id));
        const f = list.map((c) => financials(c));
        const im = list.map((c) => improvement(c)).filter((i) => i.hasData);
        const hh = hhMap[String(m._id)] || {};
        return {
          _id: m._id,
          name: m.name,
          totalHouseholds: m.totalHouseholds || 0,
          assessed: hh.assessed || 0,
          coveragePct: pct(hh.assessed || 0, m.totalHouseholds || 0),
          cases: list.length,
          active: list.filter((c) => c.stage !== 'closed').length,
          high: list.filter((c) => c.risk === 'high' && c.stage !== 'closed').length,
          medium: list.filter((c) => c.risk === 'medium' && c.stage !== 'closed').length,
          disbursed: sum(f, (x) => x.disbursed),
          verifiedPct: pct(sum(f, (x) => x.verified), sum(f, (x) => x.disbursed)),
          improved: im.filter((i) => i.improved).length,
          withData: im.length,
        };
      })
      .sort((a, b) => b.high - a.high || b.medium - a.medium || a.name.localeCompare(b.name));

    // Early-warning list
    const warnings = active
      .filter((c) => c.risk !== 'on_track')
      .sort((a, b) => (a.risk === b.risk ? 0 : a.risk === 'high' ? -1 : 1))
      .slice(0, 50)
      .map((c) => ({
        _id: c._id,
        caseNo: c.caseNo,
        beneficiaryName: c.beneficiaryName,
        scheme: c.scheme,
        mauze: c.mauze?.name,
        counsellor: c.counsellor?.name,
        risk: c.risk,
        reasons: c.riskReasons,
      }));

    // Reviews due in the next 14 days / overdue
    const in14 = new Date(now.getTime() + 14 * 86400000);
    const dueReviews = active
      .filter((c) => c.reviewDate && new Date(c.reviewDate) <= in14)
      .sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate))
      .slice(0, 30)
      .map((c) => ({
        _id: c._id,
        caseNo: c.caseNo,
        beneficiaryName: c.beneficiaryName,
        mauze: c.mauze?.name,
        counsellor: c.counsellor?.name,
        reviewDate: c.reviewDate,
        overdue: new Date(c.reviewDate) < now,
      }));

    // 12-month money trend
    const trend = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trend.push({ month: monthKey(d), disbursed: 0, repaid: 0, verified: 0 });
    }
    const tIdx = Object.fromEntries(trend.map((t, i) => [t.month, i]));
    cases.forEach((c) => {
      (c.disbursements || []).forEach((d) => {
        const k = monthKey(new Date(d.date));
        if (tIdx[k] != null) trend[tIdx[k]].disbursed += d.amount || 0;
      });
      (c.repayments || []).forEach((r) => {
        if (!r.paidDate) return;
        const k = monthKey(new Date(r.paidDate));
        if (tIdx[k] != null) trend[tIdx[k]].repaid += r.paidAmount || 0;
      });
      (c.utilizations || []).forEach((u) => {
        if (!u.verified || !u.approvedPurpose) return;
        const k = monthKey(new Date(u.verifiedAt || u.date));
        if (tIdx[k] != null) trend[tIdx[k]].verified += u.amount || 0;
      });
    });

    // Repeat applications — growth vs recurring distress
    const repeat = cases.filter((c) => c.previousCases?.length);
    const repeatInfo = {
      total: repeat.length,
      growth: repeat.filter((c) => c.repeatReason === 'growth').length,
      distress: repeat.filter((c) => c.repeatReason === 'distress').length,
      unclassified: repeat.filter((c) => !c.repeatReason).length,
    };

    res.json({
      generatedAt: now,
      totals: {
        mauzes: mauzes.length,
        totalHouseholds: totalHH,
        registered: sum(hhAgg, (h) => h.registered),
        assessed: assessedHH,
        withPlan: withPlanHH,
        cases: cases.length,
        active: active.length,
        newEnquiries,
        openGrievances: grievances.filter((g) => ['open', 'in_progress'].includes(g.status)).length,
        successStories: cases.filter((c) => c.successStory).length,
      },
      kpis,
      money,
      schemes,
      risk,
      stages,
      finalStatus,
      mauzeTable,
      warnings,
      dueReviews,
      trend,
      repeatInfo,
    });
  })
);

// Recompute early-warning flags on demand (also runs daily)
router.post(
  '/recompute-risk',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    const n = await recomputeAll(buildScope(req));
    res.json({ updated: n });
  })
);

async function recomputeAll(filter = {}) {
  const cases = await Case.find({ ...filter, stage: { $ne: 'closed' } });
  let n = 0;
  for (const c of cases) {
    const r = evaluateCase(c);
    if (r.risk !== c.risk || JSON.stringify(r.reasons) !== JSON.stringify(c.riskReasons)) {
      await Case.updateOne({ _id: c._id }, { risk: r.risk, riskReasons: r.reasons, riskComputedAt: new Date() });
      n += 1;
    }
  }
  return n;
}

// ------------------------------------------------------------------ CSV exports
function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

router.get(
  '/export/cases.csv',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const cases = await Case.find(buildScope(req)).populate('mauze', 'name').populate('counsellor', 'name');
    const rows = cases.map((c) => {
      const f = financials(c);
      const i = improvement(c);
      return {
        CaseNo: c.caseNo,
        Beneficiary: c.beneficiaryName,
        Mauze: c.mauze?.name,
        Scheme: SCHEMES[c.scheme],
        Stage: c.stage,
        FinalStatus: c.finalStatus,
        Risk: c.risk,
        Counsellor: c.counsellor?.name,
        ReviewDate: c.reviewDate,
        Applied: c.amountApplied,
        Sanctioned: f.sanctioned,
        Disbursed: f.disbursed,
        UtilizationVerified: f.verified,
        Diverted: f.diverted,
        Repaid: f.repaid,
        OverdueAmount: f.overdueAmount,
        BaselineIncome: c.baseline?.householdIncome,
        CurrentIncome: i.incomeNow,
        BaselineProfit: c.baseline?.netProfit,
        CurrentProfit: i.profitNow,
        Improved: i.hasData ? (i.improved ? 'Yes' : 'No') : 'No data',
        RiskReasons: (c.riskReasons || []).join('; '),
      };
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="cases.csv"');
    res.send(toCsv(rows));
  })
);

router.get(
  '/export/households.csv',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const list = await Household.find(buildScope(req)).populate('mauze', 'name');
    const rows = list.map((h) => ({
      Code: h.code,
      Head: h.headName,
      ITS: h.itsNo,
      Mobile: h.mobile,
      Mauze: h.mauze?.name,
      Categories: (h.categories || []).join('|'),
      Members: h.totalMembers,
      Earning: h.earningMembers,
      MainIncome: h.mainIncomeSource,
      MonthlyIncome: h.monthlyHouseholdIncome,
      Business: h.business?.exists ? h.business.name || h.business.type : '',
      Turnover: h.business?.monthlyTurnover,
      Debts: h.debts?.total,
      NeedLevel: h.needLevel,
      PlanIdentified: h.supportPlanIdentified ? 'Yes' : 'No',
      AssessedOn: h.assessedAt,
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="households.csv"');
    res.send(toCsv(rows));
  })
);

router.get(
  '/audit',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    res.json(await AuditLog.find().sort('-createdAt').limit(Math.min(Number(req.query.limit) || 200, 1000)));
  })
);

module.exports = router;
module.exports.recomputeAll = recomputeAll;
