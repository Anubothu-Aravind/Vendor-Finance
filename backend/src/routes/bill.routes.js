const express = require('express')
const router = express.Router()
const billController = require('../controllers/bill.controller')
const { authenticateJWT, requireRole, requirePermission } = require('../middleware/auth.middleware')
const { validateBill } = require('../validators/bill.validator')

router.use(authenticateJWT, requirePermission('purchase_bills'))

router.route('/')
  .post(requireRole(['Admin']), validateBill, billController.createBill)
  .get(billController.getBills)

router.route('/:id')
  .get(billController.getBillById)
  .put(requireRole(['Admin']), validateBill, billController.updateBill)
  .delete(requireRole(['Admin']), billController.deleteBill)

module.exports = router
