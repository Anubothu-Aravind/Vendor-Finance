const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notification.controller')
const { authenticateJWT } = require('../middleware/auth.middleware')

// All notification routes require JWT authentication
router.use(authenticateJWT)

router.get('/', notificationController.getNotifications)
router.put('/read-all', notificationController.markAllAsRead)
router.put('/:id/read', notificationController.markAsRead)
router.delete('/:id', notificationController.deleteNotification)

module.exports = router
