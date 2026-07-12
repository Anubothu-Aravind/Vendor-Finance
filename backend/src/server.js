require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

// Loud validation of basic environment variables
const PORT = process.env.PORT || 5000

// Initialize Express App
const app = express()

// Connect to Database and seed
connectDB().then(() => {
  const seedAdminUser = require('./config/seed')
  seedAdminUser()
})

// Enable CORS with whitelist
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// Parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Serve static uploads
const path = require('path')
app.use('/uploads', express.static(path.join(__dirname, '../upload')))

// Base Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() })
})

// Global Setup Verification Middleware
const requiresSetupComplete = require('./middleware/requiresSetupComplete')
app.use(requiresSetupComplete)

// Route definitions
app.use('/api/auth/setup', require('./routes/auth/setup'))
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/dashboard', require('./routes/dashboard.routes'))
app.use('/api/vendors', require('./routes/vendor.routes'))
app.use('/api/bills', require('./routes/bill.routes'))
app.use('/api/payments', require('./routes/payment.routes'))
app.use('/api/financiers', require('./routes/financier.routes'))
app.use('/api/loans', require('./routes/loan.routes'))
app.use('/api/cheques', require('./routes/cheque.routes'))
app.use('/api/ledger', require('./routes/ledger.routes'))
app.use('/api/reports', require('./routes/reports.routes'))
app.use('/api/settings', require('./routes/settings.routes'))
app.use('/api/notifications', require('./routes/notification.routes'))
const { sseHandler } = require('./utils/sse')
app.get('/api/events', sseHandler)
app.use('/api', require('./routes/backup.routes'))

// Global Error Handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Server running on port ${PORT}`)
})
