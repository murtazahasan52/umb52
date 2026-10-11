// Real-time search across households, family members and cases — by partial name, ITS number, mobile or code
const router = require('express').Router();
const Household = require('../models/Household');
const Case = require('../models/Case');
const { requireAuth, allow, scopeFilter } = require('../middleware/auth');
const { STAFF_ROLES } = require('../config/constants');
const { ah, rx } = require('../utils/helpers');

router.use(requireAuth, allow(...STAFF_ROLES));

router.get(
  '/',
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ households: [], cases: [] });
    const scope = scopeFilter(req.user);
    const digits = q.replace(/\D/g, '');
    const isNumber = digits.length >= 3 && digits.length === q.replace(/[\s+-]/g, '').length;

    // Words in any order: "murtaza saifee" matches "Murtaza Hussain Saifee"
    const words = q.split(/\s+/).filter(Boolean).slice(0, 4);
    const nameMatch = (field) => ({ $and: words.map((w) => ({ [field]: rx(w) })) });

    const hhOr = isNumber
      ? [{ mobile: rx(digits) }, { itsNo: rx(digits) }, { code: rx(q) }]
      : [nameMatch('headName'), nameMatch('members.name'), { code: rx(q) }, { itsNo: rx(q) }];
    const caseOr = isNumber
      ? [{ beneficiaryMobile: rx(digits) }, { caseNo: rx(q) }]
      : [nameMatch('beneficiaryName'), { caseNo: rx(q) }];

    const [hh, cases] = await Promise.all([
      Household.find({ ...scope, $or: hhOr })
        .select('code headName itsNo mobile mauze members.name members.relation needLevel supportPlanIdentified')
        .populate('mauze', 'name')
        .limit(10)
        .lean(),
      Case.find({ ...scope, $or: caseOr })
        .select('caseNo caseType beneficiaryName beneficiaryMobile scheme stage risk mauze household')
        .populate('mauze', 'name')
        .sort('-updatedAt')
        .limit(8)
        .lean(),
    ]);

    // Show which family member matched, if it wasn't the head of family
    const lower = words.map((w) => w.toLowerCase());
    const households = hh.map((h) => {
      const headHit = lower.every((w) => (h.headName || '').toLowerCase().includes(w));
      const member = !isNumber && !headHit ? (h.members || []).find((m) => lower.every((w) => (m.name || '').toLowerCase().includes(w))) : null;
      return {
        _id: h._id,
        code: h.code,
        headName: h.headName,
        itsNo: h.itsNo,
        mobile: h.mobile,
        mauze: h.mauze?.name,
        needLevel: h.needLevel,
        hasPlan: h.supportPlanIdentified,
        matchedMember: member ? `${member.name}${member.relation ? ` (${member.relation})` : ''}` : null,
      };
    });

    res.json({
      households,
      cases: cases.map((c) => ({
        _id: c._id,
        caseNo: c.caseNo,
        beneficiaryName: c.beneficiaryName,
        beneficiaryMobile: c.beneficiaryMobile,
        caseType: c.caseType,
        scheme: c.scheme,
        stage: c.stage,
        risk: c.risk,
        mauze: c.mauze?.name,
      })),
    });
  })
);

module.exports = router;
