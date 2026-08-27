const express = require('express')
const router = express.Router()
const ledgerController = require('../controllers/ledger.controller')
const { authenticateJWT, requirePermission } = require('../middleware/auth.middleware')

router.use(authenticateJWT, requirePermission(['ledger', 'outstanding', 'transactions', 'reports']))

router.get('/', ledgerController.getLedger)
router.get('/vendor/:vendorId', ledgerController.getVendorStatement)
router.get('/financier/:financierId', ledgerController.getFinancierStatement)

module.exports = router
