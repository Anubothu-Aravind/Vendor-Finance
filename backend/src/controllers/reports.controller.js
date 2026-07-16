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
          .map(b => b.dueDate ? new Date(b.dueDate) : null)
          .filter(d => d && !isNaN(d.getTime()))
          .sort((a, b) => a - b)
        
        if (sortedDue.length > 0) {
          oldestDue = sortedDue[0]
          if (oldestDue < now) {
            const diffTime = Math.abs(now - oldestDue)
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          }
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
        oldestDue: oldestDue && !isNaN(oldestDue.getTime()) ? oldestDue.toISOString().split('T')[0] : null,
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
          .map(l => l.maturityDate ? new Date(l.maturityDate) : null)
          .filter(d => d && !isNaN(d.getTime()))
          .sort((a, b) => a - b)
        
        if (sortedDue.length > 0) {
          oldestDue = sortedDue[0]
          if (oldestDue < now) {
            const diffTime = Math.abs(now - oldestDue)
            daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          }
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
        oldestDue: oldestDue && !isNaN(oldestDue.getTime()) ? oldestDue.toISOString().split('T')[0] : null,
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

exports.getInterestStatements = async (req, res, next) => {
  try {
    const loans = await Loan.find({ isDeleted: false }).populate('financierId')
    const loanSchedules = []
    const monthlyAggregates = {}

    for (const loan of loans) {
      const P = loan.principalAmount
      const R = loan.interestRate
      const drawdown = new Date(loan.drawdownDate)
      const maturity = new Date(loan.maturityDate)
      
      let tenureMonths = (maturity.getFullYear() - drawdown.getFullYear()) * 12 + (maturity.getMonth() - drawdown.getMonth())
      if (tenureMonths <= 0) tenureMonths = 1

      const r = R / (100 * 12)
      let emi = 0
      if (r > 0) {
        emi = P * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1)
      } else {
        emi = P / tenureMonths
      }

      const schedule = []
      let balance = P

      for (let m = 1; m <= tenureMonths; m++) {
        const paymentDate = new Date(drawdown.getFullYear(), drawdown.getMonth() + m, drawdown.getDate())
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`

        let interest = balance * r
        if (r === 0) interest = 0

        let principal = emi - interest
        if (m === tenureMonths || balance < principal) {
          principal = balance
        }

        balance = Math.max(0, balance - principal)

        schedule.push({
          month: monthKey,
          principal: Math.round(principal),
          interest: Math.round(interest),
          balance: Math.round(balance)
        })

        if (!monthlyAggregates[monthKey]) {
          monthlyAggregates[monthKey] = { month: monthKey, principal: 0, interest: 0, balance: 0 }
        }
        monthlyAggregates[monthKey].principal += Math.round(principal)
        monthlyAggregates[monthKey].interest += Math.round(interest)
        monthlyAggregates[monthKey].balance += Math.round(balance)
      }

      loanSchedules.push({
        loanId: loan._id,
        loanReference: loan.loanReference,
        financierName: loan.financierId?.name || '—',
        principalAmount: P,
        interestRate: R,
        schedule
      })
    }

    const summary = Object.values(monthlyAggregates).sort((a, b) => a.month.localeCompare(b.month))

    res.status(200).json({
      success: true,
      summary,
      loans: loanSchedules
    })
  } catch (error) {
    next(error)
  }
}
