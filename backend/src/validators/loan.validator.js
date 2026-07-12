const { body } = require('express-validator')
const validate = require('../middleware/validate')
const Financier = require('../models/Financier')

exports.validateLoan = [
  body('loanReference')
    .trim()
    .notEmpty()
    .withMessage('Loan Reference is required'),

  body('financierId')
    .isMongoId()
    .withMessage('Invalid Financier ID format')
    .custom(async (value) => {
      const financier = await Financier.findOne({ _id: value, isDeleted: false })
      if (!financier) {
        throw new Error('Financier does not exist in the system')
      }
      return true
    }),

  body('principalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Principal amount must be a positive number'),

  body('interestRate')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Interest rate must be a valid percentage between 0 and 100'),

  body('drawdownDate')
    .notEmpty()
    .withMessage('Drawdown date is required')
    .isISO8601()
    .withMessage('Invalid drawdown date format'),

  body('maturityDate')
    .notEmpty()
    .withMessage('Maturity date is required')
    .isISO8601()
    .withMessage('Invalid maturity date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.drawdownDate)) {
        throw new Error('Maturity date cannot be before drawdown date')
      }
      return true
    }),

  validate
]
