import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Check if any users exist in the database
    const usersSnapshot = await db.collection('users').limit(1).get();
    if (!usersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Setup already completed. Users exist in the system.' },
        { status: 403 }
      );
    }

    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create the user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: displayName || 'Admin User',
    });

    // Store their role as admin in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Initial admin user created successfully',
      uid: userRecord.uid
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
