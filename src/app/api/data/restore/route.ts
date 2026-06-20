import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data.json');

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let parsedData;
    
    // Basic validation to ensure it's a valid JSON with expected keys
    try {
      parsedData = JSON.parse(rawBody);
      if (!parsedData.suppliers || !parsedData.purchases) {
        throw new Error('Invalid backup format');
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Overwrite the existing data.json
    fs.writeFileSync(dataFilePath, JSON.stringify(parsedData, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
