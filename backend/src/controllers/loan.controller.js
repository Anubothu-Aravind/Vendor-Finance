const mongoose = require('mongoose')
const { broadcastEvent } = require('../utils/sse')
const Loan = require('../models/Loan')
const Repayment = require('../models/Repayment')
const Financier = require('../models/Financier')
const Cheque = require('../models/Cheque')
const LedgerService = require('../services/ledger.service')

exports.createLoan = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { loanReference, financierId, principalAmount, interestRate, drawdownDate, maturityDate, linkChequeNumber } = req.body

    // Validate Financier
    const financier = await Financier.findOne({ _id: financierId, isDeleted: false }).session(session)
    if (!financier) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Financier not found' })
    }

    // Check duplicate reference
    const duplicate = await Loan.findOne({ loanReference, isDeleted: false }).session(session)
    if (duplicate) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ success: false, message: `Loan Reference '${loanReference}' already exists.` })
    }

    // If cheque number provided, log issued cheque to financier
    let linkedChequeId = null
    if (linkChequeNumber) {
      const cheque = new Cheque({
        chequeNumber: linkChequeNumber,
        type: 'ISSUED_FINANCIER',
        partyName: financier.name,
        financierId,
        amount: principalAmount,
        chequeDate: drawdownDate || new Date(),
        status: 'PENDING'
      })
      await cheque.save({ session })
      linkedChequeId = cheque._id
    }

    // Create Loan
    const loan = new Loan({
      loanReference,
      financierId,
      principalAmount,
      interestRate: interestRate || financier.defaultInterestRate,
      drawdownDate,
      maturityDate,
      linkedChequeId,
      outstandingPrincipal: principalAmount,
      status: 'ACTIVE'
    })
    await loan.save({ session })

    // Post to unified transaction log (recalculates financier.outstandingBalance internally)
    await LedgerService.postTransaction({
      type: 'LOAN_DRAWDOWN',
      amount: principalAmount,
      financierId,
      referenceType: 'Loan',
      referenceId: loan._id,
      description: `Loan Drawdown Ref: ${loanReference}`
    }, session)

    await session.commitTransaction()
    session.endSession()

    broadcastEvent('data-changed', { entity: 'loan', action: 'create' })

    res.status(201).json({ success: true, data: loan })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

exports.getLoans = async (req, res, next) => {
  try {
    const { financierId, status } = req.query
    const filter = { isDeleted: false }

    if (financierId) filter.financierId = financierId
    if (status) filter.status = status

    const loans = await Loan.find(filter)
      .populate('financierId', 'name')
      .populate('linkedChequeId', 'chequeNumber status')
      .sort({ drawdownDate: -1 })

    res.status(200).json(loans)
  } catch (error) {
    next(error)
  }
}

exports.getLoanById = async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, isDeleted: false })
      .populate('financierId', 'name email phone defaultInterestRate')
      .populate('linkedChequeId')

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' })
    }

    // Fetch related repayments
    const repayments = await Repayment.find({ loanId: loan._id, isDeleted: false })
      .populate('chequeId')
      .sort({ repaymentDate: -1 })

    res.status(200).json({ loan, repayments })
  } catch (error) {
    next(error)
  }
}

exports.createRepayment = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { id } = req.params
    const { amount, repaymentDate, repaymentMode, chequeNumber, referenceNumber, interestPaid, principalPaid } = req.body

    const loan = await Loan.findOne({ _id: id, isDeleted: false }).session(session)
    if (!loan) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Loan not found' })
    }

    if (loan.status === 'SETTLED') {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ success: false, message: 'Loan is already settled' })
    }

    // Split logic: user provides manual breakdown or we auto-apportion.
    // If not provided, assume all goes to principal first up to principalAmount, then interest
    let calcInterestPaid = interestPaid !== undefined ? Number(interestPaid) : 0
    let calcPrincipalPaid = principalPaid !== undefined ? Number(principalPaid) : 0

    if (interestPaid === undefined && principalPaid === undefined) {
      if (amount <= loan.outstandingPrincipal) {
        calcPrincipalPaid = amount
        calcInterestPaid = 0
      } else {
        calcPrincipalPaid = loan.outstandingPrincipal
        calcInterestPaid = amount - loan.outstandingPrincipal
      }
    }

    // Update Loan parameters
    loan.paidPrincipal += calcPrincipalPaid
    loan.paidInterest += calcInterestPaid
    loan.outstandingPrincipal = Math.max(0, loan.outstandingPrincipal - calcPrincipalPaid)
    
    if (loan.outstandingPrincipal === 0) {
      loan.status = 'SETTLED'
    }
    await loan.save({ session })

    // Optional cheque registry log
    let chequeId = null
    let refNum = referenceNumber
    if (repaymentMode === 'CHEQUE') {
      if (!chequeNumber) {
        await session.abortTransaction()
        session.endSession()
        return res.status(400).json({ success: false, message: 'Cheque number is required for CHEQUE repayments.' })
      }
      
      const financier = await Financier.findById(loan.financierId).session(session)
      const cheque = new Cheque({
        chequeNumber,
        type: 'ISSUED_FINANCIER',
        partyName: financier ? financier.name : 'Financier',
        financierId: loan.financierId,
        amount,
        chequeDate: repaymentDate || new Date(),
        status: 'PENDING'
      })
      await cheque.save({ session })
      chequeId = cheque._id
      refNum = chequeNumber
    }

    // Create Repayment record
    const repayment = new Repayment({
      loanId: loan._id,
      amount,
      repaymentDate,
      repaymentMode,
      chequeId,
      referenceNumber: refNum,
      interestPaid: calcInterestPaid,
      principalPaid: calcPrincipalPaid
    })
    await repayment.save({ session })

    // Post to unified transaction log
    // We post the principal portion of repayment to reduce outstanding ledger balance
    await LedgerService.postTransaction({
      type: 'LOAN_REPAYMENT',
      amount: calcPrincipalPaid,
      financierId: loan.financierId,
      referenceType: 'Repayment',
      referenceId: repayment._id,
      description: `Loan Repayment Principal - Loan Ref: ${loan.loanReference}`
    }, session)

    if (calcInterestPaid > 0) {
      // Interest portion doesn't reduce outstanding principal but needs ledger tracking, 
      // or we record interest accrual first and then repayment.
      // To keep ledger simple and in sync with outstanding balances,
      // we can post an INTEREST_ACCRUED (+ outstanding) followed by REPAYMENT_INTEREST (- outstanding)
      // which nets to 0, or just log an info entry. Let's record interest accrued then settled to keep balance audit log clean.
      await LedgerService.postTransaction({
        type: 'INTEREST_ACCRUED',
        amount: calcInterestPaid,
        financierId: loan.financierId,
        referenceType: 'Repayment',
        referenceId: repayment._id,
        description: `Accrued Interest for Settlement - Loan Ref: ${loan.loanReference}`
      }, session)

      await LedgerService.postTransaction({
        type: 'REPAYMENT_INTEREST',
        amount: calcInterestPaid,
        financierId: loan.financierId,
        referenceType: 'Repayment',
        referenceId: repayment._id,
        description: `Loan Repayment Interest - Loan Ref: ${loan.loanReference}`
      }, session)
    }

    await session.commitTransaction()
    session.endSession()

    broadcastEvent('data-changed', { entity: 'loan', action: 'repayment' })

    res.status(201).json({ success: true, data: repayment })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

