const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');

// Read-only, admin-only stats — every route here requires a valid admin JWT.
router.use(authenticate);

router.get('/stats', getDashboardStats);

module.exports = router;
