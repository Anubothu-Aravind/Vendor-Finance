const nodemailer = require('nodemailer')

const smtpUser = process.env.SMTP_USER || ''
const smtpPass = process.env.SMTP_PASS || ''

const transporterConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
}

if (smtpUser && smtpPass) {
  transporterConfig.auth = {
    user: smtpUser,
    pass: smtpPass
  }
}

const transporter = nodemailer.createTransport(transporterConfig)

// Connection verification on server startup
if (smtpUser && smtpPass) {
  transporter.verify((err) => {
    if (err) {
      console.error('[SMTP] Connection failed:', err.message)
    } else {
      console.log('\x1b[32m%s\x1b[0m', 'SMTP server ready')
    }
  })
} else {
  console.log('\x1b[33m%s\x1b[0m', '[SMTP] Notice: Credentials missing in .env (SMTP_USER / SMTP_PASS). Set credentials to send real emails.')
}

module.exports = transporter
