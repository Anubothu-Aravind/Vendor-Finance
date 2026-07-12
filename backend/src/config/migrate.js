const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const baseUri = process.env.MONGO_URI;

if (!baseUri) {
  console.error("FATAL ERROR: MONGO_URI is not defined in environment! Please configure it in backend/.env");
  process.exit(1);
}

function getDbUri(base, dbName) {
  try {
    const urlObj = new URL(base);
    urlObj.pathname = `/${dbName}`;
    return urlObj.toString();
  } catch (err) {
    // Fallback if URL parsing fails
    if (base.includes('/test')) {
      return base.replace('/test', `/${dbName}`);
    } else if (base.includes('/vastrams')) {
      return base.replace('/vastrams', `/${dbName}`);
    }
    return base;
  }
}

const uriTest = getDbUri(baseUri, 'test');
const uriVastrams = getDbUri(baseUri, 'vastrams');

async function migrate() {
  console.log('Starting migration from test to vastrams...');
  
  const connTest = await mongoose.createConnection(uriTest).asPromise();
  console.log('Connected to test database');
  
  const connVastrams = await mongoose.createConnection(uriVastrams).asPromise();
  console.log('Connected to vastrams database');

  const collections = [
    'users', 
    'settings', 
    'vendors', 
    'financiers', 
    'loans', 
    'bills', 
    'payments', 
    'repayments', 
    'cheques', 
    'transactions'
  ];

  for (const colName of collections) {
    const colTest = connTest.collection(colName);
    const colVastrams = connVastrams.collection(colName);

    const docs = await colTest.find({}).toArray();
    console.log(`Found ${docs.length} documents in test.${colName}`);

    if (docs.length > 0) {
      // Clear existing records in vastrams first to avoid unique key conflicts or duplicates
      await colVastrams.deleteMany({});
      
      // Insert the documents exactly as they are (preserving _id, etc.)
      await colVastrams.insertMany(docs);
      console.log(`Successfully migrated ${docs.length} documents to vastrams.${colName}`);
    } else {
      console.log(`No documents found in test.${colName}, skipped.`);
    }
  }

  await connTest.close();
  await connVastrams.close();
  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
