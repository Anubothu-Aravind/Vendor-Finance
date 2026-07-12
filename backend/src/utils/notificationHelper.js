const Notification = require('../models/Notification')
const User = require('../models/User')

/**
 * Creates a notification for a specific user, or for all active Admin users if userId is omitted.
 */
async function createNotification({ userId, type, title, message, link }) {
  try {
    if (userId) {
      const notif = new Notification({ userId, type, title, message, link })
      await notif.save()
      return notif
    }

    // Fallback: send to all active Admin users
    const admins = await User.find({ role: 'Admin', status: 'Active' })
    const promises = admins.map(admin => {
      const notif = new Notification({
        userId: admin._id,
        type,
        title,
        message,
        link
      })
      return notif.save()
    })
    await Promise.all(promises)
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

module.exports = { createNotification }
