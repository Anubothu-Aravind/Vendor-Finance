const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')

router.post('/register', authenticateJWT, requireRole(['Admin']), authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authenticateJWT, authController.me)

// User Management Routes
router.get('/users', authenticateJWT, requireRole(['Admin']), authController.getUsers)
router.patch('/users/:id/role', authenticateJWT, requireRole(['Admin']), authController.updateUserRole)
router.delete('/users/:id', authenticateJWT, requireRole(['Admin']), authController.deleteUser)

module.exports = router
