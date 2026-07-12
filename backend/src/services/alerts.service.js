const Cheque = require('../models/Cheque')
const Bill = require('../models/Bill')
const Loan = require('../models/Loan')

class AlertsService {
  /**
   * Scans database models to compute active system alerts/anomalies.
   * @returns {Promise<Array>} - List of formatted alert objects
   */
  async getActiveAlerts() {
    const alerts = []
    const now = new Date()

    try {
      // 1. Fetch Bounced Cheques
      const bouncedCheques = await Cheque.find({
        status: 'BOUNCED',
        isDeleted: false
      }).populate('vendorId financierId')

      bouncedCheques.forEach(cheque => {
        alerts.push({
          id: `cheque-${cheque._id}`,
          type: 'error',
          title: 'Cheque Bounced',
          description: `Cheque #${cheque.chequeNumber} for ${cheque.partyName} (Amt: ₹${cheque.amount.toLocaleString('en-IN')}) bounced. Reason: ${cheque.bounceReason || 'Unspecified'}`,
          date: cheque.bounceDate || cheque.updatedAt,
          metadata: { type: 'cheque', id: cheque._id }
        })
      })

      // 2. Fetch Overdue Bills >= 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const criticalOverdueBills = await Bill.find({
        status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { $lte: thirtyDaysAgo },
        isDeleted: false
      }).populate('vendorId')

      criticalOverdueBills.forEach(bill => {
        const vendorName = bill.vendorId ? bill.vendorId.name : 'Unknown Vendor'
        const daysOverdue = Math.floor((now.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `bill-${bill._id}`,
          type: 'error',
          title: 'Critical Overdue Bill',
          description: `Bill #${bill.billNumber} from ${vendorName} is ${daysOverdue} days overdue (Outstanding: ₹${bill.outstandingAmount.toLocaleString('en-IN')})`,
          date: bill.dueDate,
          metadata: { type: 'bill', id: bill._id }
        })
      })

      // 3. Fetch Loans Maturing Within 14 Days
      const fourteenDaysHence = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      const maturingLoans = await Loan.find({
        status: 'ACTIVE',
        maturityDate: { $gte: now, $lte: fourteenDaysHence },
        isDeleted: false
      }).populate('financierId')

      maturingLoans.forEach(loan => {
        const financierName = loan.financierId ? loan.financierId.name : 'Unknown Financier'
        const daysToMaturity = Math.ceil((loan.maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `loan-${loan._id}`,
          type: 'warning',
          title: 'Loan Maturing Soon',
          description: `Loan Ref: ${loan.loanReference} from ${financierName} matures in ${daysToMaturity} days (Outstanding Principal: ₹${loan.outstandingPrincipal.toLocaleString('en-IN')})`,
          date: loan.maturityDate,
          metadata: { type: 'loan', id: loan._id }
        })
      })

      // Sort alerts chronologically (most recent first)
      alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    } catch (error) {
      console.error('Error generating alerts:', error)
    }

    return alerts
  }
}

module.exports = new AlertsService()
