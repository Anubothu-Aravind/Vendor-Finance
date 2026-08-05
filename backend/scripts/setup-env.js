const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// Node version check at startup
const majorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (majorVersion < 18) {
  console.error(`Error: Node.js version 18 or higher is required. Current version: ${process.version}`);
  process.exit(1);
}

const envPath = path.join(__dirname, '../.env');
const forceMode = process.argv.includes('--force');
const isCI = !process.stdin.isTTY;

// Helper to ask standard text questions
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

// Helper to ask masked password questions
function askQuestionPassword(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    process.stdout.write(query);

    let muted = false;
    const oldWrite = rl._writeToOutput;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (muted) {
        if (stringToWrite === '\r\n' || stringToWrite === '\n') {
          process.stdout.write('\n');
        } else {
          process.stdout.write('*');
        }
      } else {
        oldWrite.call(rl, stringToWrite);
      }
    };

    muted = true;
    rl.question('', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Custom dotenv parser
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEquals = trimmed.indexOf('=');
      if (firstEquals !== -1) {
        const key = trimmed.substring(0, firstEquals).trim();
        let val = trimmed.substring(firstEquals + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  });
  return env;
}

// Print ASCII summary table
function printSummaryTable(data) {
  console.log('\n=== Environment Configuration Summary ===');
  console.log('┌' + '─'.repeat(22) + '┬' + '─'.repeat(42) + '┬' + '─'.repeat(16) + '┐');
  console.log('│ ' + 'Key'.padEnd(20) + ' │ ' + 'Value'.padEnd(40) + ' │ ' + 'Source'.padEnd(14) + ' │');
  console.log('├' + '─'.repeat(22) + '┼' + '─'.repeat(42) + '┼' + '─'.repeat(16) + '┤');
  for (const row of data) {
    const keyStr = row.key.padEnd(20);
    let valStr = row.value || '';
    if (valStr.length > 37) {
      valStr = valStr.substring(0, 37) + '...';
    }
    valStr = valStr.padEnd(40);
    const srcStr = row.source.padEnd(14);
    console.log(`│ ${keyStr} │ ${valStr} │ ${srcStr} │`);
  }
  console.log('└' + '─'.repeat(22) + '┴' + '─'.repeat(42) + '┴' + '─'.repeat(16) + '┘\n');
}

