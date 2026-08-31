const { body, param, validationResult } = require('express-validator');
const { EXTENSIONS_BY_CONTENT_TYPE } = require('../constants/upload');

const URL_REGEX = /^https?:\/\/.+/i;

const nameField = (opts = { required: true }) => {
  const chain = body('name');
  if (opts.required) {
    chain.notEmpty().withMessage('name is required');
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('name must be 2-150 characters');
};

const descriptionsField = (opts = { required: true }) => {
  const chain = body('descriptions');
  if (opts.required) {
    chain.notEmpty().withMessage('descriptions is required');
  } else {
    chain.optional({ checkFalsy: true });
  }
  return chain
    .bail()
    .trim()
    .isLength({ min: 2, max: 5000 })
    .withMessage('descriptions must be 2-5000 characters');
};

const urlArrayField = (field) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array of URLs`)
    .bail()
    .custom((arr) => arr.every((v) => typeof v === 'string' && URL_REGEX.test(v)))
    .withMessage(`${field} must contain only valid http(s) URLs`);

const validateCreateEvent = [
  nameField({ required: true }),
  descriptionsField({ required: true }),
  urlArrayField('imageUrls'),
  urlArrayField('videoUrls'),
];

const validateUpdateEvent = [
  nameField({ required: false }),
  descriptionsField({ required: false }),
  urlArrayField('imageUrls'),
  urlArrayField('videoUrls'),
];

const validateIdParam = [
  param('id').isMongoId().withMessage('id must be a valid identifier'),
];

const validateSignedUploadUrl = [
  param('id').isMongoId().withMessage('id must be a valid identifier'),
  body('type')
    .notEmpty()
    .withMessage('type is required')
    .bail()
    .isIn(Object.keys(EXTENSIONS_BY_CONTENT_TYPE))
    .withMessage('type must be one of: image, video'),
  body('contentType')
    .optional({ checkFalsy: true })
    .isString()
    .bail()
    .custom((value, { req }) => Boolean(EXTENSIONS_BY_CONTENT_TYPE[req.body.type]?.[value]))
    .withMessage('contentType is not a supported content-type for the given type'),
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
  validateCreateEvent,
  validateUpdateEvent,
  validateIdParam,
  validateSignedUploadUrl,
  handleValidation,
};
