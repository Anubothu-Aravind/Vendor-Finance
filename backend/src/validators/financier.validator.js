const { body } = require('express-validator')
const validate = require('../middleware/validate')

exports.validateFinancier = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Financier name is required'),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Phone number must be a valid 10-digit Indian mobile number'),

  body('status')
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),

  validate
]
