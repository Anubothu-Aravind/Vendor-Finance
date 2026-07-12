const express = require('express')
const router = express.Router()
const reportsController = require('../controllers/reports.controller')
const { authenticateJWT } = require('../middleware/auth.middleware')

router.use(authenticateJWT)

router.get('/interest-statements', (req, res) => {
  res.status(200).json({ success: true, message: 'Ready to generate interest statements' })
})

router.get('/outstanding-summary', reportsController.getOutstandingSummary)
router.get('/outstanding', reportsController.getOutstandingSummary)

module.exports = router
