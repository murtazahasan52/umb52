const { Schema, model } = require('mongoose');
const { CASE_TYPES, SCHEMES, STAGES, FINAL_STATUS, INTERVENTIONS, TRAINING_CATEGORIES, RISK } = require('../config/constants');

const ObjectId = Schema.Types.ObjectId;
const DocumentSchema = require('./DocumentSchema');

// ---- Sub-documents -------------------------------------------------------

// Checkpoint 4 — feasibility before sanction
const FeasibilitySchema = new Schema(
  {
    purpose: String,
    investmentType: { type: String, enum: ['working_capital', 'fixed_asset', 'mixed', ''], default: '' },
    marketDemand: String,
    grossMarginPct: Number,
    projectedMonthlySales: Number,
    projectedMonthlyProfit: Number,
    existingLiabilities: Number,
    monthlyRepaymentCapacity: Number,
    securityOffered: String,
    documentsVerified: { type: Boolean, default: false },
    documentsNotes: String,
    proposedTenureMonths: Number,
    phasedDisbursement: { type: Boolean, default: false },
    recommendation: String, // counsellor / committee recommendation
    assessedBy: { type: ObjectId, ref: 'User' },
    assessedAt: Date,
    // Decision (authorised review committee — ZBC / HQ)
    decision: { type: String, enum: ['pending', 'approved', 'modified', 'rejected'], default: 'pending' },
    decisionReason: String,
    decidedBy: { type: ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { _id: false }
);

const DisbursementSchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    mode: String, // bank transfer, cheque, direct vendor payment
    reference: String,
    tranche: Number,
    note: String,
    by: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Checkpoint 5 — actual utilization
const UtilizationSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    item: String, // machinery, stock, equipment, fees...
    approvedPurpose: { type: Boolean, default: true }, // false => diversion
    amount: { type: Number, default: 0 },
    vendor: String,
    invoiceNo: String,
    evidence: [String], // uploaded file URLs
    siteVisit: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: ObjectId, ref: 'User' },
    verifiedAt: Date,
    resultingAsset: String, // productive asset / stock / activity created
    remarks: String,
    by: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Checkpoint 6 — monthly business & family performance
const MonthlyUpdateSchema = new Schema(
  {
    month: { type: String, required: true }, // YYYY-MM
    sales: Number,
    grossMarginPct: Number,
    netProfit: Number,
    workingCapital: Number,
    stockValue: Number,
    stockMovement: { type: String, enum: ['fast', 'normal', 'slow', 'not_moving', ''], default: '' },
    receivables: Number,
    otherDebtObligations: Number,
    jobsCreated: Number,
    familyMembersEmployed: Number,
    newCustomers: Number,
    householdIncome: Number,
    educationContinuing: { type: Boolean, default: true },
    businessOperating: { type: Boolean, default: true },
    challenges: String,
    notes: String,
    source: { type: String, enum: ['beneficiary', 'counsellor'], default: 'counsellor' },
    by: { type: ObjectId, ref: 'User' },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const InstallmentSchema = new Schema({
  no: Number,
  dueDate: Date,
  amount: Number,
  paidAmount: { type: Number, default: 0 },
  paidDate: Date,
  reference: String,
  note: String,
});

const VisitSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['site_visit', 'quarterly_review', 'half_yearly_review', 'phone_followup', 'counselling'], default: 'site_visit' },
    observations: String,
    financialReview: String,
    correctiveAction: String,
    nextReviewDate: Date,
    photos: [String],
    by: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Checkpoint 7 — capability building
const TrainingSchema = new Schema(
  {
    program: { type: String, required: true },
    category: { type: String, enum: TRAINING_CATEGORIES, default: 'other' },
    provider: String,
    plannedDate: Date,
    status: { type: String, enum: ['planned', 'ongoing', 'completed', 'dropped'], default: 'planned' },
    completedDate: Date,
    applied: { type: Boolean, default: false }, // is the learning applied in the business?
    notes: String,
  },
  { timestamps: true }
);

// Early-warning / recovery plan
const AlertSchema = new Schema(
  {
    level: { type: String, enum: ['high', 'medium'], required: true },
    reason: { type: String, required: true },
    action: String, // recovery plan
    mentor: { type: ObjectId, ref: 'User' },
    reviewDate: Date,
    referredToCommittee: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    resolution: String,
    by: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const OutcomeSchema = new Schema(
  {
    recordedAt: Date,
    householdIncome: Number,
    netProfit: Number,
    employment: Number, // jobs / earning members
    educationContinuity: { type: Boolean },
    financialStability: { type: String, enum: ['worse', 'same', 'better', 'much_better', ''], default: '' },
    selfReliance: { type: String, enum: ['dependent', 'improving', 'independent', ''], default: '' },
    notes: String,
    by: { type: ObjectId, ref: 'User' },
  },
  { _id: false }
);

const LogSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: 'User' },
    byName: String,
    action: String,
  },
  { _id: false }
);

// ---- Type-specific details
const HousingSchema = new Schema(
  {
    purpose: { type: String, enum: ['purchase', 'construction', 'repair', 'rent_deposit', 'other', ''], default: '' },
    currentHousing: { type: String, enum: ['owned', 'rented', 'family', 'other', ''], default: '' },
    propertyAddress: String,
    propertyDetails: String, // size, rooms, condition
    estimatedCost: Number,
    ownContribution: Number,
    completionStatus: { type: String, enum: ['not_started', 'in_progress', 'completed', ''], default: '' },
    completedAt: Date,
  },
  { _id: false }
);
const EducationSchema = new Schema(
  {
    studentName: String,
    relation: String,
    age: Number,
    level: { type: String, enum: ['school', 'junior_college', 'graduation', 'post_graduation', 'professional', 'vocational', 'other', ''], default: '' },
    course: String, // class / degree / course name
    institution: String,
    academicYear: String,
    annualFees: Number,
    otherCosts: Number,
    familyContribution: Number,
    lastResult: String,
    studyStatus: { type: String, enum: ['studying', 'completed', 'dropped', ''], default: '' },
  },
  { _id: false }
);
const BusinessDetailSchema = new Schema(
  {
    businessName: String,
    businessType: String,
    purpose: { type: String, enum: ['new_business', 'expansion', 'working_capital', 'equipment', 'formalization', 'other', ''], default: '' },
    estimatedCost: Number,
    ownContribution: Number,
  },
  { _id: false }
);

// ---- MPI Upliftment Case Profile (Marafiq Burhaniyah format)
const PersonSign = new Schema({ name: String, date: Date, signed: { type: Boolean, default: false } }, { _id: false });
const MpiSchema = new Schema(
  {
    jamiat: String,
    researcher: { itsNo: String, name: String, mobile: String },
    profileDate: Date,
    researcherRemarks: String,
    dimensions: {
      deeni: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
      livelihood: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
      health: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
      nutrition: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
      education: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
      standardOfLiving: { type: String, enum: ['deprived', 'not_deprived', ''], default: '' },
    },
    deprivationSummary: String,
    sdgs: String,
    objectives: String,
    // Deprivation investigation — one row per indicator
    indicators: [
      new Schema(
        { key: String, dimension: String, indicator: String, applicable: { type: Boolean, default: false }, investigation: String },
        { _id: false }
      ),
    ],
    experts: [
      new Schema({
        type: { type: String, enum: ['local', 'idara'], default: 'local' },
        name: String,
        itsNo: String,
        mobile: String,
        expertise: String,
        dimension: String,
        indicator: String,
        solution: String,
      }),
    ],
    actionPlan: [new Schema({ indicator: String, plan: String, responsible: String, timeRequired: String, status: { type: String, enum: ['pending', 'in_progress', 'done', ''], default: 'pending' } })],
    budget: [
      new Schema(
        {
          umoor: String,
          potential: Boolean,
          willingness: Boolean,
          scope: String,
          hrCount: Number,
          skills: String,
          timeFrame: String,
          own: Number,
          other: Number,
          qardanHasana: Number,
          enayat: Number,
        },
        { _id: false }
      ),
    ],
    consents: { aamil: PersonSign, jamaatSecretary: PersonSign, marafiqMember: PersonSign },
    journal: [new Schema({ date: { type: Date, default: Date.now }, note: String, byName: String })],
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

// ---- Main beneficiary-level record --------------------------------------

const CaseSchema = new Schema(
  {
    caseNo: { type: String, unique: true }, // QH-<MAUZE>-26-0001
    household: { type: ObjectId, ref: 'Household', required: true },
    mauze: { type: ObjectId, ref: 'Mauze', required: true },
    zone: { type: ObjectId, ref: 'Zone', required: true },

    beneficiaryName: { type: String, required: true },
    beneficiaryMobile: String,
    beneficiaryUser: { type: ObjectId, ref: 'User' },
    segment: { type: String, enum: ['', 'micro_business', 'existing_business', 'youth', 'woman_entrepreneur', 'agriculture', 'industrial', 'welfare'], default: '' },

    caseType: { type: String, enum: Object.keys(CASE_TYPES), default: 'business', index: true },
    scheme: { type: String, enum: Object.keys(SCHEMES), required: true },
    housing: { type: HousingSchema, default: undefined },
    education: { type: EducationSchema, default: undefined },
    businessDetail: { type: BusinessDetailSchema, default: undefined },

    // Checkpoint 2 — individual upliftment plan
    need: String,
    interventions: [{ type: String, enum: INTERVENTIONS }],
    planDetails: String,
    targetOutcome: String,
    targetDate: Date, // outcome within 6–12 months
    counsellor: { type: ObjectId, ref: 'User' },
    mentor: { type: ObjectId, ref: 'User' },
    reviewDate: Date,

    // Checkpoint 3 — scheme matching / informed consent
    termsExplained: { type: Boolean, default: false },
    termsExplainedAt: Date,
    matchingNotes: String,

    // Baseline (before assistance)
    baseline: {
      recordedAt: Date,
      monthlySales: Number,
      netProfit: Number,
      householdIncome: Number,
      employees: Number,
      debts: Number,
    },

    feasibility: { type: FeasibilitySchema, default: () => ({}) },

    // Money — four distinct measurements: sanctioned / disbursed / utilised / outcome
    amountApplied: { type: Number, default: 0 },
    amountSanctioned: { type: Number, default: 0 },
    sanctionDate: Date,
    tenureMonths: Number,
    installmentAmount: Number,
    disbursements: [DisbursementSchema],
    utilizations: [UtilizationSchema],
    repayments: [InstallmentSchema],

    monthlyUpdates: [MonthlyUpdateSchema],
    visits: [VisitSchema],
    trainings: [TrainingSchema],
    alerts: [AlertSchema],
    documents: [DocumentSchema],
    mpi: { type: MpiSchema, default: undefined },

    outcome6: { type: OutcomeSchema, default: undefined },
    outcome12: { type: OutcomeSchema, default: undefined },

    stage: { type: String, enum: STAGES, default: 'identified' },
    finalStatus: { type: String, enum: FINAL_STATUS, default: 'ongoing' },
    closedAt: Date,
    closureNote: String,

    // Repeat applications (checkpoint 8)
    previousCases: [{ type: ObjectId, ref: 'Case' }],
    repeatReason: { type: String, enum: ['', 'growth', 'distress', 'other'], default: '' },
    successStory: { type: Boolean, default: false }, // candidate for scaling

    // Computed by early-warning engine (cached for fast filtering)
    risk: { type: String, enum: Object.values(RISK), default: RISK.ON_TRACK },
    riskReasons: [String],
    riskComputedAt: Date,

    createdBy: { type: ObjectId, ref: 'User' },
    log: [LogSchema],
  },
  { timestamps: true }
);

CaseSchema.index({ mauze: 1, scheme: 1, stage: 1 });
CaseSchema.index({ risk: 1 });

module.exports = model('Case', CaseSchema);
