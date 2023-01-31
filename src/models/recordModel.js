const { model, Schema } = require('mongoose');

const recordSchema = new Schema(
  {
    grade: {
      type: 'string',
      required: true,
    },
    lastName: {
      type: 'string',
      required: true,
    },
    secondLastName: {
      type: 'string',
      required: true,
    },
    firstName: {
      type: 'string',
      required: true,
    },
    document: {
      type: 'number',
      required: true,
    },
    email: {
      type: 'string',
      required: true,
    },
    date: {
      type: 'string',
      required: true,
    },
    time: {
      type: 'string',
      required: true,
    },
    device: {
      type: 'string',
      required: true,
    },
    number: {
      type: 'number',
      required: true,
    },
    type: {
      type: 'string',
      required: true,
    },
    book: {
      type: 'array',
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const RecordModel = model('record', recordSchema);

exports.RecordModel = RecordModel;
