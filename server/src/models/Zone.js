const { Schema, model } = require('mongoose');

const ZoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true },
    notes: String,
  },
  { timestamps: true }
);

module.exports = model('Zone', ZoneSchema);
