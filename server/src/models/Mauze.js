const { Schema, model } = require('mongoose');

const MauzeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    town: String,
    district: String,
    state: String,
    type: { type: String, enum: ['village', 'small_town', 'town', 'city'], default: 'small_town' },
    totalHouseholds: { type: Number, default: 0 }, // for coverage KPI
    prioritySectors: [String], // e.g. tailoring, food production, repair services
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MauzeSchema.index({ zone: 1, name: 1 }, { unique: true });

module.exports = model('Mauze', MauzeSchema);
