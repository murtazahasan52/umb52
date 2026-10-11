// Fostership and Directory modules (as in the department's Mamur tutorials)
const router = require('express').Router();
const { Foster, Professional, OfficeContact, PROFESSIONAL_CATEGORIES } = require('../models/Directory');
const Mauze = require('../models/Mauze');
const { requireAuth, allow } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../config/constants');
const { ah, audit, pick, rx } = require('../utils/helpers');

router.use(requireAuth, allow(...STAFF_ROLES));

const zoneScope = (u) => (u.role === ROLES.HQ ? {} : { zone: u.zone });
const digits = (v) => String(v || '').replace(/\D/g, '');
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ================================================================ FOSTERSHIP
// ?all=1 lets HQ / ZBC see everyone's list in their scope; otherwise "Your list"
router.get(
  '/fostership',
  ah(async (req, res) => {
    const all = req.query.all === '1' && [ROLES.HQ, ROLES.ZBC].includes(req.user.role);
    const f = all ? zoneScope(req.user) : { addedBy: req.user._id };
    if (req.query.q) f.itsNo = rx(digits(req.query.q));
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 25, 200);
    const mine = { addedBy: req.user._id };
    const [items, total, yours, today] = await Promise.all([
      Foster.find(f).populate('mauze', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
      Foster.countDocuments(f),
      Foster.countDocuments(mine),
      Foster.countDocuments({ ...mine, createdAt: { $gte: startOfToday() } }),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), stats: { yours, today } });
  })
);

router.post(
  '/fostership',
  ah(async (req, res) => {
    const its = digits(req.body.itsNo);
    if (its.length !== 8) return res.status(400).json({ message: 'ITS ID must be exactly 8 digits' });
    const exists = await Foster.findOne({ itsNo: its }).populate('addedBy', 'name');
    if (exists) {
      const who = String(exists.addedBy?._id) === String(req.user._id) ? 'you' : exists.addedByName || exists.addedBy?.name || 'another Mamur';
      return res.status(400).json({ message: `ITS ID ${its} is already in the Fostership list (added by ${who})` });
    }
    const doc = await Foster.create({ itsNo: its, zone: req.user.zone, mauze: req.user.mauze, addedBy: req.user._id, addedByName: req.user.name, note: req.body.note });
    audit(req, 'create', 'Foster', doc._id, its);
    res.status(201).json(doc);
  })
);

router.delete(
  '/fostership/:id',
  ah(async (req, res) => {
    const doc = await Foster.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(doc.addedBy) === String(req.user._id);
    if (!isOwner && req.user.role !== ROLES.HQ) return res.status(403).json({ message: 'You can only remove ITS IDs you added' });
    await doc.deleteOne();
    audit(req, 'delete', 'Foster', doc._id, doc.itsNo);
    res.json({ ok: true });
  })
);

