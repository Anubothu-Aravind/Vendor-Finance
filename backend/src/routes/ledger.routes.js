const express = require('express')
const router = express.Router()
const ledgerController = require('../controllers/ledger.controller')
const { authenticateJWT } = require('../middleware/auth.middleware')

router.use(authenticateJWT)

router.get('/', ledgerController.getLedger)
router.get('/vendor/:vendorId', ledgerController.getVendorStatement)
router.get('/financier/:financierId', ledgerController.getFinancierStatement)

module.exports = router
