const { model, Schema } = require('mongoose');

const deviceSchema = new Schema({
  userDocument: {
    type: 'number',
    ref: 'User',
    required: true,
  },
  available: {
    type: Boolean,
    default: true,
    required: true,
  },
  conditions: {
    type: String,
    required: true,
  },
  dateRented: {
    type: String,
    required: true,
  },
  dateReturned: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    required: true,
  },
  deviceNumber: {
    type: Number,
    required: true,
  },
  rentalHistory: [
    {
      userDocument: {
        type: 'number',
        ref: 'User',
        required: true,
      },
      dateRented: {
        type: String,
      },
      dateReturned: {
        type: String,
      },
      conditions: {
        type: String,
      },
    },
  ],
});

const DeviceModel = model('device', deviceSchema);

exports.DeviceModel = DeviceModel;