async function run() {
  const existingEnv = parseEnv(envPath);
  
  // Merge provider-injected process.env settings if available
  const requiredKeys = [
    'PORT', 'MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET',
    'CLIENT_URL', 'SETUP_TOKEN_SECRET',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'
  ];
  requiredKeys.forEach(key => {
    if (process.env[key] !== undefined && process.env[key] !== null && process.env[key].trim() !== '') {
      existingEnv[key] = process.env[key];
    }
  });

  const finalEnv = { ...existingEnv };
  const summary = [];
  
  // Check if all required keys exist and are non-empty
  const hasAllKeys = requiredKeys.every(k => existingEnv[k] !== undefined && existingEnv[k] !== null && existingEnv[k].trim() !== '');

  if (!forceMode && fs.existsSync(envPath) && hasAllKeys) {
    console.log("\x1b[32m%s\x1b[0m", "✓ Environment credentials verified & active.");
    process.exit(0);
  }

  console.log(`\x1b[36m%s\x1b[0m`, `=== Vastrams Backend Interactive Environment Setup ===`);
  if (isCI) {
    console.log(`[CI/Non-Interactive Mode detected. Using defaults and environment variables...]`);
  }

  // 1. PORT
  let portVal = existingEnv['PORT'] || '5001';
  finalEnv['PORT'] = portVal;
  summary.push({ key: 'PORT', value: portVal, source: existingEnv['PORT'] ? 'existing' : 'default' });

  // 2. CLIENT_URL
  let clientUrlVal = existingEnv['CLIENT_URL'] || 'http://localhost:3000';
  finalEnv['CLIENT_URL'] = clientUrlVal;
  summary.push({ key: 'CLIENT_URL', value: clientUrlVal, source: existingEnv['CLIENT_URL'] ? 'existing' : 'default' });

  // 3. JWT_SECRET
  let jwtSecretVal = existingEnv['JWT_SECRET'];
  if (!jwtSecretVal || jwtSecretVal.length < 16) {
    jwtSecretVal = crypto.randomBytes(64).toString('hex');
    summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'auto-generated' });
  } else {
    summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'existing' });
  }
  finalEnv['JWT_SECRET'] = jwtSecretVal;

  // 4. JWT_REFRESH_SECRET
  let jwtRefreshSecretVal = existingEnv['JWT_REFRESH_SECRET'];
  if (!jwtRefreshSecretVal || jwtRefreshSecretVal.length < 16) {
    jwtRefreshSecretVal = crypto.randomBytes(64).toString('hex');
    summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'auto-generated' });
  } else {
    summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'existing' });
  }
  finalEnv['JWT_REFRESH_SECRET'] = jwtRefreshSecretVal;

  // 5. SETUP_TOKEN_SECRET
  let setupTokenSecretVal = existingEnv['SETUP_TOKEN_SECRET'];
  if (!setupTokenSecretVal || setupTokenSecretVal.length < 16) {
    setupTokenSecretVal = crypto.randomBytes(64).toString('hex');
    summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'auto-generated' });
  } else {
    summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'existing' });
  }
  finalEnv['SETUP_TOKEN_SECRET'] = setupTokenSecretVal;

  // 6. MONGO_URI Verification & Interactive Prompt
  let mongoUriVal = existingEnv['MONGO_URI'];
  let mongoose;
  try {
    mongoose = require('mongoose');
  } catch (err) {
    console.error("Mongoose dependency missing. Please run 'npm install' first.");
    process.exit(1);
  }

  if (mongoUriVal && !forceMode) {
    console.log("Validating MONGO_URI connection string...");
    try {
      await mongoose.connect(mongoUriVal, { serverSelectionTimeoutMS: 5000 });
      console.log("\x1b[32m%s\x1b[0m", "✓ Connected to MongoDB database successfully!");
      await mongoose.disconnect();
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'verified' });
    } catch (err) {
      console.error(`\x1b[31m⚠️ MONGO_URI Connection failed: ${err.message}\x1b[0m`);
      if (isCI) process.exit(1);
      let isConnected = false;
      while (!isConnected) {
        const promptUri = await askQuestion(`Enter valid MONGO_URI [${mongoUriVal}]: `);
        const uriToUse = promptUri || mongoUriVal;
        try {
          await mongoose.connect(uriToUse, { serverSelectionTimeoutMS: 5000 });
          console.log("\x1b[32m%s\x1b[0m", "✓ Connected to MongoDB database successfully!");
          isConnected = true;
          mongoUriVal = uriToUse;
          await mongoose.disconnect();
        } catch (connErr) {
          console.error(`\x1b[31mConnection failed: ${connErr.message}\x1b[0m`);
        }
      }
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'user-validated' });
    }
  } else {
    if (isCI) {
      if (!mongoUriVal) {
        console.error("\x1b[31mError: MONGO_URI is missing in environment.\x1b[0m");
        process.exit(1);
      }
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'ci-default' });
    } else {
      let isConnected = false;
      while (!isConnected) {
        const promptDefault = mongoUriVal ? ` [${mongoUriVal}]` : '';
        const promptUri = await askQuestion(`Enter MONGO_URI${promptDefault}: `);
        const uriToUse = promptUri || mongoUriVal;
        if (!uriToUse) {
          console.log("\x1b[31mError: MONGO_URI is required.\x1b[0m");
          continue;
        }
        try {
          await mongoose.connect(uriToUse, { serverSelectionTimeoutMS: 5000 });
          console.log("\x1b[32m%s\x1b[0m", "✓ Connected to MongoDB database successfully!");
          isConnected = true;
          mongoUriVal = uriToUse;
          await mongoose.disconnect();
        } catch (err) {
          console.error(`\x1b[31mConnection failed: ${err.message}\x1b[0m`);
        }
      }
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'user-validated' });
    }
  }
  finalEnv['MONGO_URI'] = mongoUriVal;

  // 7. Interactive SMTP Credentials Setup (Right after MONGO_URI)
  console.log(`\n\x1b[36m%s\x1b[0m`, `--- SMTP Email Server Setup ---`);

  let smtpHostVal = existingEnv['SMTP_HOST'];
  let smtpPortVal = existingEnv['SMTP_PORT'];
  let smtpUserVal = existingEnv['SMTP_USER'];
  let smtpPassVal = existingEnv['SMTP_PASS'];
  let smtpFromVal = existingEnv['SMTP_FROM'];

  if (!isCI) {
    // 7.1 SMTP_HOST
    const hostDefault = smtpHostVal || 'smtp.gmail.com';
    const ansHost = await askQuestion(`Enter SMTP_HOST (e.g. smtp.gmail.com) [default: ${hostDefault}]: `);
    smtpHostVal = ansHost || hostDefault;

    // 7.2 SMTP_PORT
    const portDefault = smtpPortVal || '587';
    const ansPort = await askQuestion(`Enter SMTP_PORT (e.g. 587 or 465) [default: ${portDefault}]: `);
    smtpPortVal = ansPort || portDefault;

    // 7.3 SMTP_USER (required, re-prompt if empty)
    while (!smtpUserVal) {
      smtpUserVal = await askQuestion(`Enter SMTP_USER (your email address): `);
      if (!smtpUserVal) {
        console.log("\x1b[31mSMTP_USER is required.\x1b[0m");
      }
    }

    // 7.4 SMTP_PASS (required, masked input, re-prompt if empty)
    while (!smtpPassVal) {
      smtpPassVal = await askQuestionPassword(`Enter SMTP_PASS (app password, not your login password): `);
      if (!smtpPassVal) {
        console.log("\x1b[31mSMTP_PASS is required.\x1b[0m");
      }
    }

    // 7.5 SMTP_FROM
    const fromDefault = smtpFromVal || `"Vastrams" <${smtpUserVal}>`;
    const ansFrom = await askQuestion(`Enter SMTP_FROM (display name + email, e.g. Vastrams <noreply@vastrams.in>) [default: ${fromDefault}]: `);
    smtpFromVal = ansFrom || fromDefault;
  } else {
    smtpHostVal = smtpHostVal || 'smtp.gmail.com';
    smtpPortVal = smtpPortVal || '587';
    smtpUserVal = smtpUserVal || 'noreply@vastrams.in';
    smtpPassVal = smtpPassVal || '';
    smtpFromVal = smtpFromVal || `"Vastrams" <${smtpUserVal}>`;
  }

  const smtpSecureVal = smtpPortVal === '465' ? 'true' : 'false';

  finalEnv['SMTP_HOST']   = smtpHostVal;
  finalEnv['SMTP_PORT']   = smtpPortVal;
  finalEnv['SMTP_SECURE'] = smtpSecureVal;
  finalEnv['SMTP_USER']   = smtpUserVal;
  finalEnv['SMTP_PASS']   = smtpPassVal;
  finalEnv['SMTP_FROM']   = smtpFromVal;

  summary.push({ key: 'SMTP_HOST', value: smtpHostVal, source: 'configured' });
  summary.push({ key: 'SMTP_PORT', value: smtpPortVal, source: 'configured' });
  summary.push({ key: 'SMTP_USER', value: smtpUserVal, source: 'configured' });
  summary.push({ key: 'SMTP_FROM', value: smtpFromVal, source: 'configured' });

  // 7.6 Verify SMTP Connection using transporter.verify()
  let smtpStatus = 'Not tested';
  if (smtpUserVal && smtpPassVal) {
    console.log("Verifying SMTP connection credentials...");
    try {
      const nodemailer = require('nodemailer');
      const testTransporter = nodemailer.createTransport({
        host: smtpHostVal,
        port: parseInt(smtpPortVal, 10),
        secure: smtpSecureVal === 'true',
        auth: { user: smtpUserVal, pass: smtpPassVal }
      });
      await testTransporter.verify();
      console.log('\x1b[32m%s\x1b[0m', '✓ SMTP connection verified successfully!');
      smtpStatus = 'Verified ✓';
    } catch (err) {
      console.warn('\x1b[33m%s\x1b[0m', `⚠️ SMTP Verification failed: ${err.message}`);
      console.warn('\x1b[33m%s\x1b[0m', 'Saving SMTP credentials to .env so you can fix them later.');
      smtpStatus = 'Failed ✗';
    }
  }

  summary.push({ key: 'SMTP Status', value: smtpStatus, source: 'connection-verify' });

  // Print Summary Table
  printSummaryTable(summary);

  // Write merged & verified variables back to .env
  let envString = '# Vastrams Backend Environment Configuration\n';
  requiredKeys.forEach(key => {
    if (finalEnv[key] !== undefined) {
      envString += `${key}=${finalEnv[key]}\n`;
    }
  });

  fs.writeFileSync(envPath, envString.trim() + '\n', 'utf-8');
  console.log(`\x1b[32m%s\x1b[0m`, `SUCCESS: Backend environment credentials verified and saved at backend/.env!\n`);
}

run().catch(err => {
  console.error("Setup script failed:", err);
  process.exit(1);
});
