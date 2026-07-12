const mongoose = require('mongoose')
const { createNotification } = require('../utils/notificationHelper')
const { broadcastEvent } = require('../utils/sse')
const Payment = require('../models/Payment')
const Cheque = require('../models/Cheque')
const FifoService = require('../services/fifo.service')
const LedgerService = require('../services/ledger.service')
const Vendor = require('../models/Vendor')
const Bill = require('../models/Bill')
const Transaction = require('../models/Transaction')

exports.createPayment = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { vendorId, amount, paymentDate, paymentMode, chequeNumber, referenceNumber } = req.body

    // Validate Vendor
    const vendor = await Vendor.findOne({ _id: vendorId, isDeleted: false }).session(session)
    if (!vendor) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Vendor not found' })
    }

    // 1. Run FIFO allocation engine
    const { allocations } = await FifoService.allocatePayment(vendorId, amount, session)

    // 2. If paymentMode is CHEQUE, create Cheque Registry item
    let chequeId = null
    let refNum = referenceNumber

    if (paymentMode === 'CHEQUE') {
      if (!chequeNumber) {
        await session.abortTransaction()
        session.endSession()
        return res.status(400).json({ success: false, message: 'Cheque number is required for CHEQUE payment mode.' })
      }

      // Create a pending Issued Cheque in Registry
      const cheque = new Cheque({
        chequeNumber,
        type: 'ISSUED_VENDOR',
        partyName: vendor.name,
        vendorId,
        amount,
        chequeDate: paymentDate || new Date(),
        status: 'PENDING'
      })
      await cheque.save({ session })
      chequeId = cheque._id
      refNum = chequeNumber // Cheque number serves as reference
    }

    // 3. Create Payment record
    const payment = new Payment({
      vendorId,
      amount,
      paymentDate,
      paymentMode,
      chequeId,
      referenceNumber: refNum,
      allocations
    })
    await payment.save({ session })

    // 4. Update the Unified Transaction Ledger (recomputes vendor.outstandingBalance internally)
    await LedgerService.postTransaction({
      type: 'BILL_PAID',
      amount,
      vendorId,
      referenceType: 'Payment',
      referenceId: payment._id,
      description: `Payment via ${paymentMode} - Ref: ${refNum}`
    }, session)

    await session.commitTransaction()
    session.endSession()

    await createNotification({
      userId: req.user.id,
      type: 'success',
      title: 'Payment Recorded',
      message: `Payment of ₹${amount.toLocaleString('en-IN')} to ${vendor.name} has been successfully recorded.`,
      link: '/payments'
    })

    broadcastEvent('data-changed', { entity: 'payment', action: 'create' })

    res.status(201).json({ success: true, data: payment })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

exports.getPayments = async (req, res, next) => {
  try {
    const { vendorId } = req.query
    const filter = { isDeleted: false }

    if (vendorId) filter.vendorId = vendorId

    const payments = await Payment.find(filter)
      .populate('vendorId', 'name email')
      .populate('chequeId', 'chequeNumber status')
      .populate('allocations.billId', 'billNumber amount paidAmount outstandingAmount')
      .sort({ paymentDate: -1, createdAt: -1 })

    res.status(200).json(payments)
  } catch (error) {
    next(error)
  }
}

exports.deletePayment = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const payment = await Payment.findOne({ _id: req.params.id, isDeleted: false }).session(session)
    if (!payment) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }

    payment.isDeleted = true
    await payment.save({ session })

    for (const alloc of payment.allocations) {
      const bill = await Bill.findById(alloc.billId).session(session)
      if (bill) {
        bill.paidAmount = Math.max(0, bill.paidAmount - alloc.allocatedAmount)
        bill.outstandingAmount = Math.min(bill.amount, bill.outstandingAmount + alloc.allocatedAmount)
        bill.status = bill.paidAmount <= 0 ? 'UNPAID' : 'PARTIALLY_PAID'
        await bill.save({ session })
      }
    }

    const transaction = await Transaction.findOne({
      referenceType: 'Payment',
      referenceId: payment._id,
      isDeleted: false
    }).session(session)

    if (transaction) {
      transaction.isDeleted = true
      await transaction.save({ session })
    }

    const vendor = await Vendor.findById(payment.vendorId).session(session)
    if (vendor) {
      vendor.outstandingBalance = Math.max(0, vendor.outstandingBalance + payment.amount)
      await vendor.save({ session })
    }

    await session.commitTransaction()
    session.endSession()
    res.status(200).json({ success: true, message: 'Payment deleted and outstanding balances reverted successfully' })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}
