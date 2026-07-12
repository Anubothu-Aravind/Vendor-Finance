const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const mongoose = require('mongoose');

// Node version check at startup
const majorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (majorVersion < 18) {
  console.error(`Error: Node.js version 18 or higher is required. Current version: ${process.version}`);
  process.exit(1);
}

// Load env variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("Error: MONGO_URI is not defined in backend/.env file.");
  process.exit(1);
}

const User = require('../src/models/User');
const { sendOTPEmail } = require('../src/utils/mailer');

// Helper to ask questions
function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Generate OTP
function generateOTP() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('');
}

async function run() {
  console.log(`\x1b[36m%s\x1b[0m`, `=== Vastrams Terminal Admin Setup Wizard ===`);
  
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoUri);
    console.log("Database connected successfully.\n");
  } catch (err) {
    console.error(`\x1b[31mDatabase connection failed: ${err.message}\x1b[0m`);
    process.exit(1);
  }

  // Find user requiring setup
  const user = await User.findOne({ isDefaultCredential: true });
  if (!user) {
    console.log(`\x1b[32m%s\x1b[0m`, `✓ Admin credentials have already been updated. No setup required.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found default admin account: ${user.email}`);
  
  // Step 1: Email Address
  let newEmail = '';
  let emailValid = false;
  while (!emailValid) {
    newEmail = await askQuestion("Enter new Admin Email: ");
    if (!newEmail || !newEmail.includes('@')) {
      console.log("\x1b[31mInvalid email address. Please try again.\x1b[0m");
      continue;
    }
    
    // Check duplicates
    const duplicate = await User.findOne({ email: newEmail.toLowerCase() });
    if (duplicate && duplicate._id.toString() !== user._id.toString()) {
      console.log("\x1b[31mThis email address is already in use. Please enter a different one.\x1b[0m");
      continue;
    }
    
    emailValid = true;
  }

  // Step 2: OTP Verification
  const otp = generateOTP();
  console.log(`Sending OTP code to ${newEmail}...`);
  try {
    await sendOTPEmail(newEmail.toLowerCase(), otp);
  } catch (err) {
    console.error(`\x1b[31mFailed to send OTP email: ${err.message}\x1b[0m`);
    console.log(`\x1b[33mDev Override: Use OTP code directly from here: ${otp}\x1b[0m`);
  }

  let verified = false;
  let attempts = 0;
  while (!verified) {
    const enteredOtp = await askQuestion("Enter the 6-character OTP (case-insensitive): ");
    attempts++;
    
    if (enteredOtp.toUpperCase().trim() === otp) {
      console.log("\x1b[32m✓ Email verified successfully!\x1b[0m\n");
      verified = true;
    } else {
      if (attempts >= 3) {
        console.error("\x1b[31mToo many invalid OTP attempts. Exiting setup.\x1b[0m");
        await mongoose.disconnect();
        process.exit(1);
      }
      console.log(`\x1b[31mInvalid OTP. ${3 - attempts} attempts remaining.\x1b[0m`);
    }
  }

  // Step 3: Password Configuration
  let password = '';
  let passwordValid = false;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  while (!passwordValid) {
    password = await askQuestion("Enter new Password: ");
    const confirmPassword = await askQuestion("Confirm new Password: ");
    
    if (password !== confirmPassword) {
      console.log("\x1b[31mPasswords do not match. Please try again.\x1b[0m");
      continue;
    }
    
    if (!passwordRegex.test(password)) {
      console.log("\x1b[31mError: Password does not meet requirements:\x1b[0m");
      console.log("- Must be at least 8 characters long");
      console.log("- Must contain at least 1 uppercase letter");
      console.log("- Must contain at least 1 numerical digit");
      console.log("- Must contain at least 1 special character (@$!%*?&)");
      continue;
    }
    
    passwordValid = true;
  }

  // Save changes
  console.log("Saving changes to database...");
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    user.email = newEmail.toLowerCase();
    user.passwordHash = passwordHash;
    user.isDefaultCredential = false;
    await user.save();
    
    console.log(`\x1b[32m%s\x1b[0m`, `\nSUCCESS: Admin credentials updated successfully!`);
    console.log(`New Email: ${user.email}`);
  } catch (err) {
    console.error(`\x1b[31mFailed to save user: ${err.message}\x1b[0m`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Setup wizard failed:", err);
  process.exit(1);
});
