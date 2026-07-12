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
    const { businessName, ownerName, email, phone, address, gstin, website, logo, banks, paymentModes, usersList } = req.body

    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }

    if (businessName !== undefined) settings.businessName = businessName
    if (ownerName !== undefined) settings.ownerName = ownerName
    if (email !== undefined) settings.email = email
    if (phone !== undefined) settings.phone = phone
    if (address !== undefined) settings.address = address
    if (gstin !== undefined) settings.gstin = gstin
    if (website !== undefined) settings.website = website
    if (logo !== undefined) settings.logo = logo
    if (banks !== undefined) settings.banks = banks
    if (paymentModes !== undefined) settings.paymentModes = paymentModes
    if (usersList !== undefined) settings.usersList = usersList

    await settings.save()
    res.status(200).json({ success: true, data: settings })
  } catch (error) {
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
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }
    if (theme !== undefined) settings.theme = theme
    if (gradientValue !== undefined) settings.gradientValue = gradientValue
    if (accentColor !== undefined) settings.accentColor = accentColor
    if (currency !== undefined) settings.currency = currency
    if (dateFormat !== undefined) settings.dateFormat = dateFormat
    if (numberFormat !== undefined) settings.numberFormat = numberFormat

    await settings.save()
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
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }
    if (sidebarCollapsed !== undefined) settings.sidebarCollapsed = sidebarCollapsed

    await settings.save()
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
