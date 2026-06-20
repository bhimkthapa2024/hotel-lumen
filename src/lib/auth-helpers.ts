import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from './firebase-admin';

export async function verifyAuthToken(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid token');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Unauthorized: Invalid token');
  }
}

export async function getUserRole(uid: string): Promise<'admin' | 'user' | null> {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return doc.data()?.role as 'admin' | 'user';
}
