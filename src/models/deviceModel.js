const { model, Schema } = require('mongoose');

const deviceSchema = new Schema(
  {
    device: {
      type: 'string',
      required: true,
    },
    number: {
      type: 'number',
      required: true,
    },
    available: {
      type: 'boolean',
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
    comments: {
      type: 'string',
      required: true,
    },
    user: {
      type: 'number',
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const deviceModel = model('device', deviceSchema);

exports.deviceModel = deviceModel;
