const User = require('../models/User')
const bcrypt = require('bcryptjs')

const seedAdminUser = async () => {
  try {
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10)
      const defaultAdmin = new User({
        name: 'Admin User',
        email: 'admin@vastrams.in',
        passwordHash,
        role: 'Admin',
        status: 'Active',
        isDefaultCredential: true
      })
      await defaultAdmin.save()
      console.log('Seeded default Admin User: admin@vastrams.in / admin123')
    }
  } catch (err) {
    console.error('Failed to seed default admin user:', err)
  }
}

module.exports = seedAdminUser
