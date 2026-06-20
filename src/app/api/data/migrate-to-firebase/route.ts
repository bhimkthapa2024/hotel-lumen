import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const dataFilePath = path.join(process.cwd(), 'data.json');
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ error: 'data.json not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Collections we want to migrate
    const collections = [
      'suppliers',
      'purchases',
      'payments',
      'banks',
      'expenseHeads',
      'propertyDetails',
      'users'
    ];

    let totalMigrated = 0;

    for (const collectionName of collections) {
      if (data[collectionName] && Array.isArray(data[collectionName])) {
        const items = data[collectionName];
        
        // Use a batch to write documents (up to 500 per batch)
        let batch = db.batch();
        let count = 0;

        for (const item of items) {
          if (!item.id) continue;
          
          const docRef = db.collection(collectionName).doc(item.id);
          batch.set(docRef, item);
          count++;
          totalMigrated++;

          if (count === 490) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
      }
    }

    return NextResponse.json({ success: true, message: `Migrated ${totalMigrated} total records to Firestore.` });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
