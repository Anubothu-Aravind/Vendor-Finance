const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const settingsController = require('../controllers/settings.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateProfile } = require('../validators/settings.validator')
const audit = require('../middleware/audit.middleware')

const logoUploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many logo uploads. Try again in 1 minute.' } }
})

const profileSaveLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many profile updates. Slow down.' } }
})

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
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      const err = new Error('Only image/jpeg, image/png, and image/webp files are allowed')
      err.status = 400
      cb(err)
    }
  }
})

const handleLogoUpload = (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size exceeds 2MB limit' })
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' })
    }
    next()
  })
}

// Multer storage configuration for Excel and JSON backup files
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for database backups
  },
  fileFilter: (req, file, cb) => {
    cb(null, true)
  }
})

// Protected updates
router.put('/appearance', requireRole(['Admin']), settingsController.updateAppearance)
router.put('/ui-prefs', settingsController.updateUiPrefs)

router.get('/profile', settingsController.getProfile)
router.post('/profile', requireRole(['Admin']), profileSaveLimiter, validateProfile, audit('profile'), settingsController.updateProfile)
router.post('/upload-logo', requireRole(['Admin']), logoUploadLimiter, handleLogoUpload, audit('logo'), settingsController.uploadLogo)
router.post('/backup/restore', requireRole(['Admin']), excelUpload.single('backup'), settingsController.restoreBackup)

router.get('/invoice-template', settingsController.getInvoiceTemplate)
router.put('/invoice-template', requireRole(['Admin']), settingsController.saveInvoiceTemplate)

module.exports = router
