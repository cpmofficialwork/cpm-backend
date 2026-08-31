const mongoose = require('mongoose');

const URL_REGEX = /^https?:\/\/.+/i;
const isValidUrl = (value) => typeof value === 'string' && URL_REGEX.test(value);

const urlArrayField = (label) => ({
  type: [String],
  default: [],
  validate: {
    validator: (arr) => arr.every(isValidUrl),
    message: `${label} must contain only valid http(s) URLs`,
  },
});

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: 150,
    },
    descriptions: {
      type: String,
      required: [true, 'descriptions is required'],
      trim: true,
      maxlength: 5000,
    },
    imageUrls: urlArrayField('imageUrls'),
    videoUrls: urlArrayField('videoUrls'),
    // References the Admin who created/last updated this event. Set server-side
    // from the authenticated admin (see controller) — never trusted from client
    // input, so it can't be spoofed to attribute the change to another admin.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('Event', eventSchema);
