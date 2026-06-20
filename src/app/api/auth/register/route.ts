import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { verifyAuthToken, getUserRole } from '@/lib/auth-helpers';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const decodedToken = await verifyAuthToken(req);
    
    // Verify caller is an admin
    const callerRole = await getUserRole(decodedToken.uid);
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can create users' }, { status: 403 });
    }

    const { email, password, displayName, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
    }

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create the user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
    });

    // Store their role in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      uid: userRecord.uid
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
