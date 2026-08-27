const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/payment.controller')
const { authenticateJWT, requireRole, requirePermission } = require('../middleware/auth.middleware')
const { validatePayment } = require('../validators/payment.validator')

router.use(authenticateJWT, requirePermission('vendor_payments'))

router.route('/')
  .post(requireRole(['Admin']), validatePayment, paymentController.createPayment)
  .get(paymentController.getPayments)

router.route('/:id')
  .get(paymentController.getPaymentById)
  .put(requireRole(['Admin']), validatePayment, paymentController.updatePayment)
  .delete(requireRole(['Admin']), paymentController.deletePayment)

module.exports = router
