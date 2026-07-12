const express = require('express')
const router = express.Router()
const backupController = require('../controllers/backup.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')

router.use(authenticateJWT)

router.get('/export/json', backupController.exportJson)
router.get('/export/csv', backupController.exportCsv)
router.post('/import', requireRole(['Admin']), backupController.importJson)
router.post('/reset', requireRole(['Admin']), backupController.resetData)

module.exports = router
