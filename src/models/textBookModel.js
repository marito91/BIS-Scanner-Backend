const { model, Schema } = require('mongoose');

const textBookSchema = new Schema({
  userDocument: {
    type: 'number',
    required: true,
  },
  title: {
    type: 'string',
    required: true,
  },
  available: {
    type: 'boolean',
    required: true,
  },
  dateRented: {
    type: 'string',
  },
  dateReturned: {
    type: 'string',
  },
  number: {
    type: 'number',
    required: true,
  },
  grades: {
    type: 'array',
  },
  rentalHistory: [
    {
      userDocument: {
        type: 'number',
        ref: 'User',
        required: true,
      },
      dateRented: {
        type: 'string',
      },
      dateReturned: {
        type: 'string',
      },
      conditions: {
        type: 'string',
      },
    },
  ],
});

const TextBookModel = model('textbook', textBookSchema);

exports.TextBookModel = TextBookModel;
