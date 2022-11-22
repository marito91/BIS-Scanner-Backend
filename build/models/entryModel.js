"use strict";

const {
  model,
  Schema
} = require('mongoose');
const entrySchema = new Schema({
  grade: {
    type: 'string',
    required: true
  },
  lastName: {
    type: 'string',
    required: true
  },
  secondLastName: {
    type: 'string',
    required: true
  },
  firstName: {
    type: 'string',
    required: true
  },
  code: {
    type: 'number',
    required: true
  },
  email: {
    type: 'string',
    required: true
  },
  date: {
    type: 'string',
    required: true
  },
  time: {
    type: 'string',
    required: true
  },
  device: {
    type: 'string',
    required: true
  },
  number: {
    type: 'number',
    required: true
  },
  type: {
    type: 'string',
    required: true
  }
}, {
  versionKey: false
});
const entryModel = model('entry', entrySchema);
exports.entryModel = entryModel;
//# sourceMappingURL=entryModel.js.map