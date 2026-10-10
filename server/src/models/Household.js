const { Schema, model } = require('mongoose');
const { HOUSEHOLD_CATEGORIES } = require('../config/constants');

// Checkpoint 1 — confidential household & livelihood survey
const MemberSchema = new Schema(
  {
    name: String,
    relation: String,
    age: Number,
    gender: { type: String, enum: ['M', 'F', ''] },
    occupation: String,
    earning: { type: Boolean, default: false },
    monthlyIncome: { type: Number, default: 0 },
    education: String, // current class / qualification
    studying: { type: Boolean, default: false },
    skills: String,
  },
  { _id: false }
);

const HouseholdSchema = new Schema(
  {
    code: { type: String, unique: true }, // HH-<MAUZE>-0001
    mauze: { type: Schema.Types.ObjectId, ref: 'Mauze', required: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },

    headName: { type: String, required: true, trim: true },
    itsNo: String,
    mobile: String,
    address: String,

    categories: [{ type: String, enum: HOUSEHOLD_CATEGORIES }],
    members: [MemberSchema],
    totalMembers: { type: Number, default: 1 },
    earningMembers: { type: Number, default: 0 },

    // Income
    mainIncomeSource: String,
    monthlyHouseholdIncome: { type: Number, default: 0 },

    // Existing business
    business: {
      exists: { type: Boolean, default: false },
      name: String,
      type: { type: String }, // trading, tailoring, food, repair, manufacturing, agriculture, service...
      yearsRunning: Number,
      monthlyTurnover: { type: Number, default: 0 },
      monthlyNetIncome: { type: Number, default: 0 },
      gstRegistered: { type: Boolean, default: false },
      udyamRegistered: { type: Boolean, default: false },
      digitalPayments: { type: Boolean, default: false },
    },

    // Liabilities
    debts: {
      total: { type: Number, default: 0 },
      monthlyEmi: { type: Number, default: 0 },
      details: String,
    },

    // Essential needs
    housing: { type: String, enum: ['owned', 'rented', 'family', 'other', ''], default: '' },
    housingNeed: String,
    educationNeed: String,
    healthcareNeed: String,
    otherNeeds: String,

    // Skills & opportunities
    skills: String,
    employmentInterests: String,
    businessOpportunities: String,

    // Existing support
    existingQH: { type: Boolean, default: false },
    existingQHAmount: { type: Number, default: 0 },
    existingTR: { type: Boolean, default: false },
    existingSupportNotes: String,

    // Assessment
    needLevel: { type: String, enum: ['none', 'low', 'medium', 'high', 'urgent'], default: 'none' },
    supportPlanIdentified: { type: Boolean, default: false },
    assessedAt: Date,
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confidentialNotes: String, // visible to staff only
  },
  { timestamps: true }
);

HouseholdSchema.index({ mauze: 1, headName: 1 });

module.exports = model('Household', HouseholdSchema);
