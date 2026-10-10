const router = require('express').Router();
const User = require('../models/User');
const Mauze = require('../models/Mauze');
const { requireAuth, allow } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { ah, audit, pick, rx } = require('../utils/helpers');

router.use(requireAuth);

// Which roles can a user create/manage?
const MANAGEABLE = {
  [ROLES.HQ]: Object.values(ROLES),
  [ROLES.ZBC]: [ROLES.ZBC, ROLES.MAUZE, ROLES.COUNSELLOR, ROLES.BENEFICIARY],
  [ROLES.MAUZE]: [ROLES.COUNSELLOR, ROLES.BENEFICIARY],
  [ROLES.COUNSELLOR]: [ROLES.BENEFICIARY],
};

function scope(user) {
  if (user.role === ROLES.HQ) return {};
  if (user.role === ROLES.ZBC) return { zone: user.zone };
  return { mauze: user.mauze };
}

// Light list (for counsellor / mentor dropdowns)
router.get(
  '/staff',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE, ROLES.COUNSELLOR),
  ah(async (req, res) => {
    const f = { ...scope(req.user), role: { $in: [ROLES.COUNSELLOR, ROLES.MAUZE, ROLES.ZBC] }, active: true };
    if (req.query.mauze) {
      const m = await Mauze.findById(req.query.mauze);
      if (m) f.$or = [{ mauze: m._id }, { role: ROLES.ZBC, zone: m.zone }];
      delete f.mauze;
    }
    res.json(await User.find(f).select('name role designation expertise mauze').sort('name'));
  })
);

router.get(
  '/',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const f = scope(req.user);
    if (req.query.role) f.role = req.query.role;
    if (req.query.q) f.$or = [{ name: rx(req.query.q) }, { mobile: rx(req.query.q) }];
    res.json(await User.find(f).populate('zone mauze', 'name').sort('-createdAt').limit(500));
  })
);

const FIELDS = ['name', 'mobile', 'email', 'itsNo', 'role', 'zone', 'mauze', 'designation', 'expertise', 'household', 'active'];

async function normalise(req, data) {
  if (data.role && !MANAGEABLE[req.user.role]?.includes(data.role)) throw Object.assign(new Error('You cannot assign this role'), { status: 403 });
  if (data.mobile) data.mobile = String(data.mobile).replace(/\D/g, '').slice(-10);
  if (data.mauze) {
    const m = await Mauze.findById(data.mauze);
    if (!m) throw Object.assign(new Error('Invalid Mauze'), { status: 400 });
    data.zone = m.zone;
  }
  if (req.user.role === ROLES.ZBC) {
    data.zone = req.user.zone;
  }
  if ([ROLES.MAUZE, ROLES.COUNSELLOR].includes(req.user.role)) {
    data.mauze = req.user.mauze;
    data.zone = req.user.zone;
  }
  return data;
}

router.post(
  '/',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const data = await normalise(req, pick(req.body, FIELDS));
    if (!req.body.password || req.body.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.exists({ mobile: data.mobile })) return res.status(400).json({ message: 'A user with this mobile already exists' });
    const u = await User.create({ ...data, password: req.body.password });
    audit(req, 'create', 'User', u._id, `${u.name} (${u.role})`);
    res.status(201).json(u.toSafe());
  })
);

router.put(
  '/:id',
  allow(ROLES.HQ, ROLES.ZBC, ROLES.MAUZE),
  ah(async (req, res) => {
    const u = await User.findOne({ _id: req.params.id, ...scope(req.user) });
    if (!u) return res.status(404).json({ message: 'User not found in your scope' });
    if (!MANAGEABLE[req.user.role].includes(u.role)) return res.status(403).json({ message: 'You cannot edit this user' });
    const data = await normalise(req, pick(req.body, FIELDS));
    Object.assign(u, data);
    if (req.body.password) u.password = req.body.password;
    await u.save();
    audit(req, 'update', 'User', u._id, u.name);
    res.json(u.toSafe());
  })
);

router.delete(
  '/:id',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot delete yourself' });
    await User.findByIdAndUpdate(req.params.id, { active: false });
    audit(req, 'disable', 'User', req.params.id);
    res.json({ ok: true });
  })
);

module.exports = router;
