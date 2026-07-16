const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const baseUri = process.env.MONGO_URI;
if (!baseUri) {
  console.error("MONGO_URI not defined in environment");
  process.exit(1);
}

const collections = [
  'vendors', 
  'bills', 
  'payments', 
  'financiers', 
  'loans', 
  'repayments', 
  'cheques', 
  'transactions', 
  'notifications'
];

async function run() {
  const mode = process.argv[2];
  console.log(`Connecting to database...`);
  await mongoose.connect(baseUri);
  console.log(`Connected to database.`);

  const backupPath = path.join(__dirname, '../db_backup.json');

  if (mode === 'backup') {
    console.log(`Backing up collections...`);
    const backupData = {};
    for (const colName of collections) {
      const docs = await mongoose.connection.db.collection(colName).find({}).toArray();
      backupData[colName] = docs;
      console.log(`Backed up ${docs.length} docs from ${colName}`);
    }
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`Backup saved to ${backupPath}`);
  } else if (mode === 'clear') {
    console.log(`Clearing collections...`);
    for (const colName of collections) {
      const result = await mongoose.connection.db.collection(colName).deleteMany({});
      console.log(`Cleared ${result.deletedCount} docs from ${colName}`);
    }
    console.log(`Collections cleared.`);
  } else if (mode === 'restore') {
    console.log(`Restoring collections...`);
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file not found at ${backupPath}`);
      process.exit(1);
    }
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    for (const colName of collections) {
      // Clear existing first
      await mongoose.connection.db.collection(colName).deleteMany({});
      const docs = backupData[colName] || [];
      if (docs.length > 0) {
        // Convert string IDs back to ObjectId if needed, or insert as is
        const mappedDocs = docs.map(doc => {
          if (doc._id) doc._id = new mongoose.Types.ObjectId(doc._id);
          if (doc.vendorId) doc.vendorId = new mongoose.Types.ObjectId(doc.vendorId);
          if (doc.financierId) doc.financierId = new mongoose.Types.ObjectId(doc.financierId);
          if (doc.chequeId) doc.chequeId = new mongoose.Types.ObjectId(doc.chequeId);
          if (doc.loanId) doc.loanId = new mongoose.Types.ObjectId(doc.loanId);
          if (doc.referenceId) doc.referenceId = new mongoose.Types.ObjectId(doc.referenceId);
          if (doc.userId) doc.userId = new mongoose.Types.ObjectId(doc.userId);
          // Convert dates
          for (const key of Object.keys(doc)) {
            if (typeof doc[key] === 'string' && doc[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              doc[key] = new Date(doc[key]);
            }
          }
          return doc;
        });
        await mongoose.connection.db.collection(colName).insertMany(mappedDocs);
        console.log(`Restored ${docs.length} docs to ${colName}`);
      } else {
        console.log(`No docs to restore for ${colName}`);
      }
    }
    console.log(`Restore completed successfully.`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
