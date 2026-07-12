const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/payment.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validatePayment } = require('../validators/payment.validator')

router.use(authenticateJWT)

router.route('/')
  .post(requireRole(['Admin']), validatePayment, paymentController.createPayment)
  .get(paymentController.getPayments)

router.route('/:id')
  .delete(requireRole(['Admin']), paymentController.deletePayment)

module.exports = router
