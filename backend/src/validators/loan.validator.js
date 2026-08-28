const { body } = require('express-validator')
const validate = require('../middleware/validate')
const Financier = require('../models/Financier')

exports.validateLoan = [
  body('loanReference')
    .custom((value, { req }) => {
      const ref = value || req.body.noteNumber
      if (!ref || !String(ref).trim()) {
        throw new Error('Loan Reference is required')
      }
      req.body.loanReference = String(ref).trim()
      return true
    }),

  body('financierId')
    .custom(async (value, { req }) => {
      const finId = value || req.body.financier
      if (!finId) {
        throw new Error('Financier is required')
      }
      if (!/^[0-9a-fA-F]{24}$/.test(finId)) {
        throw new Error('Invalid Financier ID format')
      }
      req.body.financierId = finId
      const mongoose = require('mongoose')
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const financier = await Financier.findOne({ _id: finId, isDeleted: false })
        if (!financier) {
          throw new Error('Financier does not exist in the system')
        }
      }
      return true
    }),

  body('principalAmount')
    .custom((value, { req }) => {
      const val = value !== undefined ? value : req.body.amount
      const num = parseFloat(val)
      if (isNaN(num) || num <= 0) {
        throw new Error('Principal amount must be a positive number')
      }
      req.body.principalAmount = num
      return true
    }),

  body('interestRate')
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      const val = value !== undefined && value !== '' ? value : req.body.rate
      if (val !== undefined && val !== '') {
        const num = parseFloat(val)
        if (isNaN(num) || num < 0 || num > 100) {
          throw new Error('Interest rate must be a valid percentage between 0 and 100')
        }
        req.body.interestRate = num
      }
      return true
    }),

  body('drawdownDate')
    .custom((value, { req }) => {
      const dateVal = value || req.body.loanDate || req.body.date
      if (!dateVal) {
        throw new Error('Drawdown date is required')
      }
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) {
        throw new Error('Invalid drawdown date format')
      }
      req.body.drawdownDate = dateVal
      return true
    }),

  body('maturityDate')
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (value) {
        const matDate = new Date(value)
        if (isNaN(matDate.getTime())) {
          throw new Error('Invalid maturity date format')
        }
        const drawDate = new Date(req.body.drawdownDate)
        if (!isNaN(drawDate.getTime()) && matDate < drawDate) {
          throw new Error('Maturity date cannot be before drawdown date')
        }
      }
      return true
    }),

  validate
]
