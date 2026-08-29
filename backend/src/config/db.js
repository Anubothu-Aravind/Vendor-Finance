const mongoose = require('mongoose')

const getMongoUri = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL
  if (uri) {
    process.env.MONGO_URI = uri
  }
  return uri
}

const connectDB = async () => {
  const mongoUri = getMongoUri()
  if (!mongoUri) {
    console.error('\x1b[31m%s\x1b[0m', '==================================================')
    console.error('\x1b[31m%s\x1b[0m', 'WARNING: MONGO_URI / MONGODB_URI is not defined in environment!')
    console.error('\x1b[31m%s\x1b[0m', 'Server is running in recovery mode.')
    console.error('\x1b[31m%s\x1b[0m', '==================================================')
    return null
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    })
    console.log('\x1b[32m%s\x1b[0m', `MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`)
    return conn
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `MongoDB Connection Error: ${error.message}`)
    return null
  }
}

module.exports = connectDB
