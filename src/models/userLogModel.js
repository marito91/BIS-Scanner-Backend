const { model, Schema } = require('mongoose');
// const { genSalt, hash } = require('bcryptjs');

const userLogSchema = new Schema(
  {
    date: {
      type: 'string',
      required: true,
    },
    time: {
      type: 'string',
      required: true,
    },
    text: {
      type: 'string',
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const UserLogModel = model('userLog', userLogSchema);

exports.UserLogModel = UserLogModel;
