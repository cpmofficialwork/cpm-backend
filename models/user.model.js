const mongoose = require('mongoose');

// Unicode-aware: letters of any language (Tamil, Hindi, English, ...), spaces, apostrophe, hyphen, period.
// Deliberately excludes <, >, &, ", { } so no HTML/JS or Mongo-operator payload can pass even before sanitization.
const NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,49}$/u;
const PLACE_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,79}$/u;
const DISTRICT_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,149}$/u;

const userSchema = new mongoose.Schema(
  {
    // Assigned server-side from the Counter sequence (see controller) — never trusted
    // from client input, so it can't be spoofed or collided by a client-supplied value.
    memberID: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: [/^CPM-MEM-\d{6,}$/, 'memberID must look like CPM-MEM-000001'],
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      match: [NAME_REGEX, 'name must be 2-50 letters (spaces, apostrophes, hyphens allowed)'],
    },
    // Derived server-side from `country` (see controller) — never trusted from client input,
    // so it can't be spoofed to mismatch the actual phone number's country.
    countryCode: {
      type: String,
      required: true,
      match: [/^\+\d{1,4}$/, 'countryCode must look like +91'],
    },
    // Stored as the national-format digit string (e.g. "9876543210"), not a Number:
    // phone numbers are identifiers, not quantities — a Number type would silently drop
    // leading zeros, can't hold values beyond 2^53 once combined with longer codes, and
    // invites accidental arithmetic. Format/validity is enforced by the validator layer
    // (libphonenumber-js) instead of relying on the DB type.
    mobile: {
      type: String,
      required: [true, 'mobile is required'],
      trim: true,
      match: [/^\d{4,14}$/, 'mobile must be digits only'],
    },
    country: {
      type: String,
      required: [true, 'country is required'],
      trim: true,
      default: 'India',
      maxlength: 56,
    },
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true,
      match: [PLACE_REGEX, 'state must be 2-80 letters'],
    },
    district: {
      type: String,
      required: [true, 'district is required'],
      trim: true,
      match: [DISTRICT_REGEX, 'district must be 2-150 letters'],
    },
    subDistrict: {
      type: String,
      trim: true,
      match: [PLACE_REGEX, 'subDistrict must be 2-80 letters'],
    },
    villageOrTown: {
      type: String,
      trim: true,
      match: [PLACE_REGEX, 'villageOrTown must be 2-80 letters'],
    },
  },
  { timestamps: true, strict: true }
);

// One registration per phone number — blocks duplicate/spam submissions.
userSchema.index({ countryCode: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
