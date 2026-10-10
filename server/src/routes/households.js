// Checkpoint 1 — household & livelihood survey register
const router = require('express').Router();
const Household = require('../models/Household');
const Mauze = require('../models/Mauze');
const Case = require('../models/Case');
const { requireAuth, allow, scopeFilter, canAccessDoc } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../config/constants');
const { nextSeq } = require('../models/Counter');
const { ah, audit, rx } = require('../utils/helpers');

router.use(requireAuth, allow(...STAFF_ROLES));

const BLOCKED = ['_id', 'code', 'zone', 'createdAt', 'updatedAt', 'assessedBy'];
const clean = (b) => {
  const o = { ...b };
  BLOCKED.forEach((k) => delete o[k]);
  return o;
};

function deriveCounts(h) {
  if (h.members?.length) {
    h.totalMembers = Math.max(h.totalMembers || 0, h.members.length);
    const earners = h.members.filter((m) => m.earning).length;
    if (earners) h.earningMembers = earners;
    const memberIncome = h.members.reduce((s, m) => s + (Number(m.monthlyIncome) || 0), 0);
    if (!h.monthlyHouseholdIncome && memberIncome) h.monthlyHouseholdIncome = memberIncome;
  }
}

router.get(
  '/',
  ah(async (req, res) => {
    const f = { ...scopeFilter(req.user) };
    const { mauze, category, needLevel, assessed, q, page = 1, limit = 50 } = req.query;
    if (mauze && req.user.role !== ROLES.MAUZE && req.user.role !== ROLES.COUNSELLOR) f.mauze = mauze;
    if (category) f.categories = category;
    if (needLevel) f.needLevel = needLevel;
    if (assessed === 'yes') f.assessedAt = { $ne: null };
    if (assessed === 'no') f.assessedAt = null;
    if (q) f.$or = [{ headName: rx(q) }, { code: rx(q) }, { itsNo: rx(q) }, { mobile: rx(q) }];
    const lim = Math.min(Number(limit) || 50, 500);
    const [items, total] = await Promise.all([
      Household.find(f)
        .select('-confidentialNotes -members')
        .populate('mauze', 'name')
        .sort('-updatedAt')
        .skip((Number(page) - 1) * lim)
        .limit(lim),
      Household.countDocuments(f),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / lim) });
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id).populate('mauze zone', 'name').populate('assessedBy', 'name');
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    const cases = await Case.find({ household: h._id }).select('caseNo scheme stage finalStatus risk amountSanctioned createdAt beneficiaryName');
    audit(req, 'view', 'Household', h._id, h.code);
    res.json({ household: h, cases });
  })
);

router.post(
  '/',
  ah(async (req, res) => {
    const data = clean(req.body);
    if ([ROLES.MAUZE, ROLES.COUNSELLOR].includes(req.user.role)) data.mauze = req.user.mauze;
    const m = await Mauze.findById(data.mauze);
    if (!m) return res.status(400).json({ message: 'Select a Mauze' });
    if (!canAccessDoc(req.user, { zone: m.zone, mauze: m._id })) return res.status(403).json({ message: 'Mauze not in your scope' });
    const seq = await nextSeq(`hh-${m._id}`);
    const prefix = (m.code || m.name.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
    const h = new Household({ ...data, zone: m.zone, code: `HH-${prefix}-${String(seq).padStart(4, '0')}` });
    deriveCounts(h);
    if (data.assessed) {
      h.assessedAt = new Date();
      h.assessedBy = req.user._id;
    }
    await h.save();
    audit(req, 'create', 'Household', h._id, h.code);
    res.status(201).json(h);
  })
);

router.put(
  '/:id',
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id);
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    const data = clean(req.body);
    if (data.mauze && String(data.mauze) !== String(h.mauze)) {
      const m = await Mauze.findById(data.mauze);
      if (!m || !canAccessDoc(req.user, { zone: m.zone, mauze: m._id })) return res.status(403).json({ message: 'Mauze not in your scope' });
      h.zone = m.zone;
    }
    Object.assign(h, data);
    deriveCounts(h);
    if (data.assessed && !h.assessedAt) {
      h.assessedAt = new Date();
      h.assessedBy = req.user._id;
    }
    if (data.assessed === false) h.assessedAt = null;
    await h.save();
    audit(req, 'update', 'Household', h._id, h.code);
    res.json(h);
  })
);

router.delete(
  '/:id',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id);
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    if (await Case.exists({ household: h._id })) return res.status(400).json({ message: 'Household has cases and cannot be deleted' });
    await h.deleteOne();
    audit(req, 'delete', 'Household', h._id, h.code);
    res.json({ ok: true });
  })
);

module.exports = router;
