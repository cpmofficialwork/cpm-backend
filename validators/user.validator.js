const { body, param, validationResult } = require('express-validator');
const countries = require('i18n-iso-countries');
// "/max" pulls in full metadata (incl. number-type classification) — the default
// "min" build validates length/pattern but can't tell a mobile number from a landline.
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,49}$/u;
const PLACE_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,79}$/u;
const DISTRICT_REGEX = /^[\p{L}][\p{L}\p{M}\s'.-]{1,149}$/u;

const isRecognizedCountry = (value) => Boolean(countries.getAlpha2Code(value, 'en'));

const nameField = (field, regex, { required }, maxLength = 80) => {
  const chain = body(field);
  if (required) {
    chain.notEmpty().withMessage(`${field} is required`);
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .trim()
    .isLength({ min: 2, max: maxLength }).withMessage(`${field} must be 2-${maxLength} characters`)
    .bail()
    .matches(regex).withMessage(`${field} may only contain letters, spaces, apostrophes and hyphens`);
};

const baseRules = (opts = { required: true }) => [
  nameField('name', NAME_REGEX, opts).isLength({ max: 50 }).withMessage('name must be at most 50 characters'),

  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 56 })
    .bail()
    .custom(isRecognizedCountry).withMessage('country must be a recognized country name'),

  nameField('state', PLACE_REGEX, opts),
  nameField('district', DISTRICT_REGEX, opts, 150),
  nameField('constituency', PLACE_REGEX, opts),

  (opts.required ? body('mobile').notEmpty().withMessage('mobile is required') : body('mobile').optional({ checkFalsy: true }))
    .bail()
    .trim()
    .matches(/^\d{4,14}$/).withMessage('mobile must contain 4-14 digits only')
    .bail()
    .custom((value, { req }) => {
      const countryName = (req.body.country || 'India').trim();
      const alpha2 = countries.getAlpha2Code(countryName, 'en') || 'IN';
      const phone = parsePhoneNumberFromString(value, alpha2);
      if (!phone || !phone.isValid()) {
        throw new Error('mobile is not a valid phone number for the given country');
      }
      const type = phone.getType();
      if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
        throw new Error('mobile must be a mobile number, not a landline');
      }
      return true;
    }),
];

const validateCreateUser = baseRules({ required: true });
const validateUpdateUser = baseRules({ required: false });

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
  validateCreateUser,
  validateUpdateUser,
  validateIdParam,
  handleValidation,
};
