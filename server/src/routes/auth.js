const router = require('express').Router();
const User = require('../models/User');
const { sign, requireAuth } = require('../middleware/auth');
const { ah, audit } = require('../utils/helpers');

router.post(
  '/login',
  ah(async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'Enter mobile / email and password' });
    const id = String(login).trim().toLowerCase();
    const user = await User.findOne({ $or: [{ mobile: id }, { email: id }] })
      .select('+password')
      .populate('zone mauze', 'name code');
    if (!user || !(await user.checkPassword(password))) return res.status(401).json({ message: 'Invalid login details' });
    if (!user.active) return res.status(403).json({ message: 'Your account is disabled. Contact your Mauze committee.' });
    user.lastLogin = new Date();
    await user.save();
    req.user = user;
    audit(req, 'login', 'User', user._id);
    res.json({ token: sign(user), user: user.toSafe() });
  })
);

router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const u = await User.findById(req.user._id).populate('zone mauze', 'name code');
    res.json(u.toSafe());
  })
);

router.post(
  '/change-password',
  requireAuth,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const u = await User.findById(req.user._id).select('+password');
    if (!(await u.checkPassword(currentPassword || ''))) return res.status(400).json({ message: 'Current password is incorrect' });
    u.password = newPassword;
    await u.save();
    audit(req, 'change_password', 'User', u._id);
    res.json({ ok: true });
  })
);

module.exports = router;
