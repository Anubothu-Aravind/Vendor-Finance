const { body, param } = require('express-validator')
const validate = require('../middleware/validate')
const Loan = require('../models/Loan')

exports.validateRepayment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Loan ID format')
    .custom(async (value) => {
      const loan = await Loan.findOne({ _id: value, isDeleted: false })
      if (!loan) {
        throw new Error('Loan does not exist in the system')
      }
      return true
    }),

  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .custom(async (value, { req }) => {
      const loan = await Loan.findOne({ _id: req.params.id, isDeleted: false })
      if (!loan) {
        return true // Handled by param validation
      }

      const outstanding = loan.outstandingPrincipal || 0
      if (value > outstanding) {
        throw new Error(`Repayment amount ₹${value.toLocaleString('en-IN')} exceeds outstanding balance of ₹${outstanding.toLocaleString('en-IN')}`)
      }
      return true
    }),

  body('repaymentDate')
    .notEmpty()
    .withMessage('Repayment date is required')
    .isISO8601()
    .withMessage('Invalid repayment date format'),

  body('repaymentMode')
    .notEmpty()
    .withMessage('Repayment mode is required'),

  validate
]
