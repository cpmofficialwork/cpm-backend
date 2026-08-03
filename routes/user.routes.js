const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');
const {
  validateCreateUser,
  validateUpdateUser,
  validateIdParam,
  handleValidation,
} = require('../validators/user.validator');

router.post('/', validateCreateUser, handleValidation, createUser);
router.get('/', getUsers);
router.get('/:id', validateIdParam, handleValidation, getUserById);
router.put('/:id', validateIdParam, validateUpdateUser, handleValidation, updateUser);
router.delete('/:id', validateIdParam, handleValidation, deleteUser);

module.exports = router;
