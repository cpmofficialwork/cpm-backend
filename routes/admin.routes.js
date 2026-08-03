const express = require('express');
const router = express.Router();
const {
  createAdmin,
  loginAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require('../controllers/admin.controller');
const {
  validateCreateAdmin,
  validateLogin,
  validateUpdateAdmin,
  validateIdParam,
  handleValidation,
} = require('../validators/admin.validator');
const authenticate = require('../middlewares/auth.middleware');

// Only login is open. Every other route below requires a valid admin JWT
// (see authenticate) — nothing else, including creating a new admin, is
// reachable anonymously; an admin must be logged in to create another.
router.post('/login', validateLogin, handleValidation, loginAdmin);

router.use(authenticate);

router.post('/', validateCreateAdmin, handleValidation, createAdmin);
router.get('/', getAdmins);
router.get('/:id', validateIdParam, handleValidation, getAdminById);
router.put('/:id', validateIdParam, validateUpdateAdmin, handleValidation, updateAdmin);
router.delete('/:id', validateIdParam, handleValidation, deleteAdmin);

module.exports = router;
