// Grievances and support requests received from the website / app
const router = require('express').Router();
const Grievance = require('../models/Grievance');
const Enquiry = require('../models/Enquiry');
const { requireAuth, allow, scopeFilter, canAccessDoc } = require('../middleware/auth');
const { STAFF_ROLES, ROLES } = require('../config/constants');
const { ah, audit, pick, rx } = require('../utils/helpers');

router.use(requireAuth, allow(...STAFF_ROLES));

// HQ sees all; others see their scope plus requests that came without a Mauze
function scoped(user) {
  const s = scopeFilter(user);
  if (user.role === ROLES.HQ) return {};
  return { $or: [s, { mauze: null }] };
}

router.get(
  '/grievances',
  ah(async (req, res) => {
    const f = scoped(req.user);
    if (req.query.status) f.status = req.query.status;
    if (req.query.q) f.$and = [{ $or: [{ ticketNo: rx(req.query.q) }, { name: rx(req.query.q) }, { subject: rx(req.query.q) }] }];
    res.json(await Grievance.find(f).populate('mauze', 'name').populate('assignedTo', 'name').sort('-createdAt').limit(500));
  })
);

router.put(
  '/grievances/:id',
  ah(async (req, res) => {
    const g = await Grievance.findById(req.params.id);
    if (!g || (g.mauze && !canAccessDoc(req.user, g))) return res.status(404).json({ message: 'Not found' });
    const prev = g.status;
    Object.assign(g, pick(req.body, ['status', 'response', 'assignedTo', 'slaDays', 'eligible', 'category', 'mauze']));
    if (g.status === 'resolved' && prev !== 'resolved') g.resolvedAt = new Date();
    if (g.status !== 'resolved') g.resolvedAt = undefined;
    await g.save();
    audit(req, 'update', 'Grievance', g._id, `${g.ticketNo} → ${g.status}`);
    res.json(g);
  })
);

router.get(
  '/enquiries',
  ah(async (req, res) => {
    const f = scoped(req.user);
    if (req.query.status) f.status = req.query.status;
    if (req.query.q) f.$and = [{ $or: [{ refNo: rx(req.query.q) }, { name: rx(req.query.q) }, { mobile: rx(req.query.q) }] }];
    res.json(await Enquiry.find(f).populate('mauze', 'name').populate('handledBy', 'name').sort('-createdAt').limit(500));
  })
);

router.put(
  '/enquiries/:id',
  ah(async (req, res) => {
    const e = await Enquiry.findById(req.params.id);
    if (!e || (e.mauze && !canAccessDoc(req.user, e))) return res.status(404).json({ message: 'Not found' });
    Object.assign(e, pick(req.body, ['status', 'notes', 'household', 'mauze']), { handledBy: req.user._id });
    await e.save();
    audit(req, 'update', 'Enquiry', e._id, `${e.refNo} → ${e.status}`);
    res.json(e);
  })
);

module.exports = router;
