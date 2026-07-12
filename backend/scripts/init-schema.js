const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Node version check
const majorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (majorVersion < 18) {
  console.error(`Error: Node.js version 18 or higher is required. Current version: ${process.version}`);
  process.exit(1);
}

async function initSchema() {
  const modelsDir = path.join(__dirname, '../src/models');
  if (!fs.existsSync(modelsDir)) {
    console.error(`Models directory not found at ${modelsDir}`);
    return;
  }

  // Load User model specifically for seeding
  const User = require(path.join(modelsDir, 'User.js'));

  // Load all other models dynamically to register their schemas
  const files = fs.readdirSync(modelsDir);
  for (const file of files) {
    if (file.endsWith('.js') && file !== 'User.js') {
      try {
        require(path.join(modelsDir, file));
      } catch (err) {
        console.error(`Error registering model from file ${file}:`, err.message);
      }
    }
  }

  // Initialize collections for all registered models
  for (const modelName of mongoose.modelNames()) {
    const Model = mongoose.model(modelName);
    try {
      await Model.createCollection();
      console.log(`- Initialized collection for model: ${modelName}`);
    } catch (err) {
      console.error(`Failed to create collection for ${modelName}:`, err.message);
    }
  }

  // Seed default admin user
  console.log('Checking for default admin user...');
  const adminEmail = 'admin@vastrams.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const defaultAdmin = new User({
      name: 'Admin User',
      email: adminEmail,
      passwordHash,
      role: 'Admin', // Matching the case-sensitive schema enum ['Admin', 'Viewer']
      status: 'Active',
      isDefaultCredential: true
    });
    await defaultAdmin.save();
    console.log(`- Seeded default Admin User: ${adminEmail} / Admin@123`);
  } else {
    console.log(`- Default admin user (${adminEmail}) already exists.`);
  }
}

// Allow running directly
if (require.main === module) {
  require('dotenv').config();
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not defined in environment.");
    process.exit(1);
  }
  
  console.log("Connecting to MongoDB...");
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log("Database connected. Starting schema initialization...");
      await initSchema();
      await mongoose.disconnect();
      console.log("Schema initialization complete.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Failed to connect to MongoDB:", err.message);
      process.exit(1);
    });
}

module.exports = initSchema;
