const { model, Schema } = require('mongoose');
// const { genSalt, hash } = require('bcryptjs');

const communitySchema = new Schema(
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
    code: {
      type: 'number',
      required: true,
    },
    email: {
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
    active: {
      type: 'boolean',
      required: true,
    },
    books: {
      type: 'array',
      default: ['none'],
      required: true,
    },
    blocked: {
      type: 'boolean',
      required: true,
    },
    libraryFine: {
      type: 'boolean',
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const communityModel = model('community', communitySchema);

exports.communityModel = communityModel;
