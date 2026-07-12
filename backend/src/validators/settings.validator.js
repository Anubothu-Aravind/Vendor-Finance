const { body } = require('express-validator')
const validate = require('../middleware/validate')

exports.validateProfile = [
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),

  body('ownerName')
    .trim()
    .notEmpty()
    .withMessage('Owner name is required'),

  body('email')
    .isEmail()
    .withMessage('Email address is invalid'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('gstin')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN number format'),

  validate
]
