const express = require('express')
const router = express.Router()
const settingsController = require('../controllers/settings.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateProfile } = require('../validators/settings.validator')

// Public routes for app initialization
router.get('/appearance', settingsController.getAppearance)
router.get('/ui-prefs', settingsController.getUiPrefs)

router.use(authenticateJWT)

// Multer memory storage configuration for temp hold
const multer = require('multer')
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
})

// Protected updates
router.put('/appearance', requireRole(['Admin']), settingsController.updateAppearance)
router.put('/ui-prefs', settingsController.updateUiPrefs)

router.get('/profile', settingsController.getProfile)
router.post('/profile', requireRole(['Admin']), validateProfile, settingsController.updateProfile)
router.post('/upload-logo', requireRole(['Admin']), upload.single('logo'), settingsController.uploadLogo)
router.post('/backup/restore', requireRole(['Admin']), upload.single('backup'), settingsController.restoreBackup)

module.exports = router
