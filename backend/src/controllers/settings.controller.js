const Settings = require('../models/Settings')

exports.getProfile = async (req, res, next) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings()
      await settings.save()
    }
    res.status(200).json({ success: true, data: settings })
  } catch (error) {
    next(error)
  }
}

exports.updateProfile = async (req, res, next) => {
  try {
    let { businessName, ownerName, email, phone, address, gstin, website, logo, banks, paymentModes, usersList } = req.body

    // Safely parse arrays — they may arrive as JSON strings
    if (typeof paymentModes === 'string') {
      try { paymentModes = JSON.parse(paymentModes) } catch { paymentModes = undefined }
    }
    if (typeof usersList === 'string') {
      try { usersList = JSON.parse(usersList) } catch { usersList = undefined }
    }
    if (typeof banks === 'string') {
      try { banks = JSON.parse(banks) } catch { banks = undefined }
    }

    // Build $set payload — only include fields that are present in the request
    const $set = {}
    if (businessName !== undefined) $set.businessName = businessName
    if (ownerName    !== undefined) $set.ownerName    = ownerName
    if (email        !== undefined) $set.email        = email
    if (phone        !== undefined) $set.phone        = phone
    if (address      !== undefined) $set.address      = address
    if (gstin        !== undefined) $set.gstin        = gstin
    if (website      !== undefined) $set.website      = website
    if (logo         !== undefined) $set.logo         = logo

    // Strip _id from subdocuments before saving (prevents Mongoose cast errors)
    if (Array.isArray(banks)) {
      $set.banks = banks
    }
    if (Array.isArray(paymentModes)) {
      $set.paymentModes = paymentModes.map(({ name, enabled }) => ({ name, enabled }))
    }
    if (Array.isArray(usersList)) {
      $set.usersList = usersList.map(({ name, email: e, role, status }) => ({ name, email: e, role, status }))
    }

    // Use findOneAndUpdate with $set — avoids re-validating the entire document
    // and prevents cast errors on untouched subdocument arrays
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set },
      { new: true, upsert: true, runValidators: false }
    )

    res.status(200).json({ success: true, data: settings })
  } catch (error) {
    console.error('[updateProfile] Error:', error.message)
    next(error)
  }
}


exports.getAppearance = async (req, res, next) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }
    res.status(200).json({
      success: true,
      theme: settings.theme,
      gradientValue: settings.gradientValue,
      accentColor: settings.accentColor,
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      numberFormat: settings.numberFormat
    })
  } catch (error) {
    next(error)
  }
}

exports.updateAppearance = async (req, res, next) => {
  try {
    const { theme, gradientValue, accentColor, currency, dateFormat, numberFormat } = req.body
    const $set = {}
    if (theme        !== undefined) $set.theme        = theme
    if (gradientValue !== undefined) $set.gradientValue = gradientValue
    if (accentColor  !== undefined) $set.accentColor  = accentColor
    if (currency     !== undefined) $set.currency     = currency
    if (dateFormat   !== undefined) $set.dateFormat   = dateFormat
    if (numberFormat !== undefined) $set.numberFormat = numberFormat

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set },
      { new: true, upsert: true, runValidators: false }
    )
    res.status(200).json({
      success: true,
      theme: settings.theme,
      gradientValue: settings.gradientValue,
      accentColor: settings.accentColor,
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      numberFormat: settings.numberFormat
    })
  } catch (error) {
    next(error)
  }
}

exports.getUiPrefs = async (req, res, next) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }
    res.status(200).json({
      success: true,
      sidebarCollapsed: settings.sidebarCollapsed
    })
  } catch (error) {
    next(error)
  }
}

exports.updateUiPrefs = async (req, res, next) => {
  try {
    const { sidebarCollapsed } = req.body
    const $set = {}
    if (sidebarCollapsed !== undefined) $set.sidebarCollapsed = sidebarCollapsed

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set },
      { new: true, upsert: true, runValidators: false }
    )
    res.status(200).json({
      success: true,
      sidebarCollapsed: settings.sidebarCollapsed
    })
  } catch (error) {
    next(error)
  }
}

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sharp = require('sharp')

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const { buffer, originalname } = req.file

    // 1. Validate file extension whitelisting
    const ext = path.extname(originalname).toLowerCase()
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return res.status(400).json({ success: false, message: 'Only .jpg, .jpeg, and .png files are allowed' })
    }

    // 2. Validate magic numbers (file contents verification)
    const headerHex = buffer.slice(0, 8).toString('hex').toUpperCase()
    let isValidImage = false
    
    // PNG Check: 89504E470D0A1A0A
    if (headerHex.startsWith('89504E470D0A1A0A')) {
      isValidImage = true
    }
    // JPEG Check: FFD8FF
    else if (headerHex.startsWith('FFD8FF')) {
      isValidImage = true
    }

    if (!isValidImage) {
      return res.status(400).json({ success: false, message: 'Invalid file format. File contents do not match extension.' })
    }

    // 3. Rename uploaded files using random hashed names and path traversal protection
    const hash = crypto.randomBytes(16).toString('hex')
    const safeBaseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '')
    const finalFilename = `${hash}_${safeBaseName}${ext}`
    
    // Check and create target directory
    const targetDir = path.join(__dirname, '../../upload/user')
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const finalFilePath = path.join(targetDir, finalFilename)

    // 4. Process image using sharp: strip EXIF metadata and re-encode to clean payload
    let imageProcessor = sharp(buffer)
    
    if (ext === '.png') {
      await imageProcessor.png({ compressionLevel: 8 }).toFile(finalFilePath)
    } else {
      await imageProcessor.jpeg({ quality: 85 }).toFile(finalFilePath)
    }

    // 5. Construct public URL to serve static content
    const fileUrl = `/uploads/user/${finalFilename}`

    res.status(200).json({ success: true, url: fileUrl })
  } catch (error) {
    next(error)
  }
}

