const { body } = require('express-validator')
const validate = require('../middleware/validate')
const Vendor = require('../models/Vendor')

exports.validateBill = [
  body('billNumber')
    .trim()
    .notEmpty()
    .withMessage('Bill number is required'),

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
    .withMessage('Amount must be a positive number'),

  body('billDate')
    .notEmpty()
    .withMessage('Bill date is required')
    .isISO8601()
    .withMessage('Invalid bill date format'),

  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid due date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.billDate)) {
        throw new Error('Due date cannot be before bill date')
      }
      return true
    }),

  validate
]
