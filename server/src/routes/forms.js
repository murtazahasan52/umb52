// Family forms: admin sends a personal link, the family fills it on their phone, admin reviews and converts.
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const FormRequest = require('../models/FormRequest');
const Household = require('../models/Household');
const Mauze = require('../models/Mauze');
const { requireAuth, allow, scopeFilter, canAccessDoc } = require('../middleware/auth');
const { ROLES, STAFF_ROLES, SCHEMES, HOUSEHOLD_CATEGORIES, CASE_TYPES } = require('../config/constants');
const { nextSeq } = require('../models/Counter');
const { ah, audit, rx } = require('../utils/helpers');
const { createHousehold, createCase } = require('../utils/records');
const { upload, save } = require('./uploads');

const SUPPORT = ['business', 'qardan_hasana', 'skill_training', 'employment', 'education', 'medical', 'housing', 'counselling', 'other'];
const DOC_CATEGORIES = ['survey_form', 'application_form', 'id_proof', 'income_proof', 'business_document', 'bank_statement', 'invoice', 'photo', 'agreement', 'other'];

// ------------------------------------------------------------ cleaning what the family sends
const str = (v, max = 500) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const numb = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v) => v === true || v === 'true' || v === 'yes';

function cleanSubmission(d = {}) {
  const b = d.business || {};
  const debts = d.debts || {};
  return {
    headName: str(d.headName, 120),
    itsNo: str(d.itsNo, 20)?.replace(/\D/g, ''),
    mobile: str(d.mobile, 20)?.replace(/\D/g, '').slice(-10),
    address: str(d.address, 300),
    categories: (Array.isArray(d.categories) ? d.categories : []).filter((c) => HOUSEHOLD_CATEGORIES.includes(c)),
    members: (Array.isArray(d.members) ? d.members : []).slice(0, 20).map((m) => ({
      name: str(m.name, 120),
      relation: str(m.relation, 40),
      age: numb(m.age),
      gender: ['M', 'F'].includes(m.gender) ? m.gender : '',
      occupation: str(m.occupation, 120),
      earning: bool(m.earning),
      monthlyIncome: numb(m.monthlyIncome) || 0,
      education: str(m.education, 120),
      studying: bool(m.studying),
      skills: str(m.skills, 200),
    })).filter((m) => m.name),
    totalMembers: numb(d.totalMembers),
    earningMembers: numb(d.earningMembers),
    mainIncomeSource: str(d.mainIncomeSource, 200),
    monthlyHouseholdIncome: numb(d.monthlyHouseholdIncome),
    business: {
      exists: bool(b.exists),
      name: str(b.name, 120),
      type: str(b.type, 120),
      yearsRunning: numb(b.yearsRunning),
      monthlyTurnover: numb(b.monthlyTurnover),
      monthlyNetIncome: numb(b.monthlyNetIncome),
      gstRegistered: bool(b.gstRegistered),
      udyamRegistered: bool(b.udyamRegistered),
      digitalPayments: bool(b.digitalPayments),
    },
    debts: { total: numb(debts.total), monthlyEmi: numb(debts.monthlyEmi), details: str(debts.details, 300) },
    housing: ['owned', 'rented', 'family', 'other'].includes(d.housing) ? d.housing : '',
    housingNeed: str(d.housingNeed),
    educationNeed: str(d.educationNeed),
    healthcareNeed: str(d.healthcareNeed),
    otherNeeds: str(d.otherNeeds),
    skills: str(d.skills),
    employmentInterests: str(d.employmentInterests),
    businessOpportunities: str(d.businessOpportunities),
    existingQH: bool(d.existingQH),
    existingQHAmount: numb(d.existingQHAmount),
    existingTR: bool(d.existingTR),
    supportSought: (Array.isArray(d.supportSought) ? d.supportSought : []).filter((s) => SUPPORT.includes(s)),
    caseTypes: (Array.isArray(d.caseTypes) ? d.caseTypes : []).filter((t) => CASE_TYPES[t]),
    housingRequest: d.housingRequest
      ? {
          purpose: ['purchase', 'construction', 'repair', 'rent_deposit', 'other'].includes(d.housingRequest.purpose) ? d.housingRequest.purpose : '',
          propertyDetails: str(d.housingRequest.propertyDetails),
          estimatedCost: numb(d.housingRequest.estimatedCost),
          ownContribution: numb(d.housingRequest.ownContribution),
        }
      : undefined,
    educationRequest: d.educationRequest
      ? {
          studentName: str(d.educationRequest.studentName, 120),
          relation: str(d.educationRequest.relation, 40),
          course: str(d.educationRequest.course, 120),
          institution: str(d.educationRequest.institution, 160),
          academicYear: str(d.educationRequest.academicYear, 20),
          annualFees: numb(d.educationRequest.annualFees),
          lastResult: str(d.educationRequest.lastResult, 120),
        }
      : undefined,
    businessRequest: d.businessRequest
      ? {
          purpose: ['new_business', 'expansion', 'working_capital', 'equipment', 'formalization', 'other'].includes(d.businessRequest.purpose) ? d.businessRequest.purpose : '',
          estimatedCost: numb(d.businessRequest.estimatedCost),
          ownContribution: numb(d.businessRequest.ownContribution),
        }
      : undefined,
    supportDetails: str(d.supportDetails, 2000),
    amountNeeded: numb(d.amountNeeded),
    consent: bool(d.consent),
  };
}

