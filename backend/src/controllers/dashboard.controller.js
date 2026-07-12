const Vendor = require('../models/Vendor')
const Financier = require('../models/Financier')
const Bill = require('../models/Bill')
const Loan = require('../models/Loan')
const Cheque = require('../models/Cheque')
const AlertsService = require('../services/alerts.service')

exports.getSummary = async (req, res, next) => {
  try {
    const now = new Date()

    // 1. Compute KPI Card totals
    const vendors = await Vendor.find({ isDeleted: false })
    const financiers = await Financier.find({ isDeleted: false })

    const vendorOutstanding = vendors.reduce((sum, v) => sum + v.outstandingBalance, 0)
    const financierOutstanding = financiers.reduce((sum, f) => sum + f.outstandingBalance, 0)
    const totalOutstanding = vendorOutstanding + financierOutstanding

    // Overdue Bills
    const overdueBillsQuery = await Bill.find({
      status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
      dueDate: { $lt: now },
      isDeleted: false
    })
    const overdueBillsTotal = overdueBillsQuery.reduce((sum, b) => sum + b.outstandingAmount, 0)

    // Cheques in Transit
    const pendingCheques = await Cheque.find({
      status: 'PENDING',
      isDeleted: false
    })
    const chequesInTransitTotal = pendingCheques.reduce((sum, c) => sum + c.amount, 0)

    // 2. Fetch Top 5 Vendors and Financiers
    const topVendorsList = await Vendor.find({ isDeleted: false, outstandingBalance: { $gt: 0 } })
      .sort({ outstandingBalance: -1 })
      .limit(5)

    const topFinanciersList = await Financier.find({ isDeleted: false, outstandingBalance: { $gt: 0 } })
      .sort({ outstandingBalance: -1 })
      .limit(5)

    // 3. Mock Chart Trend Data (Past 6 Months)
    // In a fully populated DB, this would aggregate ledger entries by month.
    // For scaffolding, we return a realistic trend structure.
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const chartsTrend = []
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(now.getMonth() - i)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`
      
      // Calculate dynamic mock trends if no DB data exists
      const factor = 1 - (i * 0.08)
      chartsTrend.push({
        name: label,
        vendorOutstanding: Math.round(vendorOutstanding ? vendorOutstanding * factor : 4500000 * factor),
        financierOutstanding: Math.round(financierOutstanding ? financierOutstanding * factor : 3200000 * factor)
      })
    }

    res.status(200).json({
      kpis: {
        totalOutstanding,
        vendorOutstanding,
        financierOutstanding,
        overdueBills: overdueBillsTotal,
        chequesInTransit: chequesInTransitTotal
      },
      charts: {
        outstandingTrend: chartsTrend
      },
      topVendors: topVendorsList,
      topFinanciers: topFinanciersList
    })
  } catch (error) {
    next(error)
  }
}

exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await AlertsService.getActiveAlerts()
    res.status(200).json(alerts)
  } catch (error) {
    next(error)
  }
}
