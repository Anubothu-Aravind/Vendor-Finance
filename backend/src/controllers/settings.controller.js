const Settings = require('../models/Settings')
const COMPLETION_RULES = require('../config/profileCompletionRules')
const jobQueue = require('../utils/jobQueue')

/**
 * Compute a profile completion score from a Settings document.
 * Weights and field lists are driven by profileCompletionRules.js — not hardcoded here.
 *
 * @param {object} settings  Mongoose Settings document (or plain object)
 * @returns {{ score: number, missing: string[] }}
 */
function computeCompletion(settings) {
  const { requiredWeight, optionalWeight, requiredFields, optionalFields } = COMPLETION_RULES
  const missing = []
  let requiredFilled = 0
  let optionalFilled = 0

  for (const field of requiredFields) {
    const val = settings[field]
    if (val && String(val).trim()) {
      requiredFilled++
    } else {
      missing.push(field)
    }
  }

  for (const field of optionalFields) {
    const val = settings[field]
    if (val && String(val).trim()) optionalFilled++
  }

  const score = Math.round(
    (requiredFilled / requiredFields.length) * requiredWeight +
    (optionalFilled / optionalFields.length) * optionalWeight
  )

  return { score, missing }
}

const User = require('../models/User')

exports.getProfile = async (req, res, next) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }

    let needsSave = false
    if (!settings.paymentModes || settings.paymentModes.length === 0) {
      settings.paymentModes = [
        { name: 'Bank Transfer', enabled: true },
        { name: 'Cheque', enabled: true },
        { name: 'Cash', enabled: true },
        { name: 'UPI', enabled: true },
        { name: 'NEFT / RTGS', enabled: true }
      ]
      needsSave = true
    }

    if (!settings.banks || settings.banks.length === 0) {
      settings.banks = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'PNB', 'Kotak Bank']
      needsSave = true
    }

    if (needsSave) {
      await settings.save()
    }

    const dbUsers = await User.find().select('-passwordHash')
    const formattedUsers = dbUsers.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status
    }))

    const settingsObj = settings.toObject()
    settingsObj.usersList = formattedUsers

    res.status(200).json({
      success: true,
      data: settingsObj,
      completion: computeCompletion(settings),
    })
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

    // Capture old logo URL before the update so we can queue its deletion
    const existing = await Settings.findOne().select('logo').lean()
    const oldLogoUrl = existing?.logo || ''

    // Use findOneAndUpdate with $set — avoids re-validating the entire document
    // and prevents cast errors on untouched subdocument arrays
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set },
      { new: true, upsert: true, runValidators: false }
    )

    // If the logo changed and there was a previous file, queue it for deletion.
    // Deletion happens AFTER the DB write succeeds — old file is never removed
    // if the save fails.
    if (logo !== undefined && oldLogoUrl && oldLogoUrl !== logo) {
      jobQueue.enqueueDeleteLogo({ logoUrl: oldLogoUrl })
    }

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

    const { buffer, originalname, mimetype, size } = req.file

    // 1. Validate max file size: 2MB — reject with 400 if exceeded
    if (size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File size exceeds 2MB limit' })
    }

    // 2. Validate allowed mime types: image/jpeg, image/png, image/webp only
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(mimetype)) {
      return res.status(400).json({ success: false, message: 'Only image/jpeg, image/png, and image/webp files are allowed' })
    }

    // Determine extension from mimetype or extension
    const extMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp'
    }
    let ext = path.extname(originalname).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      ext = extMap[mimetype] || '.png'
    }
    if (ext === '.jpeg') ext = '.jpg'

    // 3. Validate magic numbers (file contents verification)
    const headerHex = buffer.slice(0, 12).toString('hex').toUpperCase()
    let isValidImage = false
    
    // PNG Check: 89504E470D0A1A0A
    if (headerHex.startsWith('89504E470D0A1A0A')) {
      isValidImage = true
    }
    // JPEG Check: FFD8FF
    else if (headerHex.startsWith('FFD8FF')) {
      isValidImage = true
    }
    // WEBP Check: RIFF (52494646) ... WEBP (57454250)
    else if (headerHex.startsWith('52494646') && headerHex.includes('57454250')) {
      isValidImage = true
    }

    if (!isValidImage) {
      return res.status(400).json({ success: false, message: 'Invalid file format. File contents do not match extension.' })
    }

    // 4. Strip original filename completely and generate a safe random filename
    const hash = crypto.randomBytes(16).toString('hex')
    const finalFilename = `logo_${Date.now()}_${hash}${ext}`
    
    // Check and create target directory
    const targetDir = path.join(__dirname, '../../upload/user')
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const finalFilePath = path.join(targetDir, finalFilename)

    // 5. Process image using sharp: strip EXIF metadata and re-encode to clean payload
    let imageProcessor = sharp(buffer)
    
    if (ext === '.png') {
      await imageProcessor.png({ compressionLevel: 8 }).toFile(finalFilePath)
    } else if (ext === '.webp') {
      await imageProcessor.webp({ quality: 85 }).toFile(finalFilePath)
    } else {
      await imageProcessor.jpeg({ quality: 85 }).toFile(finalFilePath)
    }

    // 6. Construct public URL to serve static content
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
          if (val === '' || val === '—' || val === '-' || val === 'null' || val === 'undefined' || val === 'N/A') {
            val = null
          }
          cleaned[key] = val
        }
      }
      return cleaned
    }

    const cleanArray = (arr) => (arr || []).map(cleanObj)

    // Restore Vendors
    if (data.vendors && data.vendors.length > 0) {
      const vendorDocs = cleanArray(data.vendors).map(v => ({
        ...v,
        name: String(v.name || 'Vendor').trim(),
        type: v.type === 'smallVendor' ? 'smallVendor' : 'largeVendor',
        status: v.status === 'Inactive' ? 'Inactive' : 'Active',
        openingBalance: Number(v.openingBalance) || 0,
        isDeleted: Boolean(v.isDeleted)
      }))
      for (const v of vendorDocs) {
        if (v._id && mongoose.Types.ObjectId.isValid(v._id)) {
          await Vendor.findByIdAndUpdate(v._id, v, { upsert: true, new: true })
        } else {
          await Vendor.findOneAndUpdate({ name: v.name }, v, { upsert: true, new: true })
        }
      }
    }

    // Restore Financiers
    if (data.financiers && data.financiers.length > 0) {
      const finDocs = cleanArray(data.financiers).map(f => ({
        ...f,
        name: String(f.name || 'Financier').trim(),
        status: f.status === 'Inactive' ? 'Inactive' : 'Active',
        defaultInterestRate: Number(f.defaultInterestRate) || 12,
        outstandingBalance: Number(f.outstandingBalance) || 0,
        isDeleted: Boolean(f.isDeleted)
      }))
      for (const f of finDocs) {
        if (f._id && mongoose.Types.ObjectId.isValid(f._id)) {
          await Financier.findByIdAndUpdate(f._id, f, { upsert: true, new: true })
        } else {
          await Financier.findOneAndUpdate({ name: f.name }, f, { upsert: true, new: true })
        }
      }
    }

    // Restore Loans
    if (data.loans && data.loans.length > 0) {
      const rawLoans = cleanArray(data.loans)
      const loanDocs = []

      for (const l of rawLoans) {
        if (!l.loanReference) continue

        let finDoc = null
        if (l.financierId && mongoose.Types.ObjectId.isValid(l.financierId)) {
          finDoc = await Financier.findById(l.financierId)
        }
        if (!finDoc) {
          const finName = String(l.financierName || l.borrowerName || l.financier || l.partyName || (l.financierId && !mongoose.Types.ObjectId.isValid(l.financierId) ? l.financierId : '') || 'Primary Financier').trim()
          finDoc = await Financier.findOne({ name: finName })
          if (!finDoc) {
            finDoc = new Financier({
              name: finName,
              phone: l.phone || '',
              status: 'Active',
              defaultInterestRate: (l.interestRate !== null && l.interestRate !== undefined && !isNaN(l.interestRate)) ? Number(l.interestRate) : 12,
              outstandingBalance: 0,
              isDeleted: false
            })
            await finDoc.save()
          }
        }

        const principalAmount = Number(l.principalAmount) || 0
        const rate = (l.interestRate !== null && l.interestRate !== undefined && l.interestRate !== '' && !isNaN(l.interestRate)) ? Number(l.interestRate) : null
        const dDate = l.drawdownDate ? new Date(l.drawdownDate) : null
        const mDate = l.maturityDate ? new Date(l.maturityDate) : null

        let status = 'ACTIVE'
        if (l.status) {
          const s = String(l.status).toUpperCase()
          if (s === 'CLOSED' || s === 'SETTLED') status = 'SETTLED'
          else if (s === 'OVERDUE') status = 'OVERDUE'
          else status = 'ACTIVE'
        }

        loanDocs.push({
          loanReference: String(l.loanReference).trim(),
          financierId: finDoc._id,
          principalAmount: principalAmount,
          interestRate: rate,
          paidPrincipal: Number(l.paidPrincipal) || 0,
          paidInterest: Number(l.paidInterest) || 0,
          accruedInterest: Number(l.accruedInterest) || 0,
          outstandingPrincipal: Number(l.outstandingPrincipal ?? principalAmount) || 0,
          drawdownDate: dDate && !isNaN(dDate.getTime()) ? dDate : null,
          maturityDate: mDate && !isNaN(mDate.getTime()) ? mDate : null,
          status: status,
          notes: l.notes || l.remarks || '',
          isDeleted: Boolean(l.isDeleted)
        })
      }

      for (const loanItem of loanDocs) {
        await Loan.findOneAndUpdate(
          { loanReference: loanItem.loanReference },
          loanItem,
          { upsert: true, new: true }
        )
      }
    }

    // Restore Bills
    if (data.bills && data.bills.length > 0) {
      const rawBills = cleanArray(data.bills)
      const billDocs = []

      for (const b of rawBills) {
        if (!b.billNumber) continue

        let venDoc = null
        if (b.vendorId && mongoose.Types.ObjectId.isValid(b.vendorId)) {
          venDoc = await Vendor.findById(b.vendorId)
        }
        if (!venDoc) {
          const venName = String(b.vendorName || b.vendor || b.partyName || (b.vendorId && !mongoose.Types.ObjectId.isValid(b.vendorId) ? b.vendorId : '') || 'Primary Vendor').trim()
          venDoc = await Vendor.findOne({ name: venName })
          if (!venDoc) {
            venDoc = new Vendor({
              name: venName,
              type: 'largeVendor',
              status: 'Active',
              openingBalance: 0,
              isDeleted: false
            })
            await venDoc.save()
          }
        }

        const amount = Number(b.amount) || 0
        const bDate = b.billDate ? new Date(b.billDate) : new Date()
        const dDate = b.dueDate ? new Date(b.dueDate) : bDate

        let status = 'UNPAID'
        if (b.status) {
          const s = String(b.status).toUpperCase()
          if (s.includes('PARTIAL')) status = 'PARTIALLY_PAID'
          else if (s === 'PAID') status = 'PAID'
          else status = 'UNPAID'
        }

        billDocs.push({
          billNumber: String(b.billNumber).trim(),
          vendorId: venDoc._id,
          paymentType: b.paymentType || 'Credit',
          amount: amount,
          paidAmount: Number(b.paidAmount) || 0,
          outstandingAmount: Number(b.outstandingAmount ?? amount) || 0,
          billDate: bDate && !isNaN(bDate.getTime()) ? bDate : new Date(),
          dueDate: dDate && !isNaN(dDate.getTime()) ? dDate : new Date(),
          status: status,
          remarks: b.remarks || b.notes || '',
          isDeleted: Boolean(b.isDeleted)
        })
      }

      for (const billItem of billDocs) {
        await Bill.findOneAndUpdate(
          { billNumber: billItem.billNumber },
          billItem,
          { upsert: true, new: true }
        )
      }
    }

    // Restore Payments
    if (data.payments && data.payments.length > 0) {
      const rawPayments = cleanArray(data.payments)
      for (const p of rawPayments) {
        if (!p.amount || Number(p.amount) <= 0) continue

        let venDoc = null
        if (p.vendorId && mongoose.Types.ObjectId.isValid(p.vendorId)) {
          venDoc = await Vendor.findById(p.vendorId)
        }
        if (!venDoc) {
          const venName = String(p.vendorName || p.vendor || p.partyName || (p.vendorId && !mongoose.Types.ObjectId.isValid(p.vendorId) ? p.vendorId : '') || 'Primary Vendor').trim()
          venDoc = await Vendor.findOne({ name: venName })
          if (!venDoc) {
            venDoc = new Vendor({
              name: venName,
              type: 'largeVendor',
              status: 'Active',
              openingBalance: 0,
              isDeleted: false
            })
            await venDoc.save()
          }
        }

        let mode = 'BANK_TRANSFER'
        if (p.paymentMode) {
          const m = String(p.paymentMode).toUpperCase()
          if (m.includes('CHEQUE') || m.includes('CHECK')) mode = 'CHEQUE'
          else if (m.includes('CASH')) mode = 'CASH'
          else if (m.includes('OTHER')) mode = 'OTHER'
          else mode = 'BANK_TRANSFER'
        }

        let allocations = p.allocations
        if (typeof allocations === 'string') {
          try { allocations = JSON.parse(allocations) } catch { allocations = [] }
        }
        if (!Array.isArray(allocations)) allocations = []

        const pDate = p.paymentDate ? new Date(p.paymentDate) : new Date()
        const refNum = String(p.referenceNumber || p.ref || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim()

        const payDoc = {
          vendorId: venDoc._id,
          amount: Number(p.amount) || 0,
          paymentDate: pDate && !isNaN(pDate.getTime()) ? pDate : new Date(),
          paymentMode: mode,
          referenceNumber: refNum,
          allocations: allocations,
          isDeleted: Boolean(p.isDeleted)
        }

        await Payment.findOneAndUpdate(
          { referenceNumber: payDoc.referenceNumber },
          payDoc,
          { upsert: true, new: true }
        )
      }
    }

    // Restore Repayments
    if (data.repayments && data.repayments.length > 0) {
      const rawRepayments = cleanArray(data.repayments)
      for (const r of rawRepayments) {
        if (!r.amount || Number(r.amount) <= 0) continue

        let loanDoc = null
        if (r.loanId && mongoose.Types.ObjectId.isValid(r.loanId)) {
          loanDoc = await Loan.findById(r.loanId)
        }
        if (!loanDoc) {
          const loanRef = String(r.loanReference || r.loanId || r.loan || 'LN001').trim()
          loanDoc = await Loan.findOne({ loanReference: loanRef })
          if (!loanDoc) {
            // Find or create primary financier for loan
            let fin = await Financier.findOne()
            if (!fin) {
              fin = new Financier({ name: 'Primary Financier', defaultInterestRate: 12, status: 'Active' })
              await fin.save()
            }
            loanDoc = new Loan({
              loanReference: loanRef,
              financierId: fin._id,
              principalAmount: Number(r.amount) || 10000,
              outstandingPrincipal: Number(r.amount) || 10000,
              status: 'ACTIVE'
            })
            await loanDoc.save()
          }
        }

        let mode = 'BANK_TRANSFER'
        if (r.repaymentMode) {
          const m = String(r.repaymentMode).toUpperCase()
          if (m.includes('CHEQUE') || m.includes('CHECK')) mode = 'CHEQUE'
          else if (m.includes('CASH')) mode = 'CASH'
          else if (m.includes('OTHER')) mode = 'OTHER'
          else mode = 'BANK_TRANSFER'
        }

        const rDate = r.repaymentDate ? new Date(r.repaymentDate) : new Date()
        const refNum = String(r.referenceNumber || r.ref || `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim()

        const repDoc = {
          loanId: loanDoc._id,
          amount: Number(r.amount) || 0,
          principalPaid: Number(r.principalPaid ?? r.amount) || 0,
          interestPaid: Number(r.interestPaid) || 0,
          repaymentDate: rDate && !isNaN(rDate.getTime()) ? rDate : new Date(),
          repaymentMode: mode,
          referenceNumber: refNum,
          isDeleted: Boolean(r.isDeleted)
        }

        await Repayment.findOneAndUpdate(
          { referenceNumber: repDoc.referenceNumber },
          repDoc,
          { upsert: true, new: true }
        )
      }
    }

    // Restore Cheques
    if (data.cheques && data.cheques.length > 0) {
      const rawCheques = cleanArray(data.cheques)
      for (const c of rawCheques) {
        let chqNum = String(c.chequeNumber || c.chequeNo || '').replace(/\D/g, '')
        if (chqNum.length > 0) {
          chqNum = chqNum.padStart(6, '0').slice(-6)
        }
        if (!chqNum) continue

        let type = 'ISSUED_VENDOR'
        if (c.type) {
          const t = String(c.type).toUpperCase()
          if (t.includes('REC') || t.includes('INCOMING')) type = 'RECEIVED_FINANCIER'
          else if (t.includes('FINANCIER')) type = 'ISSUED_FINANCIER'
          else if (t.includes('VENDOR')) type = 'ISSUED_VENDOR'
          else type = 'OTHER'
        }

        let status = 'PENDING'
        if (c.status) {
          const s = String(c.status).toUpperCase()
          if (s.includes('CLEAR') || s === 'PAID') status = 'CLEARED'
          else if (s.includes('BOUNCE') || s.includes('DISHONOR')) status = 'BOUNCED'
          else if (s.includes('CANCEL')) status = 'CANCELLED'
          else status = 'PENDING'
        }

        const cDate = c.chequeDate ? new Date(c.chequeDate) : new Date()

        const chqDoc = {
          chequeNumber: chqNum,
          partyName: String(c.partyName || c.party || 'Party').trim(),
          type: type,
          amount: Number(c.amount) || 0,
          chequeDate: cDate && !isNaN(cDate.getTime()) ? cDate : new Date(),
          status: status,
          bankName: c.bankName || '',
          notes: c.notes || c.remarks || '',
          isDeleted: Boolean(c.isDeleted)
        }

        await Cheque.findOneAndUpdate(
          { chequeNumber: chqDoc.chequeNumber },
          chqDoc,
          { upsert: true, new: true }
        )
      }
    }

    if (data.transactions && data.transactions.length > 0) {
      await Transaction.insertMany(cleanArray(data.transactions))
    }

    res.status(200).json({ success: true, message: 'Data restored successfully' })
  } catch (error) {
    next(error)
  }
}

const InvoiceTemplate = require('../models/InvoiceTemplate.model')

exports.getInvoiceTemplate = async (req, res, next) => {
  try {
    let doc = await InvoiceTemplate.findOne()
    if (!doc) {
      doc = await InvoiceTemplate.create({})
    }
    res.json({ success: true, data: doc })
  } catch (error) {
    next(error)
  }
}

exports.saveInvoiceTemplate = async (req, res, next) => {
  try {
    const data = req.body
    const updated = await InvoiceTemplate.findOneAndUpdate(
      {},
      { $set: data },
      { new: true, upsert: true, runValidators: true }
    )
    res.json({ success: true, data: updated, message: 'Invoice template settings saved successfully' })
  } catch (error) {
    next(error)
  }
}
