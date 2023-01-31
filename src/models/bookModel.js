const { model, Schema } = require('mongoose');

const bookSchema = new Schema({
  title: {
    type: 'string',
    required: true,
  },
  author: {
    type: 'string',
    required: true,
  },
  barcode: {
    type: 'string',
    required: true,
  },
  circulationType: {
    type: 'string',
    required: true,
  },
  isbn: {
    type: 'string',
    required: true,
  },
  materialType: {
    type: 'string',
    required: true,
  },
  publicationYear: {
    type: 'number',
    required: true,
  },
  price: {
    type: 'number',
    required: true,
  },
  available: {
    type: 'boolean',
    required: true,
  },
  sublocation: {
    type: 'string',
    required: true,
  },
  vendor: {
    type: 'string',
    required: true,
  },
  dateRented: {
    type: 'string',
    required: true,
  },
});

const BookModel = model('book', bookSchema);

exports.BookModel = BookModel;
