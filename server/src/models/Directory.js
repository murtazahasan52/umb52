const { Schema, model } = require('mongoose');

const ObjectId = Schema.Types.ObjectId;

// Fostership (خانگی): ITS IDs a Mamur takes under fostership. Each ITS ID only once.
const FosterSchema = new Schema(
  {
    itsNo: { type: String, required: true, unique: true, match: /^\d{8}$/ },
    zone: { type: ObjectId, ref: 'Zone' },
    mauze: { type: ObjectId, ref: 'Mauze' },
    addedBy: { type: ObjectId, ref: 'User', required: true },
    addedByName: String,
    note: String,
  },
  { timestamps: true }
);

// Directory: Mumineen professionals added by a Mamur; every Mamur of the same Jamiat (zone) sees them
const PROFESSIONAL_CATEGORIES = {
  architect: 'Architect',
  structural_civil: 'Structural / Civil Engineer',
  mep: 'MEP Professional',
  interior: 'Interior Designer',
  promoter_builder: 'Promoter / Builder',
};
const ProfessionalSchema = new Schema(
  {
    itsNo: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    category: { type: String, enum: Object.keys(PROFESSIONAL_CATEGORIES), required: true },
    company: String,
    experienceYears: Number,
    zone: { type: ObjectId, ref: 'Zone' },
    addedBy: { type: ObjectId, ref: 'User', required: true },
    addedByName: String,
  },
  { timestamps: true }
);
ProfessionalSchema.index({ zone: 1, itsNo: 1 }, { unique: true });

// Office contacts: Jamiat Mushrif, Masool, Co-ordinator, FC…
const OfficeContactSchema = new Schema(
  {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    department: String,
    zone: { type: ObjectId, ref: 'Zone' },
    mauze: { type: ObjectId, ref: 'Mauze' },
    mobile: String,
    whatsapp: String,
    email: String,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = {
  Foster: model('Foster', FosterSchema),
  Professional: model('Professional', ProfessionalSchema),
  OfficeContact: model('OfficeContact', OfficeContactSchema),
  PROFESSIONAL_CATEGORIES,
};
