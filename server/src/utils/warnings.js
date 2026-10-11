// Early-warning engine (Section 6 of the framework)
// HIGH   -> immediate intervention
// MEDIUM -> corrective action / recovery plan
// ON_TRACK -> continue and develop
const { BUSINESS_SCHEMES, RISK } = require('../config/constants');
const { sum, daysBetween } = require('./helpers');

function overdueInstallments(c, now = new Date()) {
  return (c.repayments || []).filter((r) => r.dueDate && new Date(r.dueDate) < now && (r.paidAmount || 0) < (r.amount || 0));
}

function evaluateCase(c, now = new Date()) {
  const high = [];
  const medium = [];
  if (c.stage === 'closed' || c.finalStatus === 'closed') return { risk: RISK.ON_TRACK, reasons: [] };

  const disbursed = sum(c.disbursements, (d) => d.amount);
  const verifiedUse = sum((c.utilizations || []).filter((u) => u.verified && u.approvedPurpose), (u) => u.amount);
  const diverted = (c.utilizations || []).filter((u) => u.approvedPurpose === false);
  const updates = [...(c.monthlyUpdates || [])].sort((a, b) => (a.month < b.month ? -1 : 1));
  const last = updates[updates.length - 1];
  const isBusiness = c.caseType ? c.caseType === 'business' && BUSINESS_SCHEMES.includes(c.scheme) : BUSINESS_SCHEMES.includes(c.scheme);

  // ---- Manual alerts raised by the committee
  (c.alerts || [])
    .filter((a) => !a.resolved)
    .forEach((a) => (a.level === 'high' ? high : medium).push(`Open alert: ${a.reason}`));

  // ---- HIGH priority rules
  if (diverted.length) high.push(`Funds used for unapproved purpose (${diverted.length} entr${diverted.length > 1 ? 'ies' : 'y'})`);
  if (isBusiness && last && last.businessOperating === false) high.push('Business reported closed / not operating');
  if (c.caseType === 'education' && c.education?.studyStatus === 'dropped') high.push('Student has dropped out of studies');
  const overdue = overdueInstallments(c, now);
  const seriousOverdue = overdue.filter((r) => daysBetween(r.dueDate, now) > 60);
  if (seriousOverdue.length >= 2) high.push(`${seriousOverdue.length} installments overdue more than 60 days`);

  // ---- MEDIUM priority rules
  const firstDisb = (c.disbursements || []).map((d) => new Date(d.date)).sort((a, b) => a - b)[0];
  if (firstDisb && daysBetween(firstDisb, now) > 30 && !(c.utilizations || []).length)
    medium.push('No utilization recorded within 30 days of disbursement');
  else if (firstDisb && daysBetween(firstDisb, now) > 60 && disbursed > 0 && verifiedUse < disbursed * 0.8)
    medium.push(`Only ${Math.round((verifiedUse / disbursed) * 100)}% of disbursed amount verified after 60 days`);

  if (overdue.length && !seriousOverdue.length) medium.push(`${overdue.length} installment(s) overdue`);
  else if (overdue.length && seriousOverdue.length === 1) medium.push('Repayment delays beginning');

  if (updates.length >= 3) {
    const [a, b, d] = updates.slice(-3).map((u) => Number(u.sales) || 0);
    if (a > b && b > d) medium.push('Sales falling for 3 consecutive months');
  }
  if (last && last.stockMovement === 'not_moving') medium.push('Stock not moving');
  if (updates.length >= 2) {
    const prev = updates[updates.length - 2];
    if ((Number(last.receivables) || 0) > (Number(prev.receivables) || 0) * 1.3 && (Number(last.receivables) || 0) > 10000)
      medium.push('Receivables increasing sharply');
  }
  if (c.reviewDate && new Date(c.reviewDate) < now && c.stage !== 'identified') medium.push('Scheduled review date has passed');

  const activeMonitoring = ['disbursed', 'monitoring'].includes(c.stage) || (c.scheme === 'TR' && ['sanctioned', 'monitoring'].includes(c.stage));
  if (isBusiness && activeMonitoring) {
    const lastDate = last ? new Date(`${last.month}-28`) : firstDisb;
    if (lastDate && daysBetween(lastDate, now) > 45) medium.push('No monthly progress update in over 45 days');
  }
  if (last && last.educationContinuing === false && c.caseType === 'education') medium.push('Education reported as not continuing');
  if (c.caseType === 'housing' && firstDisb && daysBetween(firstDisb, now) > 120 && c.housing?.completionStatus !== 'completed')
    medium.push('Housing work not confirmed complete 4 months after disbursement');
  const trainingNotApplied = (c.trainings || []).filter((t) => t.status === 'completed' && !t.applied);
  if (trainingNotApplied.length && c.scheme === 'TR') medium.push('Training completed but not being applied');
  const missedTraining = (c.trainings || []).filter((t) => t.status === 'planned' && t.plannedDate && daysBetween(t.plannedDate, now) > 30);
  if (missedTraining.length) medium.push('Planned training not attended');

  if (high.length) return { risk: RISK.HIGH, reasons: [...high, ...medium] };
  if (medium.length) return { risk: RISK.MEDIUM, reasons: medium };
  return { risk: RISK.ON_TRACK, reasons: [] };
}

