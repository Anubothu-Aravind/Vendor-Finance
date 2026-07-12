const nodemailer = require('nodemailer')

const isProd = process.env.NODE_ENV === 'production'

const transporter = isProd
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'rowan.gerhold@ethereal.email',
        pass: 'HAgkGhvVqpHKQDzw8s'
      }
    })

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: isProd ? `"Vastrams" <${process.env.SMTP_USER}>` : '"Vastrams Dev" <rowan.gerhold@ethereal.email>',
    to: email,
    subject: 'Vastrams Account Setup — OTP Verification Code',
    text: `Your OTP verification code for Vastrams account setup is: ${otp}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Vastrams Account Setup</h2>
        <p>You have logged in with default credentials. Please use the following OTP code to verify your email address and complete the setup:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; color: #1e293b; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #64748b;">This OTP code is valid for 10 minutes and is case-insensitive. Max 3 attempts allowed.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not initiate this request, please contact system administration.</p>
      </div>
    `
  }

  const info = await transporter.sendMail(mailOptions)

  if (!isProd) {
    console.log(`\n\x1b[33m[VASTRAMS DEV] OTP email sent → https://ethereal.email/messages\x1b[0m`);
    console.log(`\x1b[33mView inbox: rowan.gerhold@ethereal.email\x1b[0m\n`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`\x1b[33mEthereal Preview URL: ${previewUrl}\x1b[0m\n`);
    }
  }

  return info
}

module.exports = {
  transporter,
  sendOTPEmail
}
