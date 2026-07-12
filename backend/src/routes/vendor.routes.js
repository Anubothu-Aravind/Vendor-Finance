const express = require('express')
const router = express.Router()
const vendorController = require('../controllers/vendor.controller')
const { authenticateJWT, requireRole } = require('../middleware/auth.middleware')
const { validateVendor } = require('../validators/vendor.validator')

router.use(authenticateJWT)

router.route('/')
  .post(requireRole(['Admin']), validateVendor, vendorController.createVendor)
  .get(vendorController.getVendors)

router.route('/:id')
  .get(vendorController.getVendorById)
  .put(requireRole(['Admin']), validateVendor, vendorController.updateVendor)
  .delete(requireRole(['Admin']), vendorController.deleteVendor)

module.exports = router
