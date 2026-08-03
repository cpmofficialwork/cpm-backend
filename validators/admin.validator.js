const { body, param, validationResult } = require('express-validator');

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;
// At least one lowercase, one uppercase, one digit — length is checked separately.
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const usernameField = (opts = { required: true }) => {
  const chain = body('username');
  if (opts.required) {
    chain.notEmpty().withMessage('username is required');
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .trim()
    .matches(USERNAME_REGEX)
    .withMessage('username must be 3-50 characters (letters, numbers, underscore, hyphen, period)');
};

const emailField = (opts = { required: true }) => {
  const chain = body('email');
  if (opts.required) {
    chain.notEmpty().withMessage('email is required');
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address');
};

const passwordField = (opts = { required: true }) => {
  const chain = body('password');
  if (opts.required) {
    chain.notEmpty().withMessage('password is required');
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage('password must be at least 8 characters')
    .bail()
    .matches(PASSWORD_STRENGTH_REGEX)
    .withMessage('password must contain an uppercase letter, a lowercase letter and a number');
};

const validateCreateAdmin = [
  usernameField({ required: true }),
  emailField({ required: true }),
  passwordField({ required: true }),
  body('createrId').optional({ checkFalsy: true }).isMongoId().withMessage('createrId must be a valid identifier'),
];

const validateLogin = [
  body('email').notEmpty().withMessage('email is required').bail().trim().isEmail().withMessage('email must be a valid email address'),
  body('password').notEmpty().withMessage('password is required'),
];

const validateUpdateAdmin = [
  usernameField({ required: false }),
  emailField({ required: false }),
  passwordField({ required: false }),
  body('status').optional({ checkFalsy: true }).isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];

const validateIdParam = [
  param('id').isMongoId().withMessage('id must be a valid identifier'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = {
  validateCreateAdmin,
  validateLogin,
  validateUpdateAdmin,
  validateIdParam,
  handleValidation,
};