const HOUSEHOLD_KEYS = [
  'headName', 'itsNo', 'mobile', 'address', 'categories', 'members', 'totalMembers', 'earningMembers', 'mainIncomeSource',
  'monthlyHouseholdIncome', 'business', 'debts', 'housing', 'housingNeed', 'educationNeed', 'healthcareNeed', 'otherNeeds',
  'skills', 'employmentInterests', 'businessOpportunities', 'existingQH', 'existingQHAmount', 'existingTR',
];

const isOpen = (f) => !['converted', 'rejected', 'cancelled'].includes(f.status) && (!f.expiresAt || f.expiresAt > new Date());
const newToken = () => crypto.randomBytes(18).toString('base64url');

// ============================================================ ADMIN
const admin = express.Router();
admin.use(requireAuth, allow(...STAFF_ROLES));

admin.get(
  '/',
  ah(async (req, res) => {
    const f = { ...scopeFilter(req.user) };
    if (req.query.status) f.status = req.query.status;
    if (req.query.q) f.$or = [{ name: rx(req.query.q) }, { mobile: rx(req.query.q) }, { refNo: rx(req.query.q) }];
    const list = await FormRequest.find(f)
      .select('-data -token')
      .populate('mauze', 'name')
      .populate('createdBy', 'name')
      .sort('-updatedAt')
      .limit(300)
      .lean();
    res.json(list.map((x) => ({ ...x, documentCount: x.documents?.length || 0, documents: undefined })));
  })
);

admin.post(
  '/',
  ah(async (req, res) => {
    const { name, mobile, mauze, household, purpose, message, expiresInDays = 30 } = req.body;
    let m;
    let h;
    if (household) {
      h = await Household.findById(household);
      if (!canAccessDoc(req.user, h)) return res.status(400).json({ message: 'Household not found in your scope' });
      m = await Mauze.findById(h.mauze);
    } else {
      const mid = [ROLES.MAUZE, ROLES.COUNSELLOR].includes(req.user.role) ? req.user.mauze : mauze;
      m = await Mauze.findById(mid);
      if (!m || !canAccessDoc(req.user, { zone: m.zone, mauze: m._id })) return res.status(400).json({ message: 'Select a Mauze in your scope' });
    }
    const clean = String(mobile || h?.mobile || '').replace(/\D/g, '').slice(-10);
    if (!(name || h?.headName)) return res.status(400).json({ message: 'Enter the family head’s name' });
    if (clean && clean.length !== 10) return res.status(400).json({ message: 'Mobile should have 10 digits' });
    const seq = await nextSeq('form');
    const f = await FormRequest.create({
      token: newToken(),
      refNo: `FRM-${String(seq).padStart(5, '0')}`,
      purpose: h ? 'update' : purpose === 'update' ? 'update' : 'registration',
      name: String(name || h.headName).trim().slice(0, 120),
      mobile: clean || undefined,
      mauze: m._id,
      zone: m.zone,
      household: h?._id,
      message: String(message || '').slice(0, 500) || undefined,
      expiresAt: new Date(Date.now() + Math.min(Math.max(Number(expiresInDays) || 30, 1), 90) * 86400000),
      createdBy: req.user._id,
    });
    audit(req, 'create', 'FormRequest', f._id, `${f.refNo} for ${f.name}`);
    res.status(201).json({ _id: f._id, refNo: f.refNo, token: f.token, name: f.name, mobile: f.mobile, mauze: m.name, expiresAt: f.expiresAt });
  })
);

async function loadForm(req, res) {
  const f = await FormRequest.findById(req.params.id)
    .populate('mauze', 'name')
    .populate('household', 'code headName')
    .populate('convertedHousehold', 'code headName')
    .populate('convertedCase', 'caseNo')
    .populate('createdBy reviewedBy', 'name');
  if (!f || !canAccessDoc(req.user, f)) {
    res.status(404).json({ message: 'Form not found' });
    return null;
  }
  return f;
}

