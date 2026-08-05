const express = require('express')
const router = express.Router()
const loanController = require('../controllers/loan.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateLoan } = require('../validators/loan.validator')
const { validateRepayment } = require('../validators/repayment.validator')

router.use(authenticateJWT)

router.route('/')
  .post(requireRole(['Admin']), validateLoan, loanController.createLoan)
  .get(loanController.getLoans)

router.get('/repayments', loanController.getAllRepayments)
router.get('/repayments/all', loanController.getAllRepayments)
router.get('/repayments/:id', loanController.getRepaymentById)

router.route('/:id')
  .get(loanController.getLoanById)
  .put(requireRole(['Admin']), validateLoan, loanController.updateLoan)
  .delete(requireRole(['Admin']), loanController.deleteLoan)

router.route('/:id/repayments')
  .post(requireRole(['Admin']), validateRepayment, loanController.createRepayment)

router.delete('/:id/repayments/:repaymentId', requireRole(['Admin']), loanController.deleteRepayment)

module.exports = router
