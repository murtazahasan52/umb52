const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Login required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Account disabled or not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission for this action' });
  next();
};

// Mongo filter limiting records to what this user may see.
// field names: zone / mauze on the document.
function scopeFilter(user) {
  switch (user.role) {
    case ROLES.HQ:
      return {};
    case ROLES.ZBC:
      return { zone: user.zone };
    case ROLES.MAUZE:
    case ROLES.COUNSELLOR:
      return { mauze: user.mauze };
    default:
      return { _id: null }; // beneficiaries use their own routes
  }
}

function canAccessDoc(user, doc) {
  if (!doc) return false;
  if (user.role === ROLES.HQ) return true;
  if (user.role === ROLES.ZBC) return String(doc.zone?._id || doc.zone) === String(user.zone);
  if ([ROLES.MAUZE, ROLES.COUNSELLOR].includes(user.role)) return String(doc.mauze?._id || doc.mauze) === String(user.mauze);
  return false;
}

module.exports = { sign, requireAuth, allow, scopeFilter, canAccessDoc };
