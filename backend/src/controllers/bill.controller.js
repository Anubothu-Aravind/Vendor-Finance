const mongoose = require('mongoose')
const { broadcastEvent } = require('../utils/sse')
const Bill = require('../models/Bill')
const Vendor = require('../models/Vendor')
const LedgerService = require('../services/ledger.service')

exports.createBill = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { billNumber, vendorId, amount, billDate, dueDate } = req.body

    // Check if vendor exists
    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false }).session(session)
    if (!vendor) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Vendor not found' })
    }

    // Check duplicate bill number for this vendor
    const duplicate = await Bill.findOne({ billNumber, vendorId, isDeleted: false }).session(session)
    if (duplicate) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ success: false, message: `Bill number '${billNumber}' already exists for this vendor.` })
    }

    // Create and save bill
    const bill = new Bill({
      billNumber,
      vendorId,
      amount,
      outstandingAmount: amount,
      billDate,
      dueDate,
      status: 'UNPAID'
    })
    await bill.save({ session })

    // Post to unified transaction ledger
    await LedgerService.postTransaction({
      type: 'BILL_POSTED',
      amount,
      vendorId,
      referenceType: 'Bill',
      referenceId: bill._id,
      description: `Bill #${billNumber} posted`
    }, session)

    await session.commitTransaction()
    session.endSession()

    broadcastEvent('data-changed', { entity: 'bill', action: 'create' })

    res.status(201).json({ success: true, data: bill })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

exports.getBills = async (req, res, next) => {
  try {
    const { vendorId, status } = req.query
    const filter = { isDeleted: false }

    if (vendorId) filter.vendorId = vendorId
    if (status) filter.status = status

    const bills = await Bill.find(filter)
      .populate('vendorId', 'name email')
      .sort({ dueDate: 1, billDate: 1 })

    res.status(200).json(bills)
  } catch (error) {
    next(error)
  }
}

exports.getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, isDeleted: false })
      .populate('vendorId', 'name contactPerson email phone')

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }
    res.status(200).json(bill)
  } catch (error) {
    next(error)
  }
}

exports.deleteBill = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const bill = await Bill.findOne({ _id: req.params.id, isDeleted: false }).session(session)
    if (!bill) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Bill not found' })
    }

    if (bill.paidAmount > 0) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ success: false, message: 'Cannot delete a bill that has received payments.' })
    }

    // Soft delete
    bill.isDeleted = true
    await bill.save({ session })

    // Reverse ledger payable entry by posting reverse transaction
    await LedgerService.postTransaction({
      type: 'BILL_PAID', // Reduces payable by the bill amount to negate the previous bill posted
      amount: bill.amount,
      vendorId: bill.vendorId,
      referenceType: 'Bill',
      referenceId: bill._id,
      description: `Reversal of deleted bill #${bill.billNumber}`
    }, session)

    await session.commitTransaction()
    session.endSession()

    broadcastEvent('data-changed', { entity: 'bill', action: 'delete' })

    res.status(200).json({ success: true, message: 'Bill deleted and payable ledger reversed' })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}
