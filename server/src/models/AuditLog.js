const { Schema, model } = require('mongoose');

// Who accessed / changed confidential beneficiary data
const AuditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    role: String,
    action: String,
    entity: String,
    entityId: String,
    detail: String,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = model('AuditLog', AuditLogSchema);
