import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthToken, getUserRole } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyAuthToken(request as any);
    const role = await getUserRole(decodedToken.uid);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const collections = ['suppliers', 'purchases', 'payments', 'banks', 'expenseHeads', 'propertyDetails'];
    const data: any = {};
    
    for (const col of collections) {
      const snap = await db.collection(col).get();
      data[col] = snap.docs.map(doc => doc.data());
    }
    
    const jsonStr = JSON.stringify(data, null, 2);
    
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="hotellumen_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}
