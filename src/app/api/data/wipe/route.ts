import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const collections = ['suppliers', 'purchases', 'payments', 'banks', 'expenseHeads', 'propertyDetails'];
    
    for (const col of collections) {
      const docs = await db.collection(col).get();
      let batch = db.batch();
      let count = 0;
      for (const doc of docs.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === 490) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wipe error:', error);
    return NextResponse.json({ error: 'Failed to wipe data' }, { status: 500 });
  }
}
