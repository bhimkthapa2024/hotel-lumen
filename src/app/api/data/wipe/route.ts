import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data.json');

export async function POST() {
  try {
    const emptyData = {
      propertyDetails: [],
      suppliers: [],
      banks: [],
      expenseHeads: [],
      purchases: [],
      payments: []
    };
    
    await fs.writeFile(dataFilePath, JSON.stringify(emptyData, null, 2));
    
    return NextResponse.json({ success: true, message: 'Data wiped successfully' });
  } catch (error) {
    console.error('Error wiping data:', error);
    return NextResponse.json({ error: 'Failed to wipe data' }, { status: 500 });
  }
}
