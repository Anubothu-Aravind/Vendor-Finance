const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboard.controller')
const { authenticateJWT } = require('../middleware/auth.middleware')

router.use(authenticateJWT)

router.get('/summary', dashboardController.getSummary)
router.get('/alerts', dashboardController.getAlerts)

module.exports = router
