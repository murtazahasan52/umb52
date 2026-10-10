const { Schema, model } = require('mongoose');

// Public "request support" submissions from the website / app
const EnquirySchema = new Schema(
  {
    refNo: { type: String, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    itsNo: String,
    mauze: { type: Schema.Types.ObjectId, ref: 'Mauze' },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    supportType: {
      type: String,
      enum: ['business', 'qardan_hasana', 'skill_training', 'employment', 'education', 'medical', 'housing', 'counselling', 'other'],
      default: 'other',
    },
    currentOccupation: String,
    message: String,
    status: { type: String, enum: ['new', 'contacted', 'surveyed', 'case_opened', 'not_eligible', 'closed'], default: 'new' },
    household: { type: Schema.Types.ObjectId, ref: 'Household' },
    notes: String,
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = model('Enquiry', EnquirySchema);
