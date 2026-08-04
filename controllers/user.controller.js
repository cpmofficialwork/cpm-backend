const countries = require('i18n-iso-countries');
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');
const User = require('../models/user.model');
const { getNextSequence } = require('../models/counter.model');

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

// Only these fields are ever read from req.body — prevents mass-assignment of
// unexpected keys (e.g. _id, countryCode, timestamps) regardless of what a client sends.
const pickUserInput = (body) => ({
  name: body.name,
  mobile: body.mobile,
  country: body.country,
  state: body.state,
  district: body.district,
  subDistrict: body.subDistrict,
  villageOrTown: body.villageOrTown,
});

// Derives countryCode + normalizes mobile to national-number digits, using the
// server's own phone-parsing logic rather than trusting a client-supplied dial code.
const resolvePhone = (mobile, country) => {
  const countryName = (country || 'India').trim();
  const alpha2 = countries.getAlpha2Code(countryName, 'en') || 'IN';
  const phone = parsePhoneNumberFromString(mobile, alpha2);
  if (!phone || !phone.isValid()) {
    return null;
  }
  const type = phone.getType();
  if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
    return null;
  }
  return {
    countryCode: `+${phone.countryCallingCode}`,
    mobile: phone.nationalNumber,
    country: countryName,
  };
};

const handleMongoError = (err, res) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'This mobile number is already registered' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Something went wrong' });
};

exports.createUser = async (req, res) => {
  try {
    const input = pickUserInput(req.body);
    const phone = resolvePhone(input.mobile, input.country);
    if (!phone) {
      return res.status(400).json({ message: 'mobile is not a valid phone number for the given country' });
    }

    const seq = await getNextSequence('memberID');
    const memberID = `CPM-MEM-${String(seq).padStart(6, '0')}`;

    const user = await User.create({
      ...input,
      ...phone,
      memberID,
    });

    res.status(201).json(user);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const input = pickUserInput(req.body);
    const update = { ...input };

    if (input.mobile) {
      const existing = await User.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      const phone = resolvePhone(input.mobile, input.country || existing.country);
      if (!phone) {
        return res.status(400).json({ message: 'mobile is not a valid phone number for the given country' });
      }
      Object.assign(update, phone);
    }

    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
      context: 'query',
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    handleMongoError(err, res);
  }
};
