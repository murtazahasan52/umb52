const AuditLog = require('../models/AuditLog');

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function audit(req, action, entity, entityId, detail) {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name,
      role: req.user?.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      detail,
      ip: req.ip,
    });
  } catch (e) {
    /* never break the request because of logging */
  }
}

const sum = (arr, f) => (arr || []).reduce((s, x) => s + (Number(f ? f(x) : x) || 0), 0);
const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const quarterStart = (d = new Date()) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);

// Remove keys the client must never set directly
function pick(obj, keys) {
  const o = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
  });
  return o;
}

const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

module.exports = { ah, audit, sum, pct, daysBetween, monthKey, quarterStart, pick, rx };
