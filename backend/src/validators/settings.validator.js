const { body } = require('express-validator')
const validate = require('../middleware/validate')

exports.validateProfile = [
  body('businessName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Business name cannot be empty'),

  body('ownerName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Owner name cannot be empty'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email address is invalid'),

  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),

  body('gstin')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN number format'),

  validate
]
