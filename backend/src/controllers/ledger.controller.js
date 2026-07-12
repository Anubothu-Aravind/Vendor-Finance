const Transaction = require('../models/Transaction')

exports.getLedger = async (req, res, next) => {
  try {
    const { vendorId, financierId, type, showDeleted } = req.query
    const filter = {}

    if (showDeleted !== 'true') {
      filter.isDeleted = false
    }

    if (vendorId) filter.vendorId = vendorId
    if (financierId) filter.financierId = financierId
    if (type) filter.type = type

    const transactions = await Transaction.find(filter)
      .populate('vendorId', 'name')
      .populate('financierId', 'name')
      .sort({ date: -1, createdAt: -1 })

    res.status(200).json(transactions)
  } catch (error) {
    next(error)
  }
}

exports.getVendorStatement = async (req, res, next) => {
  try {
    const { vendorId } = req.params
    const transactions = await Transaction.find({
      vendorId,
      isDeleted: false
    })
    .sort({ date: 1, createdAt: 1 }) // Chronological order to build running statement

    res.status(200).json(transactions)
  } catch (error) {
    next(error)
  }
}

exports.getFinancierStatement = async (req, res, next) => {
  try {
    const { financierId } = req.params
    const transactions = await Transaction.find({
      financierId,
      isDeleted: false
    })
    .sort({ date: 1, createdAt: 1 }) // Chronological order to build running statement

    res.status(200).json(transactions)
  } catch (error) {
    next(error)
  }
}