exports.restoreBackup = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const { mimetype, originalname } = req.file
    const ext = path.extname(originalname).toLowerCase()
    const validExtensions = ['.xlsx', '.xls']
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ]

    const isExtensionValid = validExtensions.includes(ext)
    const isMimetypeValid = validMimeTypes.includes(mimetype)

    if (!isExtensionValid && !isMimetypeValid) {
      return res.status(400).json({ success: false, message: 'Only Excel files (.xlsx, .xls) are accepted' })
    }

    const payload = req.body.data
    if (!payload) {
      return res.status(400).json({ success: false, message: 'No backup data payload provided' })
    }

    const data = JSON.parse(payload)

    const Vendor = require('../models/Vendor')
    const Financier = require('../models/Financier')
    const Loan = require('../models/Loan')
    const Bill = require('../models/Bill')
    const Payment = require('../models/Payment')
    const Repayment = require('../models/Repayment')
    const Cheque = require('../models/Cheque')
    const Transaction = require('../models/Transaction')

    // Drop all collections
    await Settings.deleteMany()
    await Vendor.deleteMany()
    await Financier.deleteMany()
    await Loan.deleteMany()
    await Bill.deleteMany()
    await Payment.deleteMany()
    await Repayment.deleteMany()
    await Cheque.deleteMany()
    await Transaction.deleteMany()

    // Restore Settings
    if (data.settings && Object.keys(data.settings).length > 0) {
      const sData = { ...data.settings }
      
      // Parse arrays if they are stringified JSON strings
      if (typeof sData.paymentModes === 'string') {
        try { sData.paymentModes = JSON.parse(sData.paymentModes) } catch {}
      }
      if (typeof sData.usersList === 'string') {
        try { sData.usersList = JSON.parse(sData.usersList) } catch {}
      }
      if (typeof sData.banks === 'string') {
        try { sData.banks = JSON.parse(sData.banks) } catch {}
      }

      // Strip _id from subdocuments to prevent casting error
      if (Array.isArray(sData.paymentModes)) {
        sData.paymentModes = sData.paymentModes.map(({ name, enabled }) => ({ name, enabled }))
      }
      if (Array.isArray(sData.usersList)) {
        sData.usersList = sData.usersList.map(({ name, email: e, role, status }) => ({ name, email: e, role, status }))
      }

      const s = new Settings(sData)
      await s.save()
    } else {
      const s = new Settings()
      await s.save()
    }

    const cleanObj = (obj) => {
      if (!obj || typeof obj !== 'object') return obj
      const cleaned = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          let val = obj[key]
          if (val === '' || val === '—' || val === 'null' || val === 'undefined') {
            val = null
          }
          cleaned[key] = val
        }
      }
      return cleaned
    }

    const cleanArray = (arr) => (arr || []).map(cleanObj)

    // Restore arrays
    if (data.vendors && data.vendors.length > 0) {
      await Vendor.insertMany(cleanArray(data.vendors))
    }
    if (data.financiers && data.financiers.length > 0) {
      await Financier.insertMany(cleanArray(data.financiers))
    }
    if (data.loans && data.loans.length > 0) {
      await Loan.insertMany(cleanArray(data.loans))
    }
    if (data.bills && data.bills.length > 0) {
      await Bill.insertMany(cleanArray(data.bills))
    }
    if (data.payments && data.payments.length > 0) {
      let paymentsData = cleanArray(data.payments)
      paymentsData = paymentsData.map(p => {
        if (typeof p.allocations === 'string') {
          try { p.allocations = JSON.parse(p.allocations) } catch { p.allocations = [] }
        }
        return p
      })
      await Payment.insertMany(paymentsData)
    }
    if (data.repayments && data.repayments.length > 0) {
      await Repayment.insertMany(cleanArray(data.repayments))
    }
    if (data.cheques && data.cheques.length > 0) {
      await Cheque.insertMany(cleanArray(data.cheques))
    }
    if (data.transactions && data.transactions.length > 0) {
      await Transaction.insertMany(cleanArray(data.transactions))
    }

    res.status(200).json({ success: true, message: 'Data restored successfully' })
  } catch (error) {
    next(error)
  }
}
