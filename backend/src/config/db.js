const mongoose = require('mongoose')

const mongoUri = process.env.MONGO_URI

if (!mongoUri) {
  console.error('\x1b[31m%s\x1b[0m', '==================================================')
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: MONGO_URI is not defined in environment!')
  console.error('\x1b[31m%s\x1b[0m', 'Please specify MONGO_URI in your .env file.')
  console.error('\x1b[31m%s\x1b[0m', '==================================================')
  process.exit(1)
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri)
    console.log('\x1b[32m%s\x1b[0m', `MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`)
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `MongoDB Connection Error: ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
