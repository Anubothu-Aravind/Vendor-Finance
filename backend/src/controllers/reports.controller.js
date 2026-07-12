const Vendor = require('../models/Vendor')
const Financier = require('../models/Financier')
const Bill = require('../models/Bill')
const Loan = require('../models/Loan')

exports.getOutstandingSummary = async (req, res, next) => {
  try {
    const now = new Date()

    // 1. Fetch all active vendors and financiers
    const vendors = await Vendor.find({ isDeleted: false })
    const financiers = await Financier.find({ isDeleted: false })

    // 2. Fetch all active bills & loans to compute counts and totals
    const bills = await Bill.find({ isDeleted: false })
    const loans = await Loan.find({ isDeleted: false })

    const parties = []

    // Process Vendors
    for (const vendor of vendors) {
      const vendorBills = bills.filter(b => b.vendorId.toString() === vendor._id.toString())
      const unpaidBills = vendorBills.filter(b => ['UNPAID', 'PARTIALLY_PAID'].includes(b.status))
      
      const totalAmount = vendorBills.reduce((sum, b) => sum + b.amount, 0)
      const paidAmount = vendorBills.reduce((sum, b) => sum + (b.amount - b.outstandingAmount), 0)
      
      let oldestDue = null
      let daysOverdue = null

      if (unpaidBills.length > 0) {
        const sortedDue = unpaidBills
          .map(b => new Date(b.dueDate))
          .sort((a, b) => a - b)
        oldestDue = sortedDue[0]
        
        if (oldestDue < now) {
          const diffTime = Math.abs(now - oldestDue)
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
      }

      parties.push({
        _id: vendor._id,
        name: vendor.name,
        type: 'Vendor',
        items: unpaidBills.length,
        total: totalAmount,
        paid: paidAmount,
        outstanding: vendor.outstandingBalance,
        oldestDue: oldestDue ? oldestDue.toISOString().split('T')[0] : null,
        daysOverdue: daysOverdue
      })
    }

    // Process Financiers
    for (const financier of financiers) {
      const financierLoans = loans.filter(l => l.financierId.toString() === financier._id.toString())
      const activeLoans = financierLoans.filter(l => ['ACTIVE', 'OVERDUE'].includes(l.status))
      
      const totalAmount = financierLoans.reduce((sum, l) => sum + l.principalAmount, 0)
      const paidAmount = financierLoans.reduce((sum, l) => sum + (l.principalAmount - l.outstandingPrincipal), 0)
      
      let oldestDue = null
      let daysOverdue = null

      if (activeLoans.length > 0) {
        const sortedDue = activeLoans
          .map(l => new Date(l.nextDueDate))
          .sort((a, b) => a - b)
        oldestDue = sortedDue[0]
        
        if (oldestDue < now) {
          const diffTime = Math.abs(now - oldestDue)
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
      }

      parties.push({
        _id: financier._id,
        name: financier.name,
        type: 'Financier',
        items: activeLoans.length,
        total: totalAmount,
        paid: paidAmount,
        outstanding: financier.outstandingBalance,
        oldestDue: oldestDue ? oldestDue.toISOString().split('T')[0] : null,
        daysOverdue: daysOverdue
      })
    }

    // Compute aggregate KPIs
    const vendorPayables = vendors.reduce((sum, v) => sum + v.outstandingBalance, 0)
    const loanOutstanding = financiers.reduce((sum, f) => sum + f.outstandingBalance, 0)
    const totalOutstanding = vendorPayables + loanOutstanding

    res.status(200).json({
      kpis: {
        totalOutstanding,
        vendorPayables,
        loanOutstanding,
        vendorCount: vendors.filter(v => v.outstandingBalance > 0).length,
        financierCount: financiers.filter(f => f.outstandingBalance > 0).length
      },
      parties
    })
  } catch (error) {
    next(error)
  }
}
