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
        const party = cheque.vendorId || cheque.financierId
        alerts.push({
          id: `cheque-${cheque._id}`,
          type: 'error',
          title: 'Cheque Bounced',
          description: `Cheque #${cheque.chequeNumber} for ${cheque.partyName} bounced. Reason: ${cheque.bounceReason || 'Unspecified'}`,
          date: cheque.bounceDate || cheque.updatedAt,
          metadata: {
            type: 'cheque',
            id: cheque._id,
            chequeId: cheque._id.toString(),
            partyName: cheque.partyName,
            amount: cheque.amount,
            chequeNumber: cheque.chequeNumber,
            chequeDate: cheque.chequeDate,
            bounceDate: cheque.bounceDate || cheque.updatedAt,
            bounceReason: cheque.bounceReason || 'Not specified',
            chequeType: cheque.type,
            partyGstin: party ? party.gstin || null : null,
            partyAddress: party ? party.address || null : null,
            date: cheque.bounceDate || cheque.updatedAt
          }
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
        const billDue = bill.dueDate ? new Date(bill.dueDate) : null
        const daysOverdue = billDue && !isNaN(billDue.getTime()) ? Math.floor((now.getTime() - billDue.getTime()) / (1000 * 60 * 60 * 24)) : 0
        const amtStr = (bill.outstandingAmount || 0).toLocaleString('en-IN')
        alerts.push({
          id: `bill-${bill._id}`,
          type: 'error',
          title: 'Critical Overdue Bill',
          description: `Bill #${bill.billNumber || '—'} from ${vendorName} is ${daysOverdue} days overdue (Outstanding: ₹${amtStr})`,
          date: bill.dueDate || now,
          metadata: { 
            type: 'bill', 
            id: bill._id,
            partyName: vendorName,
            amount: bill.outstandingAmount || 0,
            date: bill.dueDate || now
          }
        })
      })

      // 3. Fetch Loans Maturing Within 30 Days
      const thirtyDaysHence = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const maturingLoans = await Loan.find({
        status: 'ACTIVE',
        maturityDate: { $gte: now, $lte: thirtyDaysHence },
        isDeleted: false
      }).populate('financierId')

      maturingLoans.forEach(loan => {
        const financierName = loan.financierId ? loan.financierId.name : 'Unknown Financier'
        const matDate = loan.maturityDate ? new Date(loan.maturityDate) : null
        const daysToMaturity = matDate && !isNaN(matDate.getTime()) ? Math.ceil((matDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
        const amtStr = (loan.outstandingPrincipal || 0).toLocaleString('en-IN')
        alerts.push({
          id: `loan-${loan._id}`,
          type: 'warning',
          title: 'Loan Maturing Soon',
          description: `Loan Ref: ${loan.loanReference || '—'} from ${financierName} matures in ${daysToMaturity} days (Outstanding Principal: ₹${amtStr})`,
          date: loan.maturityDate || now,
          metadata: { 
            type: 'loan', 
            id: loan._id,
            partyName: financierName,
            amount: loan.outstandingPrincipal || 0,
            date: loan.maturityDate || now
          }
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