admin.get(
  '/:id',
  ah(async (req, res) => {
    const f = await loadForm(req, res);
    if (f) res.json(f);
  })
);

// Re-share: new expiry (and optionally a fresh link)
admin.post(
  '/:id/renew',
  ah(async (req, res) => {
    const f = await loadForm(req, res);
    if (!f) return;
    if (f.status === 'converted') return res.status(400).json({ message: 'This form has already been converted' });
    f.expiresAt = new Date(Date.now() + 30 * 86400000);
    if (req.body.newLink) f.token = newToken();
    if (['cancelled', 'rejected'].includes(f.status)) f.status = f.submittedAt ? 'submitted' : 'sent';
    await f.save();
    res.json(f);
  })
);

admin.patch(
  '/:id',
  ah(async (req, res) => {
    const f = await loadForm(req, res);
    if (!f) return;
    const { status, reviewNote } = req.body;
    if (status && ['rejected', 'cancelled', 'submitted'].includes(status)) f.status = status;
    if (reviewNote !== undefined) f.reviewNote = reviewNote;
    f.reviewedBy = req.user._id;
    f.reviewedAt = new Date();
    await f.save();
    audit(req, 'update', 'FormRequest', f._id, `${f.refNo} → ${f.status}`);
    res.json(f);
  })
);

// Convert a submitted form into a household (new or update) and optionally a case
admin.post(
  '/:id/convert',
  ah(async (req, res) => {
    const f = await loadForm(req, res);
    if (!f) return;
    if (f.status === 'converted') return res.status(400).json({ message: 'Already converted' });
    if (!f.data) return res.status(400).json({ message: 'The family has not submitted this form yet' });
    const data = {};
    HOUSEHOLD_KEYS.forEach((k) => {
      if (f.data[k] !== undefined) data[k] = f.data[k];
    });
    if (!data.business?.exists) data.business = { exists: false };
    const docs = (f.documents || []).map((d) => ({ title: d.title, category: d.category, url: d.url, fileName: d.fileName, note: `From family form ${f.refNo}`, byName: f.name }));
    const needText = [
      ...(f.data.supportSought || []).map((s) => s.replace(/_/g, ' ')),
    ].join(', ');

    let h;
    if (f.household?._id) {
      h = await Household.findById(f.household._id);
      Object.assign(h, data);
      if (data.business) h.business = { ...(h.business?.toObject?.() || {}), ...data.business };
      if (!h.assessedAt) {
        h.assessedAt = new Date();
        h.assessedBy = req.user._id;
      }
      h.documents.push(...docs.map((d) => ({ ...d, by: req.user._id })));
      await h.save();
    } else {
      const m = await Mauze.findById(f.mauze._id || f.mauze);
      h = await createHousehold({ ...data, assessed: true, needLevel: req.body.needLevel || 'medium', documents: docs.map((d) => ({ ...d, by: req.user._id })) }, m, req.user);
    }

    // Open one case per requested type: body.cases = [{ caseType, scheme, need, counsellor, amountApplied }]
    const requested = Array.isArray(req.body.cases) ? req.body.cases.filter((x) => CASE_TYPES[x?.caseType]) : [];
    const opened = [];
    for (const r of requested) {
      if (r.scheme && !SCHEMES[r.scheme]) return res.status(400).json({ message: 'Unknown scheme' });
      const details =
        r.caseType === 'housing'
          ? { housing: { ...(f.data.housingRequest || {}), currentHousing: f.data.housing || '' } }
          : r.caseType === 'education'
          ? { education: { ...(f.data.educationRequest || {}), studyStatus: 'studying' } }
          : { businessDetail: { ...(f.data.businessRequest || {}), businessName: f.data.business?.name, businessType: f.data.business?.type } };
      const estimate = details.housing?.estimatedCost ?? details.education?.annualFees ?? details.businessDetail?.estimatedCost;
      const c = await createCase(
        h,
        {
          caseType: r.caseType,
          scheme: r.scheme || undefined,
          ...details,
          need: r.need || f.data.supportDetails || needText || `${CASE_TYPES[r.caseType]} support (family form)`,
          amountApplied: r.amountApplied ?? f.data.amountNeeded ?? estimate,
          counsellor: r.counsellor || undefined,
          planDetails: f.data.supportDetails,
        },
        req.user,
        `Case opened from family form ${f.refNo}`
      );
      if (docs.length) {
        c.documents.push(...docs.map((d) => ({ ...d, by: req.user._id })));
        await c.save();
      }
      opened.push(c);
    }
    const c = opened[0];

    f.status = 'converted';
    f.convertedHousehold = h._id;
    f.convertedCase = c?._id;
    f.reviewedBy = req.user._id;
    f.reviewedAt = new Date();
    if (req.body.reviewNote) f.reviewNote = req.body.reviewNote;
    await f.save();
    audit(req, 'convert', 'FormRequest', f._id, `${f.refNo} → ${h.code}${opened.length ? ` / ${opened.map((x) => x.caseNo).join(', ')}` : ''}`);
    res.json({ household: { _id: h._id, code: h.code }, cases: opened.map((x) => ({ _id: x._id, caseNo: x.caseNo, caseType: x.caseType })), case: c ? { _id: c._id, caseNo: c.caseNo } : null });
  })
);

