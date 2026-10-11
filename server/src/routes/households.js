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
        .select('-confidentialNotes -members -documents')
        .populate('mauze', 'name')
        .sort('-updatedAt')
        .skip((Number(page) - 1) * lim)
        .limit(lim),
      Household.countDocuments(f),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / lim) });
  })
);


// ---------- Excel / CSV import (HQ super-admin only)
const { COLUMNS, normaliseRow, clean: cleanImport } = require('../utils/importer');
const { resolveMauze, createHousehold, createCase } = require('../utils/records');

router.get('/import/columns', allow(ROLES.HQ), (req, res) => res.json(COLUMNS));

router.post(
  '/import',
  allow(ROLES.HQ),
  ah(async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 500) : [];
    const { dryRun = false, createMissingMauze = false, updateExisting = true, startRow = 2 } = req.body;
    if (!rows.length) return res.status(400).json({ message: 'No rows received' });
    const cache = new Map();
    const results = [];
    const seenIts = new Set();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let cases = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const line = startRow + i;
      const { row, errors, empty } = normaliseRow(rows[i]);
      if (empty) continue;
      const result = { line, name: row.headName || '—', status: 'ok', messages: [] };
      try {
        if (errors.length) throw new Error(errors.join('; '));
        if (row.itsNo && seenIts.has(row.itsNo)) throw new Error(`ITS ${row.itsNo} appears twice in this file`);
        if (row.itsNo) seenIts.add(row.itsNo);

        let m;
        try {
          m = await resolveMauze(row.mauze, row.zone, { create: false, cache });
        } catch (e) {
          if (!createMissingMauze) throw e;
          if (dryRun) {
            if (!row.zone) throw new Error(`Mauze "${row.mauze}" does not exist. Add a Zone column to create it.`);
            result.messages.push(`New Mauze "${row.mauze}" will be created`);
          } else {
            m = await resolveMauze(row.mauze, row.zone, { create: true, cache });
          }
        }

        const existing = row.itsNo
          ? await Household.findOne({ itsNo: row.itsNo })
          : row.mobile
          ? await Household.findOne({ mobile: row.mobile, headName: new RegExp(`^${row.headName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
          : null;

        const { caseType, scheme, need, amountApplied, counsellorMobile, mauze, zone, assessed, estimatedCost, housingPurpose, studentName, course, institution, annualFees, ...fields } = row;
        const typeDetails =
          caseType === 'housing'
            ? { housing: cleanImport({ purpose: housingPurpose, estimatedCost }) }
            : caseType === 'education'
            ? { education: cleanImport({ studentName, course, institution, annualFees, studyStatus: 'studying' }) }
            : caseType === 'business'
            ? { businessDetail: cleanImport({ estimatedCost, businessName: fields.business?.name, businessType: fields.business?.type }) }
            : {};
        const data = cleanImport(fields);

        if (existing) {
          if (!updateExisting) {
            result.status = 'skipped';
            result.messages.push(`Already registered as ${existing.code}`);
            skipped += 1;
          } else {
            result.status = 'updated';
            result.messages.push(`Updates ${existing.code}`);
            if (!dryRun) {
              const merged = { ...data };
              if (data.business) merged.business = { ...(existing.business?.toObject?.() || {}), ...data.business };
              if (data.debts) merged.debts = { ...(existing.debts?.toObject?.() || {}), ...data.debts };
              Object.assign(existing, merged, { importedAt: new Date() });
              if (assessed && !existing.assessedAt) {
                existing.assessedAt = new Date();
                existing.assessedBy = req.user._id;
              }
              if (m && String(existing.mauze) !== String(m._id)) {
                existing.mauze = m._id;
                existing.zone = m.zone;
              }
              await existing.save();
            }
            updated += 1;
          }
        } else {
          result.status = 'created';
          if (!dryRun) {
            const h = await createHousehold({ ...data, assessed, importedAt: new Date() }, m, req.user);
            result.messages.push(`Registered as ${h.code}`);
            result.householdId = h._id;
            if (caseType) {
              const c = await createCase(h, { caseType, scheme, need, amountApplied, counsellorMobile, ...typeDetails }, req.user, 'Case opened from Excel import');
              result.messages.push(`Case ${c.caseNo} opened`);
              cases += 1;
            }
          } else if (caseType) {
            result.messages.push(`A ${caseType} case will be opened`);
            cases += 1;
          }
          created += 1;
        }
      } catch (e) {
        result.status = 'error';
        result.messages.push(e.message);
      }
      results.push(result);
    }
    if (!dryRun) audit(req, 'import', 'Household', null, `${created} created, ${updated} updated, ${skipped} skipped, ${cases} cases`);
    res.json({
      dryRun,
      summary: { rows: results.length, created, updated, skipped, cases, errors: results.filter((r) => r.status === 'error').length },
      results,
    });
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id).populate('mauze zone', 'name').populate('assessedBy', 'name');
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    const cases = await Case.find({ household: h._id }).select('caseNo caseType scheme stage finalStatus risk amountSanctioned createdAt beneficiaryName');
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

// ---------- Scanned forms & documents
router.post(
  '/:id/documents',
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id);
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    const items = Array.isArray(req.body.documents) ? req.body.documents : [req.body];
    items.forEach((d) => {
      if (!d.url || !/^\/api\/files\/[a-f0-9]{24}$/.test(d.url)) return;
      h.documents.push({ title: d.title || d.fileName || 'Document', category: d.category || 'other', url: d.url, fileName: d.fileName, note: d.note, by: req.user._id, byName: req.user.name });
    });
    await h.save();
    audit(req, 'upload', 'Household', h._id, `${items.length} document(s)`);
    res.status(201).json(h.documents);
  })
);

router.delete(
  '/:id/documents/:did',
  ah(async (req, res) => {
    const h = await Household.findById(req.params.id);
    if (!canAccessDoc(req.user, h)) return res.status(404).json({ message: 'Not found' });
    const d = h.documents.id(req.params.did);
    if (!d) return res.status(404).json({ message: 'Document not found' });
    d.deleteOne();
    await h.save();
    audit(req, 'delete', 'HouseholdDocument', h._id, req.params.did);
    res.json(h.documents);
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
