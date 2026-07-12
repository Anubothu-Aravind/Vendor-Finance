const { body } = require('express-validator')
const validate = require('../middleware/validate')
const Vendor = require('../models/Vendor')

exports.validatePayment = [
  body('vendorId')
    .isMongoId()
    .withMessage('Invalid Vendor ID format')
    .custom(async (value) => {
      const vendor = await Vendor.findOne({ _id: value, isDeleted: false })
      if (!vendor) {
        throw new Error('Vendor does not exist in the system')
      }
      return true
    }),

  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .custom(async (value, { req }) => {
      const vendor = await Vendor.findOne({ _id: req.body.vendorId, isDeleted: false })
      if (!vendor) {
        return true // Handled by vendorId validation
      }
      
      const outstanding = vendor.outstandingBalance || 0
      if (value > outstanding) {
        throw new Error(`Payment amount ₹${value.toLocaleString('en-IN')} exceeds outstanding balance of ₹${outstanding.toLocaleString('en-IN')}`)
      }
      return true
    }),

  body('paymentDate')
    .notEmpty()
    .withMessage('Payment date is required')
    .isISO8601()
    .withMessage('Invalid payment date format'),

  body('paymentMode')
    .notEmpty()
    .withMessage('Payment mode is required'),

  validate
]
