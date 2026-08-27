const express = require('express')
const router = express.Router()
const reportsController = require('../controllers/reports.controller')
const { authenticateJWT, requirePermission } = require('../middleware/auth.middleware')

router.use(authenticateJWT, requirePermission(['reports', 'outstanding']))

router.get('/interest-statements', reportsController.getInterestStatements)
router.get('/monthly-interest-statement', reportsController.getInterestStatements)

router.get('/outstanding-summary', reportsController.getOutstandingSummary)
router.get('/outstanding', reportsController.getOutstandingSummary)

module.exports = router
