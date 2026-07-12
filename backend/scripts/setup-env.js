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
  const finalEnv = { ...existingEnv };
  const summary = [];

  const isProdEnv = process.env.NODE_ENV === 'production';
  const requiredKeys = ['PORT', 'MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL', 'SETUP_TOKEN_SECRET'];
  if (isProdEnv) {
    requiredKeys.push('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS');
  }
  
  // Check if we can run in silent check-only mode
  if (!forceMode && fs.existsSync(envPath)) {
    const allKeysPresent = requiredKeys.every(k => existingEnv[k] !== undefined && existingEnv[k] !== null && existingEnv[k].trim() !== '');
    if (allKeysPresent) {
      console.log("\x1b[32m%s\x1b[0m", "✓ Environment already configured.");
      process.exit(0);
    }
  }

  console.log(`\x1b[36m%s\x1b[0m`, `=== Vastrams Backend Environment Setup ===`);
  if (isCI) {
    console.log(`[CI/Non-Interactive Mode detected. Skipping prompts and using defaults...]`);
  }

  // 1. PORT
  let portVal = existingEnv['PORT'];
  if (!forceMode && portVal) {
    summary.push({ key: 'PORT', value: portVal, source: 'existing' });
  } else {
    if (isCI) {
      portVal = portVal || '5000';
      summary.push({ key: 'PORT', value: portVal, source: existingEnv['PORT'] ? 'existing' : 'default' });
    } else {
      const promptDefault = portVal || '5000';
      const ans = await askQuestion(`Enter PORT [${promptDefault}]: `);
      portVal = ans || promptDefault;
      summary.push({ key: 'PORT', value: portVal, source: ans ? 'user-provided' : (existingEnv['PORT'] ? 'existing' : 'default') });
    }
  }
  finalEnv['PORT'] = portVal;

  // 2. CLIENT_URL
  let clientUrlVal = existingEnv['CLIENT_URL'];
  if (!forceMode && clientUrlVal) {
    summary.push({ key: 'CLIENT_URL', value: clientUrlVal, source: 'existing' });
  } else {
    if (isCI) {
      clientUrlVal = clientUrlVal || 'http://localhost:5173';
      summary.push({ key: 'CLIENT_URL', value: clientUrlVal, source: existingEnv['CLIENT_URL'] ? 'existing' : 'default' });
    } else {
      const promptDefault = clientUrlVal || 'http://localhost:5173';
      const ans = await askQuestion(`Enter CLIENT_URL [${promptDefault}]: `);
      clientUrlVal = ans || promptDefault;
      summary.push({ key: 'CLIENT_URL', value: clientUrlVal, source: ans ? 'user-provided' : (existingEnv['CLIENT_URL'] ? 'existing' : 'default') });
    }
  }
  finalEnv['CLIENT_URL'] = clientUrlVal;

  // 3. JWT_SECRET
  let jwtSecretVal = existingEnv['JWT_SECRET'];
  if (!forceMode && jwtSecretVal) {
    summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'existing' });
  } else {
    if (isCI) {
      jwtSecretVal = jwtSecretVal || crypto.randomBytes(64).toString('hex');
      summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: existingEnv['JWT_SECRET'] ? 'existing' : 'auto-generated' });
    } else {
      const ans = await askQuestion(`Enter JWT_SECRET (leave empty to auto-generate): `);
      if (ans) {
        jwtSecretVal = ans;
        summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'user-provided' });
      } else if (jwtSecretVal) {
        summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'existing' });
      } else {
        jwtSecretVal = crypto.randomBytes(64).toString('hex');
        summary.push({ key: 'JWT_SECRET', value: jwtSecretVal, source: 'auto-generated' });
      }
    }
  }
  finalEnv['JWT_SECRET'] = jwtSecretVal;

  // 4. JWT_REFRESH_SECRET
  let jwtRefreshSecretVal = existingEnv['JWT_REFRESH_SECRET'];
  if (!forceMode && jwtRefreshSecretVal) {
    summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'existing' });
  } else {
    if (isCI) {
      jwtRefreshSecretVal = jwtRefreshSecretVal || crypto.randomBytes(64).toString('hex');
      summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: existingEnv['JWT_REFRESH_SECRET'] ? 'existing' : 'auto-generated' });
    } else {
      const ans = await askQuestion(`Enter JWT_REFRESH_SECRET (leave empty to auto-generate): `);
      if (ans) {
        jwtRefreshSecretVal = ans;
        summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'user-provided' });
      } else if (jwtRefreshSecretVal) {
        summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'existing' });
      } else {
        jwtRefreshSecretVal = crypto.randomBytes(64).toString('hex');
        summary.push({ key: 'JWT_REFRESH_SECRET', value: jwtRefreshSecretVal, source: 'auto-generated' });
      }
    }
  }
  finalEnv['JWT_REFRESH_SECRET'] = jwtRefreshSecretVal;

  // 5. SETUP_TOKEN_SECRET
  let setupTokenSecretVal = existingEnv['SETUP_TOKEN_SECRET'];
  if (!forceMode && setupTokenSecretVal) {
    summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'existing' });
  } else {
    if (isCI) {
      setupTokenSecretVal = setupTokenSecretVal || crypto.randomBytes(64).toString('hex');
      summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: existingEnv['SETUP_TOKEN_SECRET'] ? 'existing' : 'auto-generated' });
    } else {
      const ans = await askQuestion(`Enter SETUP_TOKEN_SECRET (leave empty to auto-generate): `);
      if (ans) {
        setupTokenSecretVal = ans;
        summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'user-provided' });
      } else if (setupTokenSecretVal) {
        summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'existing' });
      } else {
        setupTokenSecretVal = crypto.randomBytes(64).toString('hex');
        summary.push({ key: 'SETUP_TOKEN_SECRET', value: setupTokenSecretVal, source: 'auto-generated' });
      }
    }
  }
  finalEnv['SETUP_TOKEN_SECRET'] = setupTokenSecretVal;

  // 6. MONGO_URI
  let mongoUriVal = existingEnv['MONGO_URI'];
  if (!forceMode && mongoUriVal) {
    summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'existing' });
  } else {
    let mongoose;
    try {
      mongoose = require('mongoose');
    } catch (err) {
      console.error("Mongoose dependency missing. Please run 'npm install' first.");
      process.exit(1);
    }

    if (isCI) {
      if (!mongoUriVal) {
        console.error("\x1b[31mError: MONGO_URI is missing in environment and cannot be prompted in CI mode.\x1b[0m");
        process.exit(1);
      }
      console.log("Validating MONGO_URI from environment...");
      try {
        await mongoose.connect(mongoUriVal, { serverSelectionTimeoutMS: 5000 });
        console.log("Database connected successfully.");
        const collections = await mongoose.connection.db.listCollections().toArray();
        if (collections.length === 0) {
          console.log("CI Mode: Empty database detected. Auto-initializing schema...");
          const initSchema = require('./init-schema');
          await initSchema();
          console.log("Database schema initialized successfully.");
        }
        await mongoose.disconnect();
      } catch (err) {
        console.error(`\x1b[31mDatabase connection failed: ${err.message}\x1b[0m`);
        process.exit(1);
      }
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: 'existing' });
    } else {
      // Interactive validation loop
      let isConnected = false;
      while (!isConnected) {
        const defaultUriMsg = mongoUriVal ? ` [${mongoUriVal}]` : '';
        const promptUri = await askQuestion(`Enter MONGO_URI${defaultUriMsg}: `);
        const uriToUse = promptUri || mongoUriVal;

        if (!uriToUse) {
          console.log("\x1b[31mError: MONGO_URI is required. Please provide a connection string.\x1b[0m");
          continue;
        }

        console.log("Validating connection to MongoDB...");
        try {
          await mongoose.connect(uriToUse, { serverSelectionTimeoutMS: 5000 });
          console.log("\x1b[32m%s\x1b[0m", "Connected to MongoDB successfully!");
          isConnected = true;
          mongoUriVal = uriToUse;

          // Check if database is empty
          const collections = await mongoose.connection.db.listCollections().toArray();
          if (collections.length === 0) {
            const initAns = await askQuestion("No collections found. Initialize default Vastrams schema (Vendors, Payments, Cheques, Financiers, Users...) [Y/n]: ");
            if (initAns.toLowerCase() !== 'n') {
              console.log("Initializing database schema...");
              const initSchema = require('./init-schema');
              await initSchema();
              console.log("\x1b[32m%s\x1b[0m", "Database schema initialized successfully!");
            }
          } else {
            const names = collections.map(c => c.name).join(', ');
            console.log(`Found existing collections: ${names}. Skipping schema initialization.`);
          }
          await mongoose.disconnect();
        } catch (err) {
          console.error(`\x1b[31mConnection failed: ${err.message}\x1b[0m`);
          console.log("Please check if the URI is correct and your MongoDB instance is running.");
        }
      }
      summary.push({ key: 'MONGO_URI', value: mongoUriVal, source: existingEnv['MONGO_URI'] === mongoUriVal ? 'existing' : 'user-provided' });
    }
  }
  finalEnv['MONGO_URI'] = mongoUriVal;

  // SMTP prompts (Production only)
  if (isProdEnv) {
    // 7. SMTP_HOST
    let smtpHostVal = existingEnv['SMTP_HOST'];
    if (!forceMode && smtpHostVal) {
      summary.push({ key: 'SMTP_HOST', value: smtpHostVal, source: 'existing' });
    } else {
      if (isCI) {
        if (!smtpHostVal) {
          console.error("\x1b[31mError: SMTP_HOST is missing and cannot be prompted in CI mode.\x1b[0m");
          process.exit(1);
        }
        summary.push({ key: 'SMTP_HOST', value: smtpHostVal, source: 'existing' });
      } else {
        while (!smtpHostVal) {
          smtpHostVal = await askQuestion(`Enter SMTP_HOST (required for production): `);
        }
        summary.push({ key: 'SMTP_HOST', value: smtpHostVal, source: 'user-provided' });
      }
    }
    finalEnv['SMTP_HOST'] = smtpHostVal;

    // 8. SMTP_PORT
    let smtpPortVal = existingEnv['SMTP_PORT'];
    if (!forceMode && smtpPortVal) {
      summary.push({ key: 'SMTP_PORT', value: smtpPortVal, source: 'existing' });
    } else {
      if (isCI) {
        smtpPortVal = smtpPortVal || '587';
        summary.push({ key: 'SMTP_PORT', value: smtpPortVal, source: 'default' });
      } else {
        const promptDefault = smtpPortVal || '587';
        const ans = await askQuestion(`Enter SMTP_PORT [${promptDefault}]: `);
        smtpPortVal = ans || promptDefault;
        summary.push({ key: 'SMTP_PORT', value: smtpPortVal, source: ans ? 'user-provided' : 'default' });
      }
    }
    finalEnv['SMTP_PORT'] = smtpPortVal;

    // 9. SMTP_USER
    let smtpUserVal = existingEnv['SMTP_USER'];
    if (!forceMode && smtpUserVal) {
      summary.push({ key: 'SMTP_USER', value: smtpUserVal, source: 'existing' });
    } else {
      if (isCI) {
        if (!smtpUserVal) {
          console.error("\x1b[31mError: SMTP_USER is missing and cannot be prompted in CI mode.\x1b[0m");
          process.exit(1);
        }
        summary.push({ key: 'SMTP_USER', value: smtpUserVal, source: 'existing' });
      } else {
        while (!smtpUserVal) {
          smtpUserVal = await askQuestion(`Enter SMTP_USER (required for production): `);
        }
        summary.push({ key: 'SMTP_USER', value: smtpUserVal, source: 'user-provided' });
      }
    }
    finalEnv['SMTP_USER'] = smtpUserVal;

    // 10. SMTP_PASS
    let smtpPassVal = existingEnv['SMTP_PASS'];
    if (!forceMode && smtpPassVal) {
      summary.push({ key: 'SMTP_PASS', value: smtpPassVal, source: 'existing' });
    } else {
      if (isCI) {
        if (!smtpPassVal) {
          console.error("\x1b[31mError: SMTP_PASS is missing and cannot be prompted in CI mode.\x1b[0m");
          process.exit(1);
        }
        summary.push({ key: 'SMTP_PASS', value: smtpPassVal, source: 'existing' });
      } else {
        while (!smtpPassVal) {
          smtpPassVal = await askQuestion(`Enter SMTP_PASS (required for production): `);
        }
        summary.push({ key: 'SMTP_PASS', value: smtpPassVal, source: 'user-provided' });
      }
    }
    finalEnv['SMTP_PASS'] = smtpPassVal;
  } else {
    // Dev mode SMTP note
    summary.push({ key: 'SMTP', value: 'Ethereal (dev)', source: 'default' });
  }

  // Print Summary Table
  printSummaryTable(summary);

  // Write merged variables back to .env
  let envString = '';
  // Keep original lines that aren't the ones we managed, but write managed ones nicely
  const managedKeys = new Set(requiredKeys);
  
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        envString += line + '\n';
      } else {
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals !== -1) {
          const key = trimmed.substring(0, firstEquals).trim();
          if (!managedKeys.has(key)) {
            envString += line + '\n';
          }
        } else {
          envString += line + '\n';
        }
      }
    });
  }

  // Now append managed keys
  envString += '\n# Generated / Managed by setup-env.js\n';
  requiredKeys.forEach(key => {
    if (finalEnv[key] !== undefined) {
      envString += `${key}=${finalEnv[key]}\n`;
    }
  });

  fs.writeFileSync(envPath, envString.trim() + '\n', 'utf-8');
  console.log(`\x1b[32m%s\x1b[0m`, `SUCCESS: Backend environment file configured successfully at backend/.env!\n`);
}

run().catch(err => {
  console.error("Setup script failed:", err);
  process.exit(1);
});
