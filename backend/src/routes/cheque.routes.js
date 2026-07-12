const express = require('express')
const router = express.Router()
const chequeController = require('../controllers/cheque.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateCheque } = require('../validators/cheque.validator')

router.use(authenticateJWT)

router.route('/')
  .post(requireRole(['Admin']), validateCheque, chequeController.createCheque)
  .get(chequeController.getCheques)

router.patch('/:id/status', requireRole(['Admin']), chequeController.updateChequeStatus)
router.delete('/:id', requireRole(['Admin']), chequeController.deleteCheque)

module.exports = router
