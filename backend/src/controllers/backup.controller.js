const Settings = require('../models/Settings')
const Vendor = require('../models/Vendor')
const Financier = require('../models/Financier')
const Loan = require('../models/Loan')
const Bill = require('../models/Bill')
const Payment = require('../models/Payment')
const Repayment = require('../models/Repayment')
const Cheque = require('../models/Cheque')
const Transaction = require('../models/Transaction')

exports.exportJson = async (req, res, next) => {
  try {
    const settings = await Settings.findOne()
    const vendors = await Vendor.find()
    const financiers = await Financier.find()
    const loans = await Loan.find()
    const bills = await Bill.find()
    const payments = await Payment.find()
    const repayments = await Repayment.find()
    const cheques = await Cheque.find()
    const transactions = await Transaction.find()

    const backupData = {
      settings: settings || {},
      vendors,
      financiers,
      loans,
      bills,
      payments,
      repayments,
      cheques,
      transactions
    }

    res.setHeader('Content-disposition', 'attachment; filename=vastrams_backup.json')
    res.setHeader('Content-type', 'application/json')
    res.status(200).send(JSON.stringify(backupData, null, 2))
  } catch (error) {
    next(error)
  }
}

// CSV export has been replaced by client-side Excel export (xlsx) in the frontend.
// This stub is kept for backward compatibility with any cached references.
exports.exportCsv = async (req, res, next) => {
  res.status(410).json({ success: false, message: 'CSV export is no longer supported. Use Export as Excel in the app.' })
}


exports.importJson = async (req, res, next) => {
  try {
    const data = req.body
    
    // Validate data exists
    if (!data) {
      return res.status(400).json({ success: false, message: 'No backup data provided' })
    }

    // Drop all collections first
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
      const s = new Settings(data.settings)
      await s.save()
    } else {
      const s = new Settings()
      await s.save()
    }

    // Restore arrays
    if (data.vendors && data.vendors.length > 0) await Vendor.insertMany(data.vendors)
    if (data.financiers && data.financiers.length > 0) await Financier.insertMany(data.financiers)
    if (data.loans && data.loans.length > 0) await Loan.insertMany(data.loans)
    if (data.bills && data.bills.length > 0) await Bill.insertMany(data.bills)
    if (data.payments && data.payments.length > 0) await Payment.insertMany(data.payments)
    if (data.repayments && data.repayments.length > 0) await Repayment.insertMany(data.repayments)
    if (data.cheques && data.cheques.length > 0) await Cheque.insertMany(data.cheques)
    if (data.transactions && data.transactions.length > 0) await Transaction.insertMany(data.transactions)

    res.status(200).json({ success: true, message: 'Data imported successfully' })
  } catch (error) {
    next(error)
  }
}

exports.resetData = async (req, res, next) => {
  try {
    const { token } = req.body
    
    // Double validation: must pass exactly 'RESET' in token
    if (token !== 'RESET') {
      return res.status(403).json({ success: false, message: 'Invalid confirmation token.' })
    }

    // Delete all documents
    await Settings.deleteMany()
    await Vendor.deleteMany()
    await Financier.deleteMany()
    await Loan.deleteMany()
    await Bill.deleteMany()
    await Payment.deleteMany()
    await Repayment.deleteMany()
    await Cheque.deleteMany()
    await Transaction.deleteMany()

    // Create single default Business Profile Settings
    const s = new Settings()
    await s.save()

    res.status(200).json({ success: true, message: 'Database reset successfully to factory defaults' })
  } catch (error) {
    next(error)
  }
}