// Livelihood improvement — is the beneficiary actually better off than baseline?
function improvement(c) {
  const b = c.baseline || {};
  const latestOutcome = c.outcome12 || c.outcome6;
  const updates = [...(c.monthlyUpdates || [])].sort((a, z) => (a.month < z.month ? -1 : 1));
  const last = updates[updates.length - 1];
  const incomeNow = latestOutcome?.householdIncome ?? last?.householdIncome;
  const profitNow = latestOutcome?.netProfit ?? last?.netProfit;
  const hasData = incomeNow != null || profitNow != null;
  if (!hasData) return { hasData: false, improved: false };
  const incomeUp = b.householdIncome != null && incomeNow != null ? incomeNow > b.householdIncome : null;
  const profitUp = b.netProfit != null && profitNow != null ? profitNow > b.netProfit : null;
  const jobs = latestOutcome?.employment ?? sum(updates, (u) => u.jobsCreated);
  const improved = incomeUp === true || profitUp === true || (jobs > 0 && incomeUp !== false);
  return {
    hasData: true,
    improved,
    incomeNow,
    profitNow,
    incomeChange: b.householdIncome != null && incomeNow != null ? incomeNow - b.householdIncome : null,
    profitChange: b.netProfit != null && profitNow != null ? profitNow - b.netProfit : null,
  };
}

function financials(c) {
  const disbursed = sum(c.disbursements, (d) => d.amount);
  const utilized = sum(c.utilizations, (u) => u.amount);
  const verified = sum((c.utilizations || []).filter((u) => u.verified && u.approvedPurpose), (u) => u.amount);
  const diverted = sum((c.utilizations || []).filter((u) => u.approvedPurpose === false), (u) => u.amount);
  const due = sum((c.repayments || []).filter((r) => r.dueDate && new Date(r.dueDate) <= new Date()), (r) => r.amount);
  const repaid = sum(c.repayments, (r) => r.paidAmount);
  const overdueList = overdueInstallments(c);
  return {
    sanctioned: c.amountSanctioned || 0,
    disbursed,
    utilized,
    verified,
    diverted,
    totalRepayable: sum(c.repayments, (r) => r.amount),
    due,
    repaid,
    outstanding: Math.max(0, disbursed - repaid),
    overdueCount: overdueList.length,
    overdueAmount: sum(overdueList, (r) => (r.amount || 0) - (r.paidAmount || 0)),
  };
}

function refreshRisk(c) {
  const r = evaluateCase(c);
  c.risk = r.risk;
  c.riskReasons = r.reasons;
  c.riskComputedAt = new Date();
  return c;
}

// Re-evaluate time-based warnings (overdue, missed reviews) for loaded cases and save any that changed.
// Replaces a background timer so it also works on serverless hosting.
async function freshen(cases, Model) {
  const ops = [];
  const now = new Date();
  for (const c of cases) {
    if (c.stage === 'closed') continue;
    const r = evaluateCase(c, now);
    if (r.risk !== c.risk || JSON.stringify(r.reasons) !== JSON.stringify(c.riskReasons || [])) {
      c.risk = r.risk;
      c.riskReasons = r.reasons;
      ops.push({ updateOne: { filter: { _id: c._id }, update: { $set: { risk: r.risk, riskReasons: r.reasons, riskComputedAt: now } } } });
    }
  }
  if (ops.length) await Model.bulkWrite(ops, { ordered: false });
  return ops.length;
}

module.exports = { evaluateCase, improvement, financials, refreshRisk, overdueInstallments, freshen };
