const { Schema, model } = require('mongoose');

const GrievanceSchema = new Schema(
  {
    ticketNo: { type: String, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    itsNo: String,
    mauze: { type: Schema.Types.ObjectId, ref: 'Mauze' },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    category: { type: String, enum: ['delay', 'eligibility', 'conduct', 'repayment', 'disbursement', 'other'], default: 'other' },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'rejected'], default: 'open' },
    slaDays: { type: Number, default: 15 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    response: String,
    resolvedAt: Date,
    eligible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Grievance', GrievanceSchema);
