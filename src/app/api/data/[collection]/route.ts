import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await params;
    const snapshot = await db.collection(collection).get();
    const data = snapshot.docs.map(doc => doc.data());
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await params;
    const body = await request.json();
    
    let newItem: any = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...body
    };

    if (collection === 'purchases') {
      const snapshot = await db.collection(collection).get();
      let maxNum = 0;
      snapshot.forEach(doc => {
        const p = doc.data();
        if (p.pjvNumber && p.pjvNumber.startsWith('PJV-')) {
          const num = parseInt(p.pjvNumber.replace('PJV-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      newItem.pjvNumber = `PJV-${maxNum + 1}`;
    }

    if (collection === 'payments') {
      const snapshot = await db.collection(collection).get();
      let maxNum = 0;
      snapshot.forEach(doc => {
        const p = doc.data();
        if (p.paymentNumber && p.paymentNumber.startsWith('PMT-')) {
          const num = parseInt(p.paymentNumber.replace('PMT-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      newItem.paymentNumber = `PMT-${maxNum + 1}`;
    }

    await db.collection(collection).doc(newItem.id).set(newItem);
    
    return NextResponse.json(newItem);
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await params;
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }
    
    const docRef = db.collection(collection).doc(body.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    const updatedData = { 
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    // Only update fields that exist in updatedData
    await docRef.update(updatedData);
    
    const finalData = { ...docSnap.data(), ...updatedData };
    return NextResponse.json(finalData);
  } catch (e) {
    console.error('PUT error:', e);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
