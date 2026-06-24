import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken, getUserRole } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const decodedToken = await verifyAuthToken(request as any);

    const rawBody = await request.text();
    let parsedData;
    try {
      parsedData = JSON.parse(rawBody);
      if (!parsedData.suppliers || !parsedData.purchases) {
        throw new Error('Invalid backup format');
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    const collections = ['suppliers', 'purchases', 'payments', 'banks', 'expenseHeads', 'propertyDetails'];

    for (const col of collections) {
      const existingDocs = await db.collection(col).get();
      let deleteBatch = db.batch();
      let deleteCount = 0;
      for (const doc of existingDocs.docs) {
        deleteBatch.delete(doc.ref);
        deleteCount++;
        if (deleteCount === 490) {
          await deleteBatch.commit();
          deleteBatch = db.batch();
          deleteCount = 0;
        }
      }
      if (deleteCount > 0) await deleteBatch.commit();

      if (parsedData[col] && Array.isArray(parsedData[col])) {
        let insertBatch = db.batch();
        let insertCount = 0;
        for (const item of parsedData[col]) {
          if (!item.id) continue;
          insertBatch.set(db.collection(col).doc(item.id), item);
          insertCount++;
          if (insertCount === 490) {
            await insertBatch.commit();
            insertBatch = db.batch();
            insertCount = 0;
          }
        }
        if (insertCount > 0) await insertBatch.commit();
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