exports.updateLoan = async (req, res, next) => {
  try {
    const { noteNumber, amount, date, notes, status } = req.body
    const loan = await Loan.findOne({ _id: req.params.id, isDeleted: false })
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' })
    }

    if (noteNumber !== undefined) loan.loanReference = noteNumber
    if (amount !== undefined) {
      loan.principalAmount = amount
      // Auto-calculate outstanding principal on save
      loan.outstandingPrincipal = Math.max(0, amount - loan.paidPrincipal)
    }
    if (date !== undefined) loan.drawdownDate = date
    if (notes !== undefined) loan.notes = notes
    
    if (status !== undefined) {
      // Map 'Active' / 'Closed' / 'SETTLED' to internal enum
      const upperStatus = status.toUpperCase()
      if (upperStatus === 'ACTIVE') {
        loan.status = 'ACTIVE'
      } else if (upperStatus === 'CLOSED' || upperStatus === 'SETTLED') {
        loan.status = 'SETTLED'
      }
    }

    await loan.save()
    broadcastEvent('data-changed', { entity: 'loan', action: 'update' })
    res.status(200).json({ success: true, data: loan })
  } catch (error) {
    next(error)
  }
}

exports.deleteLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    )

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' })
    }

    broadcastEvent('data-changed', { entity: 'loan', action: 'delete' })

    res.status(200).json({ success: true, message: 'Loan soft deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const Transaction = require('../models/Transaction')

exports.getAllRepayments = async (req, res, next) => {
  try {
    const repayments = await Repayment.find({ isDeleted: false })
      .populate({
        path: 'loanId',
        populate: {
          path: 'financierId',
          select: 'name'
        }
      })
      .populate('chequeId')
      .sort({ repaymentDate: -1 })
    res.status(200).json(repayments)
  } catch (error) {
    next(error)
  }
}

exports.deleteRepayment = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const repayment = await Repayment.findOne({ _id: req.params.repaymentId, isDeleted: false }).session(session)
    if (!repayment) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ success: false, message: 'Repayment not found' })
    }

    repayment.isDeleted = true
    await repayment.save({ session })

    const loan = await Loan.findById(repayment.loanId).session(session)
    if (loan) {
      loan.paidPrincipal = Math.max(0, loan.paidPrincipal - repayment.principalPaid)
      loan.paidInterest = Math.max(0, loan.paidInterest - repayment.interestPaid)
      loan.outstandingPrincipal = Math.min(loan.principalAmount, loan.outstandingPrincipal + repayment.principalPaid)
      loan.status = 'ACTIVE'
      await loan.save({ session })
    }

    const transactions = await Transaction.find({
      referenceType: 'Repayment',
      referenceId: repayment._id,
      isDeleted: false
    }).session(session)

    for (const txn of transactions) {
      txn.isDeleted = true
      await txn.save({ session })
    }

    if (loan) {
      const financier = await Financier.findById(loan.financierId).session(session)
      if (financier) {
        financier.outstandingBalance = Math.max(0, financier.outstandingBalance + repayment.amount)
        await financier.save({ session })
      }
    }

    await session.commitTransaction()
    session.endSession()
    res.status(200).json({ success: true, message: 'Repayment deleted successfully' })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}


