const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')

const audit = require('../middleware/audit.middleware')

router.post('/register', authenticateJWT, requireRole(['Admin']), authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authenticateJWT, authController.me)

// User Management Routes
router.get('/users', authenticateJWT, requireRole(['Admin']), authController.getUsers)
router.patch('/users/:id/role', authenticateJWT, requireRole(['Admin']), authController.updateUserRole)
router.put('/users/:id/permissions', authenticateJWT, requireRole(['Admin']), audit('user_permissions_update'), authController.updateUserPermissions)
router.patch('/users/:id/permissions', authenticateJWT, requireRole(['Admin']), audit('user_permissions_update'), authController.updateUserPermissions)
router.put('/users/:id/password', authenticateJWT, requireRole(['Admin']), audit('user_password_reset'), authController.resetUserPassword)
router.patch('/users/:id/password', authenticateJWT, requireRole(['Admin']), audit('user_password_reset'), authController.resetUserPassword)
router.delete('/users/:id', authenticateJWT, requireRole(['Admin']), authController.deleteUser)

module.exports = router
