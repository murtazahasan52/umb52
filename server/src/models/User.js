const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    itsNo: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    mauze: { type: Schema.Types.ObjectId, ref: 'Mauze' },
    designation: String, // e.g. "ZBC Member", "Tijaarat Committee Head", "Mentor"
    expertise: [String], // for mentors
    household: { type: Schema.Types.ObjectId, ref: 'Household' }, // for beneficiary
    active: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

UserSchema.pre('save', async function hash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.checkPassword = function checkPassword(pw) {
  return bcrypt.compare(pw, this.password);
};

UserSchema.methods.toSafe = function toSafe() {
  const o = this.toObject();
  delete o.password;
  return o;
};

module.exports = model('User', UserSchema);
