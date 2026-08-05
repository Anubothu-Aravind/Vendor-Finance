const transporter = require('../config/mailer')

const sendOTPEmail = async (email, otp) => {
  const fromAddress = process.env.SMTP_FROM || '"Vastrams" <noreply@vastrams.in>'

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Vastrams Account Setup — OTP Verification Code',
    text: `Your OTP verification code for Vastrams account setup is: ${otp}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #00C896; margin-bottom: 20px;">Vastrams Account Setup</h2>
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
  return info
}

const sendInvitationEmail = async (email, name, role, temporaryPassword, inviteLink) => {
  const fromAddress = process.env.SMTP_FROM || '"Vastrams" <noreply@vastrams.in>'

  const textContent = inviteLink
    ? `Hello ${name},\n\nYou have been invited to join Vastrams as a ${role}.\n\nAccept your invitation and set your password here:\n${inviteLink}\n\nLogin Email: ${email}\nTemporary Password: ${temporaryPassword}`
    : `Hello ${name},\n\nYou have been invited to join Vastrams as a ${role}.\n\nLogin Email: ${email}\nTemporary Password: ${temporaryPassword}`

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Welcome to Vastrams — Account Invitation',
    text: textContent,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #00C896; padding-bottom: 12px;">
          <h2 style="color: #00C896; margin: 0 0 4px; font-size: 22px;">Vastrams Account Invitation</h2>
          <p style="color: #64748b; margin: 0; font-size: 13px;">Vendor &amp; Finance Management System</p>
        </div>
        <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">You have been invited to join the <strong>Vastrams</strong> management portal as a <strong>${role}</strong>.</p>
        
        ${inviteLink ? `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteLink}" target="_blank" style="background-color: #00C896; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(0,200,150,0.25);">
            Accept Invitation &amp; Set Password
          </a>
        </div>
        ` : ''}

        <div style="background-color: #f8fafc; padding: 18px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #1e293b;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px; color: #1e293b;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${temporaryPassword}</span></p>
        </div>

        ${inviteLink ? `
        <p style="font-size: 12px; color: #64748b;">Or copy and paste this link into your browser:<br/><a href="${inviteLink}" style="color: #00C896; word-break: break-all;">${inviteLink}</a></p>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you were not expecting this invitation, please contact system administration.</p>
      </div>
    `
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log(`[SMTP] Invitation email sent to ${email}`)
    return info
  } catch (err) {
    console.error(`[SMTP] Failed to send invitation email to ${email}:`, err.message)
    return null
  }
}

module.exports = {
  transporter,
  sendOTPEmail,
  sendInvitationEmail
}
