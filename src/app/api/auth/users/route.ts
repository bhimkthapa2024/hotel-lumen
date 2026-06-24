import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { verifyAuthToken, getUserRole } from '@/lib/auth-helpers';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyAuthToken(req);
    const role = await getUserRole(decodedToken.uid);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const decodedToken = await verifyAuthToken(req);
    const role = await getUserRole(decodedToken.uid);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid } = await req.json();
    if (uid === decodedToken.uid) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Delete from Firebase Auth
    await getAuth().deleteUser(uid);
    // Delete from Firestore
    await db.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const decodedToken = await verifyAuthToken(req);
    const role = await getUserRole(decodedToken.uid);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { uid, newRole } = await req.json();
    if (!uid || !newRole) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    if (uid === decodedToken.uid) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    await db.collection('users').doc(uid).update({ role: newRole });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
