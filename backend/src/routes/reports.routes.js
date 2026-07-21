const express = require('express')
const router = express.Router()
const reportsController = require('../controllers/reports.controller')
const { authenticateJWT } = require('../middleware/auth.middleware')

router.use(authenticateJWT)

router.get('/interest-statements', reportsController.getInterestStatements)
router.get('/monthly-interest-statement', reportsController.getInterestStatements)

router.get('/outstanding-summary', reportsController.getOutstandingSummary)
router.get('/outstanding', reportsController.getOutstandingSummary)

module.exports = router
