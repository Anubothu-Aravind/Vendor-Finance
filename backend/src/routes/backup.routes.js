const express = require('express')
const router = express.Router()
const multer = require('multer')
const backupController = require('../controllers/backup.controller')
const settingsController = require('../controllers/settings.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    cb(null, true)
  }
})

router.use(authenticateJWT)

router.get('/export/json', backupController.exportJson)
router.get('/export/csv', backupController.exportCsv)
router.post('/import', requireRole(['Admin']), backupController.importJson)
router.post('/reset', requireRole(['Admin']), backupController.resetData)
router.post('/backup/restore', requireRole(['Admin']), excelUpload.single('backup'), settingsController.restoreBackup)
router.post('/restore', requireRole(['Admin']), excelUpload.single('backup'), settingsController.restoreBackup)

module.exports = router
