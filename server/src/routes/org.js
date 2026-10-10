// Zones (ZBC) and Mauzes
const router = require('express').Router();
const Zone = require('../models/Zone');
const Mauze = require('../models/Mauze');
const Household = require('../models/Household');
const { requireAuth, allow } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../config/constants');
const { ah, audit, pick } = require('../utils/helpers');

router.use(requireAuth, allow(...STAFF_ROLES));

// ---------- Zones
router.get(
  '/zones',
  ah(async (req, res) => {
    const filter = req.user.role === ROLES.HQ ? {} : { _id: req.user.zone };
    res.json(await Zone.find(filter).sort('name'));
  })
);

router.post(
  '/zones',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    const z = await Zone.create(pick(req.body, ['name', 'code', 'notes']));
    audit(req, 'create', 'Zone', z._id, z.name);
    res.status(201).json(z);
  })
);

router.put(
  '/zones/:id',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    const z = await Zone.findByIdAndUpdate(req.params.id, pick(req.body, ['name', 'code', 'notes']), { new: true, runValidators: true });
    res.json(z);
  })
);

router.delete(
  '/zones/:id',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    if (await Mauze.exists({ zone: req.params.id })) return res.status(400).json({ message: 'Zone has Mauzes — move or delete them first' });
    await Zone.findByIdAndDelete(req.params.id);
    audit(req, 'delete', 'Zone', req.params.id);
    res.json({ ok: true });
  })
);

// ---------- Mauzes
const MAUZE_FIELDS = ['name', 'code', 'zone', 'town', 'district', 'state', 'type', 'totalHouseholds', 'prioritySectors', 'active'];

router.get(
  '/mauzes',
  ah(async (req, res) => {
    const f = {};
    if (req.user.role === ROLES.ZBC) f.zone = req.user.zone;
    if ([ROLES.MAUZE, ROLES.COUNSELLOR].includes(req.user.role)) f._id = req.user.mauze;
    if (req.query.zone && req.user.role === ROLES.HQ) f.zone = req.query.zone;
    const list = await Mauze.find(f).populate('zone', 'name code').sort('name').lean();
    const counts = await Household.aggregate([
      { $match: { mauze: { $in: list.map((m) => m._id) } } },
      { $group: { _id: '$mauze', total: { $sum: 1 }, assessed: { $sum: { $cond: [{ $ifNull: ['$assessedAt', false] }, 1, 0] } } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    res.json(list.map((m) => ({ ...m, registered: map[m._id]?.total || 0, assessed: map[m._id]?.assessed || 0 })));
  })
);

router.post(
  '/mauzes',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    const data = pick(req.body, MAUZE_FIELDS);
    if (req.user.role === ROLES.ZBC) data.zone = req.user.zone;
    const m = await Mauze.create(data);
    audit(req, 'create', 'Mauze', m._id, m.name);
    res.status(201).json(m);
  })
);

router.put(
  '/mauzes/:id',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const m = await Mauze.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === ROLES.ZBC && String(m.zone) !== String(req.user.zone)) return res.status(403).json({ message: 'Not in your zone' });
    if (req.user.role === ROLES.MAUZE && String(m._id) !== String(req.user.mauze)) return res.status(403).json({ message: 'Not your Mauze' });
    const data = pick(req.body, req.user.role === ROLES.MAUZE ? ['totalHouseholds', 'prioritySectors', 'town'] : MAUZE_FIELDS);
    if (req.user.role === ROLES.ZBC) delete data.zone;
    Object.assign(m, data);
    await m.save();
    audit(req, 'update', 'Mauze', m._id, m.name);
    res.json(m);
  })
);

router.delete(
  '/mauzes/:id',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    if (await Household.exists({ mauze: req.params.id })) return res.status(400).json({ message: 'Mauze has households — mark it inactive instead' });
    await Mauze.findByIdAndDelete(req.params.id);
    audit(req, 'delete', 'Mauze', req.params.id);
    res.json({ ok: true });
  })
);

module.exports = router;
