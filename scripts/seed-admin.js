// One-time bootstrap: creates the first Admin directly against the database,
// bypassing the HTTP API (POST /api/admins requires an existing admin's JWT,
// so the very first admin can't be created through the API).
//
// Usage:
//   node scripts/seed-admin.js --username=superadmin --email=admin@example.com --password=Passw0rd1
// Or via env vars:
//   SEED_ADMIN_USERNAME=superadmin SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=Passw0rd1 node scripts/seed-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/admin.model');

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
};

const run = async () => {
  const args = parseArgs();
  const username = args.username || process.env.SEED_ADMIN_USERNAME;
  const email = args.email || process.env.SEED_ADMIN_EMAIL;
  const password = args.password || process.env.SEED_ADMIN_PASSWORD;

  if (!username || !email || !password) {
    console.error(
      'Usage: node scripts/seed-admin.js --username=<username> --email=<email> --password=<password>'
    );
    process.exit(1);
  }

  await connectDB();

  try {
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.error(`An admin with email "${email}" already exists (id: ${existing._id}). Aborting.`);
      process.exitCode = 1;
      return;
    }

    const admin = await Admin.create({ username, email, password });
    console.log('Admin created:');
    console.log({
      _id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      status: admin.status,
    });
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