// ================================================================ DIRECTORY: professionals
router.get(
  '/professionals',
  ah(async (req, res) => {
    const base = zoneScope(req.user);
    if (req.query.zone && req.user.role === ROLES.HQ) base.zone = req.query.zone;
    const f = { ...base };
    if (req.query.category && PROFESSIONAL_CATEGORIES[req.query.category]) f.category = req.query.category;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      const d = digits(q);
      f.$or = [{ name: rx(q) }, { company: rx(q) }, { itsNo: rx(q) }, ...(d.length >= 3 ? [{ mobile: rx(d) }] : [])];
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 25, 200);
    const [items, total, counts] = await Promise.all([
      Professional.find(f).populate('zone', 'name').sort('name').skip((page - 1) * limit).limit(limit).lean(),
      Professional.countDocuments(f),
      Professional.aggregate([{ $match: base }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
    ]);
    const byCat = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({
      items: items.map((x) => ({ ...x, canEdit: String(x.addedBy) === String(req.user._id) || req.user.role === ROLES.HQ })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: { all: counts.reduce((s, c) => s + c.n, 0), ...byCat },
      categories: PROFESSIONAL_CATEGORIES,
    });
  })
);

const PRO_FIELDS = ['itsNo', 'name', 'mobile', 'category', 'company', 'experienceYears'];
function cleanPro(body) {
  const d = pick(body, PRO_FIELDS);
  if (d.itsNo !== undefined) d.itsNo = digits(d.itsNo);
  if (d.mobile !== undefined) d.mobile = String(d.mobile).replace(/[^\d+]/g, '');
  if (d.experienceYears === '') d.experienceYears = undefined;
  return d;
}

router.post(
  '/professionals',
  ah(async (req, res) => {
    const d = cleanPro(req.body);
    if (!d.itsNo || d.itsNo.length !== 8) return res.status(400).json({ message: 'ITS ID must be 8 digits' });
    if (!d.name || !d.mobile) return res.status(400).json({ message: 'Name and number are required' });
    if (!PROFESSIONAL_CATEGORIES[d.category]) return res.status(400).json({ message: 'Choose a professional category' });
    const zone = req.user.zone || req.body.zone;
    if (await Professional.exists({ zone, itsNo: d.itsNo })) return res.status(400).json({ message: 'This ITS ID is already in the directory' });
    const p = await Professional.create({ ...d, zone, addedBy: req.user._id, addedByName: req.user.name });
    audit(req, 'create', 'Professional', p._id, `${p.name} (${p.category})`);
    res.status(201).json(p);
  })
);

router.put(
  '/professionals/:id',
  ah(async (req, res) => {
    const p = await Professional.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (String(p.addedBy) !== String(req.user._id) && req.user.role !== ROLES.HQ) return res.status(403).json({ message: 'Only the Mamur who added this contact can edit it' });
    Object.assign(p, cleanPro(req.body));
    await p.save();
    audit(req, 'update', 'Professional', p._id, p.name);
    res.json(p);
  })
);

router.delete(
  '/professionals/:id',
  ah(async (req, res) => {
    const p = await Professional.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (String(p.addedBy) !== String(req.user._id) && req.user.role !== ROLES.HQ) return res.status(403).json({ message: 'Only the Mamur who added this contact can remove it' });
    await p.deleteOne();
    audit(req, 'delete', 'Professional', p._id, p.name);
    res.json({ ok: true });
  })
);

// ================================================================ DIRECTORY: office contacts
router.get(
  '/office',
  ah(async (req, res) => {
    const f = zoneScope(req.user);
    if (req.query.mauze) f.mauze = req.query.mauze;
    if (req.query.department) f.department = req.query.department;
    if (req.query.q) f.$or = [{ name: rx(req.query.q) }, { designation: rx(req.query.q) }, { department: rx(req.query.q) }];
    const [items, departments] = await Promise.all([
      OfficeContact.find(f).populate('zone mauze', 'name').sort('order designation name').lean(),
      OfficeContact.distinct('department', zoneScope(req.user)),
    ]);
    res.json({ items, departments: departments.filter(Boolean).sort() });
  })
);

const OFFICE_FIELDS = ['name', 'designation', 'department', 'mauze', 'mobile', 'whatsapp', 'email', 'order'];
router.post(
  '/office',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    const d = pick(req.body, OFFICE_FIELDS);
    if (!d.name || !d.designation) return res.status(400).json({ message: 'Name and designation are required' });
    if (!d.mauze) delete d.mauze;
    let zone = req.user.role === ROLES.HQ ? req.body.zone : req.user.zone;
    if (d.mauze) zone = (await Mauze.findById(d.mauze))?.zone || zone;
    const c = await OfficeContact.create({ ...d, zone });
    audit(req, 'create', 'OfficeContact', c._id, `${c.name} (${c.designation})`);
    res.status(201).json(c);
  })
);

router.put(
  '/office/:id',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    const c = await OfficeContact.findOne({ _id: req.params.id, ...zoneScope(req.user) });
    if (!c) return res.status(404).json({ message: 'Not found' });
    const d = pick(req.body, OFFICE_FIELDS);
    if (d.mauze === '') d.mauze = undefined;
    Object.assign(c, d);
    await c.save();
    res.json(c);
  })
);

router.delete(
  '/office/:id',
  allow(ROLES.HQ, ROLES.ZBC),
  ah(async (req, res) => {
    await OfficeContact.deleteOne({ _id: req.params.id, ...zoneScope(req.user) });
    audit(req, 'delete', 'OfficeContact', req.params.id);
    res.json({ ok: true });
  })
);

module.exports = router;
