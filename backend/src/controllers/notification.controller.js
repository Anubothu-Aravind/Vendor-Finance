const Notification = require('../models/Notification')
const Loan = require('../models/Loan')

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 1. Scan for active loans maturing within 30 days
    const activeLoans = await Loan.find({ 
      isDeleted: false, 
      status: { $in: ['ACTIVE', 'OVERDUE'] } 
    }).populate('financierId')

    for (const loan of activeLoans) {
      const nextDueDate = loan.nextDueDate || loan.drawdownDate
      if (nextDueDate) {
        const d = new Date(nextDueDate)
        if (!isNaN(d.getTime()) && d <= thirtyDaysFromNow) {
          const financierName = loan.financierId?.name || 'Financier'
          const dueDateStr = d.toISOString().split('T')[0]
          const loanRef = loan.loanReference || 'LN-REF'
          const amountStr = (loan.principalAmount || 0).toLocaleString('en-IN')
          const message = `Loan (Ref: ${loanRef}) of ₹${amountStr} from ${financierName} is maturing on ${dueDateStr}.`
          
          // Escape special regex characters in loanRef to prevent MongoDB query SyntaxError
          const safeRef = loanRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          
          // Check if warning already exists for this specific loan reference
          const exists = await Notification.findOne({
            userId,
            type: 'warning',
            link: '/loans',
            message: { $regex: safeRef, $options: 'i' }
          })

          if (!exists) {
            const warningNotif = new Notification({
              userId,
              type: 'warning',
              title: 'Loan Maturing Soon',
              message,
              link: '/loans'
            })
            await warningNotif.save()
          }
        }
      }
    }

    // 2. Fetch notifications
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      notifications
    })
  } catch (error) {
    next(error)
  }
}

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user._id || req.user.id

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { read: true } },
      { new: true }
    )

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    })
  } catch (error) {
    next(error)
  }
}

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id

    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    )

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user._id || req.user.id

    const result = await Notification.findOneAndDelete({ _id: id, userId })
    if (!result) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}
