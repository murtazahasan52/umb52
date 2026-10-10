// Open endpoints used by the public website / app (no login)
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const Mauze = require('../models/Mauze');
const Enquiry = require('../models/Enquiry');
const Grievance = require('../models/Grievance');
const Case = require('../models/Case');
const Household = require('../models/Household');
const { nextSeq } = require('../models/Counter');
const { ah } = require('../utils/helpers');

const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

const cleanMobile = (m) => String(m || '').replace(/\D/g, '').slice(-10);

router.get(
  '/mauzes',
  ah(async (req, res) => {
    const list = await Mauze.find({ active: true }).select('name town zone').populate('zone', 'name').sort('name');
    res.json(list);
  })
);

// Aggregate, non-identifying numbers only
router.get(
  '/stats',
  ah(async (req, res) => {
    const [mauzes, households, cases, achieved] = await Promise.all([
      Mauze.countDocuments({ active: true }),
      Household.countDocuments({ assessedAt: { $ne: null } }),
      Case.countDocuments({}),
      Case.countDocuments({ finalStatus: 'achieved' }),
    ]);
    res.json({ mauzes, households, cases, achieved });
  })
);

router.post(
  '/enquiry',
  formLimiter,
  ah(async (req, res) => {
    const { name, mobile, itsNo, mauze, supportType, currentOccupation, message } = req.body;
    if (!name || cleanMobile(mobile).length !== 10) return res.status(400).json({ message: 'Name and a valid 10-digit mobile are required' });
    let zone;
    if (mauze) {
      const m = await Mauze.findById(mauze);
      if (!m) return res.status(400).json({ message: 'Select a valid Mauze' });
      zone = m.zone;
    }
    const seq = await nextSeq('enquiry');
    const e = await Enquiry.create({
      refNo: `REQ-${String(seq).padStart(5, '0')}`,
      name: String(name).slice(0, 120),
      mobile: cleanMobile(mobile),
      itsNo,
      mauze: mauze || undefined,
      zone,
      supportType,
      currentOccupation,
      message: String(message || '').slice(0, 2000),
    });
    res.status(201).json({ refNo: e.refNo });
  })
);

router.post(
  '/grievance',
  formLimiter,
  ah(async (req, res) => {
    const { name, mobile, itsNo, mauze, category, subject, message } = req.body;
    if (!name || cleanMobile(mobile).length !== 10 || !subject || !message)
      return res.status(400).json({ message: 'Name, mobile, subject and message are required' });
    let zone;
    if (mauze) {
      const m = await Mauze.findById(mauze);
      zone = m?.zone;
    }
    const seq = await nextSeq('grievance');
    const g = await Grievance.create({
      ticketNo: `GRV-${String(seq).padStart(5, '0')}`,
      name: String(name).slice(0, 120),
      mobile: cleanMobile(mobile),
      itsNo,
      mauze: mauze || undefined,
      zone,
      category,
      subject: String(subject).slice(0, 200),
      message: String(message).slice(0, 3000),
    });
    res.status(201).json({ ticketNo: g.ticketNo });
  })
);

router.get(
  '/grievance/track',
  ah(async (req, res) => {
    const { ticketNo, mobile } = req.query;
    const g = await Grievance.findOne({ ticketNo: String(ticketNo || '').toUpperCase().trim(), mobile: cleanMobile(mobile) }).select(
      'ticketNo subject status response createdAt resolvedAt'
    );
    if (!g) return res.status(404).json({ message: 'No grievance found for this ticket number and mobile' });
    res.json(g);
  })
);

module.exports = router;
