const { body } = require('express-validator')
const validate = require('../middleware/validate')

exports.validateVendor = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Vendor name is required'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Phone number must be a valid 10-digit Indian mobile number'),
  
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email address is invalid'),
  
  body('gstin')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN number format'),
  
  body('type')
    .isIn(['smallVendor', 'largeVendor'])
    .withMessage('Type must be exactly Small Vendor (smallVendor) or Big Vendor (largeVendor)'),
  
  validate
]