// ============================================================ PUBLIC (family, via token link)
const pub = express.Router();
pub.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

async function byToken(req, res) {
  const f = await FormRequest.findOne({ token: String(req.params.token) }).populate('mauze', 'name');
  if (!f) {
    res.status(404).json({ message: 'This form link is not valid. Please ask your Mauze committee for a new link.' });
    return null;
  }
  return f;
}

function publicView(f, prefill) {
  return {
    refNo: f.refNo,
    name: f.name,
    mauze: f.mauze?.name,
    purpose: f.purpose,
    message: f.message,
    status: f.status,
    open: isOpen(f),
    expired: !!(f.expiresAt && f.expiresAt <= new Date()),
    submittedAt: f.submittedAt,
    data: prefill,
    documents: (f.documents || []).map((d) => ({ _id: d._id, title: d.title, category: d.category, fileName: d.fileName, createdAt: d.createdAt })),
  };
}

pub.get(
  '/:token',
  ah(async (req, res) => {
    const f = await byToken(req, res);
    if (!f) return;
    if (f.status === 'sent') {
      f.status = 'opened';
      f.openedAt = new Date();
      await f.save();
    }
    let prefill = f.data;
    if (!prefill && f.household) {
      const h = await Household.findById(f.household).lean();
      if (h) {
        prefill = {};
        HOUSEHOLD_KEYS.forEach((k) => {
          if (h[k] !== undefined) prefill[k] = h[k];
        });
      }
    }
    if (!prefill) prefill = { headName: f.name, mobile: f.mobile, members: [], categories: [], business: { exists: false }, debts: {}, supportSought: [] };
    res.json(publicView(f, prefill));
  })
);

pub.post(
  '/:token/submit',
  ah(async (req, res) => {
    const f = await byToken(req, res);
    if (!f) return;
    if (!isOpen(f)) return res.status(400).json({ message: 'This form is closed. Please contact your Mauze committee.' });
    const data = cleanSubmission(req.body);
    if (!data.headName) return res.status(400).json({ message: 'Enter the name of the head of family' });
    if (!data.mobile || data.mobile.length !== 10) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    if (!data.consent) return res.status(400).json({ message: 'Please tick the consent box to submit' });
    f.data = data;
    f.status = 'submitted';
    f.submittedAt = new Date();
    f.submissions += 1;
    f.markModified('data');
    await f.save();
    res.json(publicView(f, f.data));
  })
);

pub.post(
  '/:token/documents',
  upload.array('files', 4),
  ah(async (req, res) => {
    const f = await byToken(req, res);
    if (!f) return;
    if (!isOpen(f)) return res.status(400).json({ message: 'This form is closed.' });
    if (!req.files?.length) return res.status(400).json({ message: 'Choose JPG, PNG, WEBP or PDF files (max 4 MB each)' });
    if ((f.documents?.length || 0) + req.files.length > 15) return res.status(400).json({ message: 'A form can have up to 15 documents' });
    const category = DOC_CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
    for (const file of req.files) {
      const url = await save(file, null, { formRequest: String(f._id), public: true });
      f.documents.push({ title: String(req.body.title || file.originalname).slice(0, 120), category, url, fileName: file.originalname.slice(0, 120), byName: f.name });
    }
    await f.save();
    res.status(201).json(publicView(f, f.data).documents);
  })
);

pub.delete(
  '/:token/documents/:did',
  ah(async (req, res) => {
    const f = await byToken(req, res);
    if (!f) return;
    if (!isOpen(f)) return res.status(400).json({ message: 'This form is closed.' });
    const d = f.documents.id(req.params.did);
    if (d) d.deleteOne();
    await f.save();
    res.json(publicView(f, f.data).documents);
  })
);

module.exports = { admin, pub };
