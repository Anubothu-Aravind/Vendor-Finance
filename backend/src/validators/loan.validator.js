const { body } = require('express-validator')
const validate = require('../middleware/validate')
const Financier = require('../models/Financier')

exports.validateLoan = [
  (req, res, next) => {
    // Normalize empty strings and aliases for optional fields
    if (req.body.interestRate === '' || req.body.interestRate === undefined) {
      if (req.body.rate !== undefined && req.body.rate !== '') {
        req.body.interestRate = req.body.rate
      } else {
        req.body.interestRate = null
      }
    }
    if (req.body.drawdownDate === '' || req.body.drawdownDate === undefined) {
      const d = req.body.loanDate !== undefined ? req.body.loanDate : req.body.date
      req.body.drawdownDate = (d !== '' && d !== undefined) ? d : null
    }
    if (req.body.maturityDate === '' || req.body.maturityDate === undefined) {
      req.body.maturityDate = null
    }
    next()
  },

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
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== null && value !== undefined) {
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 100) {
          throw new Error('Interest rate must be a valid percentage between 0 and 100')
        }
        req.body.interestRate = num
      }
      return true
    }),

  body('drawdownDate')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== null && value !== undefined) {
        const d = new Date(value)
        if (isNaN(d.getTime())) {
          throw new Error('Invalid drawdown date format')
        }
        req.body.drawdownDate = value
      }
      return true
    }),

  body('maturityDate')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== null && value !== undefined) {
        const matDate = new Date(value)
        if (isNaN(matDate.getTime())) {
          throw new Error('Invalid maturity date format')
        }
        if (req.body.drawdownDate) {
          const drawDate = new Date(req.body.drawdownDate)
          if (!isNaN(drawDate.getTime()) && matDate < drawDate) {
            throw new Error('Maturity date cannot be before drawdown date')
          }
        }
        req.body.maturityDate = value
      }
      return true
    }),

  validate
]
