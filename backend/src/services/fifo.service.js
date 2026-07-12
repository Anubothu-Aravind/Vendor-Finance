const Bill = require('../models/Bill')

class FifoService {
  /**
   * Allocates a payment amount to a vendor's oldest outstanding bills first (FIFO order).
   * @param {string} vendorId - Vendor ObjectId
   * @param {number} paymentAmount - Total payment amount to distribute
   * @param {object} [session] - Optional Mongoose transaction session
   * @returns {Promise<Array>} - List of allocation records { billId, allocatedAmount }
   */
  async allocatePayment(vendorId, paymentAmount, session = null) {
    let remainingAmount = paymentAmount
    const allocations = []

    // Fetch active bills sorted by due date (oldest first)
    const bills = await Bill.find({
      vendorId,
      status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
      isDeleted: false
    })
    .sort({ dueDate: 1, billDate: 1 })
    .session(session)

    for (const bill of bills) {
      if (remainingAmount <= 0) break

      const outstanding = bill.outstandingAmount
      let allocated = 0

      if (remainingAmount >= outstanding) {
        // Complete settlement of this bill
        allocated = outstanding
        bill.paidAmount += outstanding
        bill.outstandingAmount = 0
        bill.status = 'PAID'
      } else {
        // Partial settlement
        allocated = remainingAmount
        bill.paidAmount += remainingAmount
        bill.outstandingAmount -= remainingAmount
        bill.status = 'PARTIALLY_PAID'
      }

      remainingAmount -= allocated
      allocations.push({
        billId: bill._id,
        allocatedAmount: allocated
      })

      await bill.save({ session })
    }

    return { allocations, unallocatedAmount: remainingAmount }
  }
}

module.exports = new FifoService()
