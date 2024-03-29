"use strict";

const {
  model,
  Schema
} = require('mongoose');
const {
  genSalt,
  hash
} = require('bcryptjs');
const adminSchema = new Schema({
  email: {
    type: 'string',
    required: true
  },
  password: {
    type: 'string',
    required: true
  },
  firstName: {
    type: 'string'
  },
  lastName: {
    type: 'string'
  },
  code: {
    type: 'number'
  }
}, {
  versionKey: false
});
adminSchema.pre('save', async function (next) {
  const salt = await genSalt(10);
  this.password = await hash(this.password, salt);
  next();
});
const AdminModel = model('admin', adminSchema);
exports.AdminModel = AdminModel;
//# sourceMappingURL=adminModel.js.map