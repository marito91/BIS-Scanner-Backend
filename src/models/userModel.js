const { model, Schema } = require('mongoose');
// const { genSalt, hash } = require('bcryptjs');

const userSchema = new Schema(
  {
    section: {
      type: 'string',
      required: true,
    },
    grade: {
      type: 'string',
      required: true,
    },
    lastName: {
      type: 'string',
      required: true,
    },
    name: {
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
    blocked: {
      type: 'boolean',
      required: true,
    },
    hasDeviceRented: {
      type: 'boolean',
      required: true,
    },
    hasBookRented: {
      type: 'boolean',
      required: true,
    },
    hasCalculatorRented: {
      type: 'boolean',
      required: true,
    },
    deviceHistory: {
      type: 'array',
      default: [
        {
          device: {
            type: 'string',
          },
          dateRented: {
            type: Date,
          },
          dateReturned: {
            type: Date,
          },
          conditions: {
            type: String,
          },
        },
      ],
    },
    bookHistory: {
      type: 'array',
      default: [
        {
          barcode: {
            type: 'string',
          },
          dueDate: {
            type: Date,
          },
          dateRented: {
            type: Date,
          },
          dateReturned: {
            type: Date,
          },
          conditions: {
            type: String,
          },
        },
      ],
    },
    textbookHistory: {
      type: 'array',
      default: [
        {
          calculator: {
            type: 'string',
          },
          number: {
            type: 'number',
          },
          dateRented: {
            type: Date,
          },
          dateReturned: {
            type: Date,
          },
          conditions: {
            type: String,
          },
        },
      ],
    },
    calculatorHistory: {
      type: 'array',
      default: [
        {
          calculator: {
            type: 'string',
          },
          dateRented: {
            type: Date,
          },
          dateReturned: {
            type: Date,
          },
          conditions: {
            type: String,
          },
        },
      ],
    },
  },
  {
    versionKey: false,
  }
);

const UserModel = model('user', userSchema);

exports.UserModel = UserModel;
