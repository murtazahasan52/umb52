const { Schema, model } = require('mongoose');
const DocumentSchema = require('./DocumentSchema');

// A personal form link the admin sends to a family (WhatsApp / SMS / copy link)
const FormRequestSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    refNo: { type: String, unique: true },
    purpose: { type: String, enum: ['registration', 'update'], default: 'registration' },
    name: { type: String, required: true },
    mobile: String,
    mauze: { type: Schema.Types.ObjectId, ref: 'Mauze', required: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    household: { type: Schema.Types.ObjectId, ref: 'Household' }, // set when sent to an existing family
    message: String, // personal note shown on the form
    status: { type: String, enum: ['sent', 'opened', 'submitted', 'converted', 'rejected', 'cancelled'], default: 'sent' },
    expiresAt: Date,
    openedAt: Date,
    submittedAt: Date,
    submissions: { type: Number, default: 0 },

    // What the family filled in
    data: { type: Schema.Types.Mixed },
    documents: [DocumentSchema],

    reviewNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    convertedHousehold: { type: Schema.Types.ObjectId, ref: 'Household' },
    convertedCase: { type: Schema.Types.ObjectId, ref: 'Case' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FormRequestSchema.index({ mauze: 1, status: 1 });

module.exports = model('FormRequest', FormRequestSchema);
