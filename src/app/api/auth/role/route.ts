import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserRole } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyAuthToken(req);
    const role = await getUserRole(decodedToken.uid);
    
    if (!role) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
