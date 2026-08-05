const { body } = require('express-validator')
const validate = require('../middleware/validate')

exports.validateProfile = [
  body('businessName')
    .optional()
    .trim()
    .notEmpty().withMessage('Business name cannot be empty')
    .isLength({ min: 2, max: 200 }).withMessage('Business name must be between 2 and 200 characters'),

  body('ownerName')
    .optional()
    .trim()
    .notEmpty().withMessage('Owner name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Owner name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email address is invalid'),

  body('phone')
    .optional()
    .trim()
    .customSanitizer(v => (v ? v.replace(/[\s\-\+\(\)]/g, '').replace(/^91/, '') : v))
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a 10-digit number'),

  body('address')
    .optional()
    .trim()
    .notEmpty().withMessage('Address cannot be empty')
    .isLength({ min: 2, max: 500 }).withMessage('Address must be between 2 and 500 characters'),

  body('gstin')
    .optional({ checkFalsy: true })
    .trim()
    .customSanitizer(v => (v ? v.toUpperCase() : v)),

  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .customSanitizer(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v)),

  validate
]
