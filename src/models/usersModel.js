const { model, Schema } = require('mongoose');

const usersSchema = new Schema(
  {
    document: {
      type: 'number',
      required: true,
    },
    device: {
      type: 'string',
      required: true,
    },
    date: {
      type: 'string',
      required: true,
    },
    email: {
      type: 'string',
      required: true,
    },
    active: {
      type: 'boolean',
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const usersModel = model('users', usersSchema);

exports.usersModel = usersModel;
