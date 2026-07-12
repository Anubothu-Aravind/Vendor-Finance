const express = require('express')
const router = express.Router()
const financierController = require('../controllers/financier.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateFinancier } = require('../validators/financier.validator')

router.use(authenticateJWT)

router.route('/')
  .post(requireRole(['Admin']), validateFinancier, financierController.createFinancier)
  .get(financierController.getFinanciers)

router.route('/:id')
  .get(financierController.getFinancierById)
  .put(requireRole(['Admin']), validateFinancier, financierController.updateFinancier)
  .delete(requireRole(['Admin']), financierController.deleteFinancier)

module.exports = router
