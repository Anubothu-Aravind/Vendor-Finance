const Vendor = require('../models/Vendor')

exports.createVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, type, gstin, openingBalance, status, bankName, accountNo, ifsc, category } = req.body
    
    // Check if vendor already exists
    const existing = await Vendor.findOne({ name, isDeleted: false })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vendor name already exists' })
    }

    const vendor = new Vendor({ name, contactPerson, email, phone, address, type, gstin, openingBalance, status, bankName, accountNo, ifsc, category })
    await vendor.save()

    res.status(201).json({ success: true, data: vendor })
  } catch (error) {
    next(error)
  }
}

exports.getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ isDeleted: false }).sort({ name: 1 })
    res.status(200).json(vendors)
  } catch (error) {
    next(error)
  }
}

exports.getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, isDeleted: false })
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' })
    }
    res.status(200).json(vendor)
  } catch (error) {
    next(error)
  }
}

exports.updateVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, type, gstin, openingBalance, status, bankName, accountNo, ifsc, category } = req.body
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { name, contactPerson, email, phone, address, type, gstin, openingBalance, status, bankName, accountNo, ifsc, category },
      { new: true, runValidators: true }
    )

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' })
    }

    res.status(200).json({ success: true, data: vendor })
  } catch (error) {
    next(error)
  }
}

exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id)

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' })
    }

    res.status(200).json({ success: true, message: 'Vendor deleted successfully from database' })
  } catch (error) {
    next(error)
  }
}
