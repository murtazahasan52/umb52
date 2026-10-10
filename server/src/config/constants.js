// Shared enums for the whole system

const ROLES = {
  HQ: 'hq', // HQ / relevant scheme authority (super admin)
  ZBC: 'zbc', // Zonal Business Council
  MAUZE: 'mauze', // Local Tijaarat Committee / Mauze team lead
  COUNSELLOR: 'counsellor', // Counsellor / mentor (field)
  BENEFICIARY: 'beneficiary', // Beneficiary / family (app)
};
const STAFF_ROLES = [ROLES.HQ, ROLES.ZBC, ROLES.MAUZE, ROLES.COUNSELLOR];

const SCHEMES = {
  QH: 'Qardan Hasana',
  TR: 'Tijaarat Raabehah',
  SKILL: 'Skill & Employment',
  WELFARE: 'Family Welfare',
};
const BUSINESS_SCHEMES = ['QH', 'TR'];

const STAGES = ['identified', 'planned', 'feasibility', 'sanctioned', 'disbursed', 'monitoring', 'closed'];

const FINAL_STATUS = ['ongoing', 'achieved', 'needs_intervention', 'closed'];

const HOUSEHOLD_CATEGORIES = [
  'business_owner',
  'salaried',
  'daily_wage',
  'woman_entrepreneur',
  'youth',
  'student',
  'financial_hardship',
];

const INTERVENTIONS = [
  'business_expansion',
  'business_formalization',
  'employment',
  'skill_development',
  'entrepreneurship',
  'education',
  'medical',
  'housing',
  'financial_counselling',
  'business_mentoring',
];

const TRAINING_CATEGORIES = [
  'accounting',
  'pricing',
  'stock_management',
  'cash_flow',
  'gst_udyam',
  'digital_payments',
  'digital_marketing',
  'online_sales',
  'mentorship',
  'vocational',
  'other',
];

const RISK = { HIGH: 'high', MEDIUM: 'medium', ON_TRACK: 'on_track' };

module.exports = {
  ROLES,
  STAFF_ROLES,
  SCHEMES,
  BUSINESS_SCHEMES,
  STAGES,
  FINAL_STATUS,
  HOUSEHOLD_CATEGORIES,
  INTERVENTIONS,
  TRAINING_CATEGORIES,
  RISK,
};
