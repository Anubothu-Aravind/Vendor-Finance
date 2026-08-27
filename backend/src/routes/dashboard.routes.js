const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboard.controller')
const { authenticateJWT, requirePermission } = require('../middleware/auth.middleware')

router.use(authenticateJWT, requirePermission('dashboard'))

router.get('/summary', dashboardController.getSummary)
router.get('/alerts', dashboardController.getAlerts)

module.exports = router
