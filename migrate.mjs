import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const collections = ['suppliers', 'purchases', 'payments', 'banks', 'expenseHeads', 'propertyDetails', 'users'];

async function migrate() {
  console.log('Starting migration to Firebase Firestore...');
  for (const col of collections) {
    if (data[col] && Array.isArray(data[col])) {
      let count = 0;
      for (const item of data[col]) {
        if (!item.id) continue;
        await db.collection(col).doc(item.id).set(item);
        count++;
      }
      console.log(`Migrated ${count} items to collection '${col}'`);
    } else {
      console.log(`No items found for collection '${col}', or it's not an array.`);
    }
  }
  console.log('Migration complete!');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
