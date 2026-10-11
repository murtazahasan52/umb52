const { Schema } = require('mongoose');
// Scanned forms and supporting documents (stored in MongoDB GridFS, see routes/uploads.js)
const DocumentSchema = new Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: [
        // MPI case file checklist
        'family_profile', 'survey_details', 'case_profile', 'mpi_survey', 'photo_report',
        'mpi_analysis', 'deprivation_investigation', 'expert_advice', 'consultant_letter',
        'action_plan', 'budget_sheet', 'quotation', 'araz', 'consent_form', 'journal_log',
        // general
        'survey_form', 'application_form', 'id_proof', 'income_proof', 'business_document', 'bank_statement', 'invoice', 'photo', 'agreement', 'other',
      ],
      default: 'other',
    },
    url: { type: String, required: true },
    fileName: String,
    note: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    byName: String,
  },
  { timestamps: true }
);

module.exports = DocumentSchema;
