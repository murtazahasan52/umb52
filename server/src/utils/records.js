// Shared helpers to create households and cases from imports and family forms
const Household = require('../models/Household');
const Case = require('../models/Case');
const Mauze = require('../models/Mauze');
const Zone = require('../models/Zone');
const User = require('../models/User');
const { nextSeq } = require('../models/Counter');
const { refreshRisk } = require('./warnings');
const { CASE_PREFIX, TYPE_SCHEMES } = require('../config/constants');

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function householdCode(m) {
  const seq = await nextSeq(`hh-${m._id}`);
  const prefix = (m.code || m.name.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
  return `HH-${prefix}-${String(seq).padStart(4, '0')}`;
}

// Find a Mauze by name or code; optionally create it (and its zone)
async function resolveMauze(name, zoneName, { create = false, cache = new Map() } = {}) {
  const key = `${String(name).toLowerCase()}|${String(zoneName || '').toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const exact = new RegExp(`^${escape(String(name).trim())}$`, 'i');
  let m = await Mauze.findOne({ $or: [{ name: exact }, { code: exact }] });
  if (!m && create) {
    if (!zoneName) throw new Error(`Mauze "${name}" does not exist. Add a Zone column to create it.`);
    let z = await Zone.findOne({ $or: [{ name: new RegExp(`^${escape(zoneName.trim())}$`, 'i') }, { code: new RegExp(`^${escape(zoneName.trim())}$`, 'i') }] });
    if (!z) z = await Zone.create({ name: zoneName.trim() });
    m = await Mauze.create({ name: String(name).trim(), zone: z._id });
  }
  if (!m) throw new Error(`Mauze "${name}" not found. Add it in Mauzes & zones, or tick "Create missing Mauzes".`);
  cache.set(key, m);
  return m;
}

async function createHousehold(data, m, user) {
  const h = new Household({ ...data, mauze: m._id, zone: m.zone, code: await householdCode(m) });
  if (data.assessed) {
    h.assessedAt = new Date();
    h.assessedBy = user?._id;
  }
  if (h.members?.length) {
    h.totalMembers = Math.max(h.totalMembers || 0, h.members.length);
    const earners = h.members.filter((x) => x.earning).length;
    if (earners) h.earningMembers = earners;
  }
  await h.save();
  return h;
}

async function createCase(h, { caseType = 'business', scheme, housing, education, businessDetail, need, amountApplied, counsellor, counsellorMobile, planDetails, interventions, segment }, user, logText) {
  if (!scheme) scheme = TYPE_SCHEMES[caseType][0];
  const seq = await nextSeq(`case-${caseType}`);
  const yy = String(new Date().getFullYear()).slice(-2);
  let counsellorId = counsellor;
  if (!counsellorId && counsellorMobile) {
    const u = await User.findOne({ mobile: counsellorMobile, role: { $in: ['counsellor', 'mauze', 'zbc'] } });
    counsellorId = u?._id;
  }
  const prev = await Case.find({ household: h._id }).select('_id');
  const c = new Case({
    caseNo: `${CASE_PREFIX[caseType]}-${yy}-${String(seq).padStart(4, '0')}`,
    caseType,
    housing,
    education,
    businessDetail,
    household: h._id,
    mauze: h.mauze,
    zone: h.zone,
    beneficiaryName: h.headName,
    beneficiaryMobile: h.mobile,
    scheme,
    segment,
    need,
    planDetails,
    interventions: interventions || [],
    amountApplied: amountApplied || 0,
    counsellor: counsellorId,
    previousCases: prev.map((p) => p._id),
    createdBy: user?._id,
    stage: 'identified',
    baseline: {
      recordedAt: new Date(),
      monthlySales: h.business?.monthlyTurnover,
      netProfit: h.business?.monthlyNetIncome,
      householdIncome: h.monthlyHouseholdIncome,
      debts: h.debts?.total,
    },
  });
  c.log.push({ by: user?._id, byName: user?.name, action: logText || 'Case opened' });
  refreshRisk(c);
  await c.save();
  if (!h.supportPlanIdentified) await Household.updateOne({ _id: h._id }, { supportPlanIdentified: true });
  return c;
}

module.exports = { resolveMauze, createHousehold, createCase, householdCode };
