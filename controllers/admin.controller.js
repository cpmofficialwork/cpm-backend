const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

// Only these fields are ever read from req.body — prevents mass-assignment of
// unexpected keys (e.g. _id, status, timestamps) regardless of what a client sends.
const pickCreateInput = (body) => ({
  username: body.username,
  email: body.email,
  password: body.password,
  createrId: body.createrId || null,
});

const pickUpdateInput = (body) => ({
  username: body.username,
  email: body.email,
  password: body.password,
  status: body.status,
});

const signToken = (admin) =>
  jwt.sign(
    { id: admin._id, email: admin.email, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

const handleMongoError = (err, res) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'This email is already registered' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Something went wrong' });
};

exports.createAdmin = async (req, res) => {
  try {
    const input = pickCreateInput(req.body);

    if (input.createrId) {
      const creator = await Admin.findById(input.createrId);
      if (!creator) {
        return res.status(400).json({ message: 'createrId does not reference an existing admin' });
      }
    }

    const admin = await Admin.create(input);
    res.status(201).json(admin);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ message: 'This admin account is inactive' });
    }

    const token = signToken(admin);
    res.status(200).json({ token, admin });
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.status(200).json(admins);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json(admin);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const input = pickUpdateInput(req.body);
    Object.keys(input).forEach((key) => input[key] === undefined && delete input[key]);

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    Object.assign(admin, input);
    await admin.save();

    res.status(200).json(admin);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ message: 'Admin deleted' });
  } catch (err) {
    handleMongoError(err, res);
  }
};
