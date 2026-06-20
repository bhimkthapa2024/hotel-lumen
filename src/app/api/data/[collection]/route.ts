import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data.json');

async function readData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Return default structure if file doesn't exist
    return { propertyDetails: [], suppliers: [], banks: [], expenseHeads: [], purchases: [], payments: [] };
  }
}

async function writeData(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const data = await readData();
  const collectionData = data[collection] || [];
  return NextResponse.json(collectionData);
}

export async function POST(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await params;
    const body = await request.json();
    const data = await readData();
    
    if (!data[collection]) {
      data[collection] = [];
    }
    
    let newItem: any = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...body
    };

    if (collection === 'purchases') {
      let maxNum = 0;
      for (const p of data[collection]) {
        if (p.pjvNumber && p.pjvNumber.startsWith('PJV-')) {
          const num = parseInt(p.pjvNumber.replace('PJV-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      newItem.pjvNumber = `PJV-${maxNum + 1}`;
    }

    if (collection === 'payments') {
      let maxNum = 0;
      for (const p of data[collection]) {
        if (p.paymentNumber && p.paymentNumber.startsWith('PMT-')) {
          const num = parseInt(p.paymentNumber.replace('PMT-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      newItem.paymentNumber = `PMT-${maxNum + 1}`;
    }
    
    data[collection].push(newItem);
    await writeData(data);
    
    return NextResponse.json(newItem);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await params;
    const body = await request.json();
    const data = await readData();
    
    if (!data[collection]) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    
    const index = data[collection].findIndex((item: any) => item.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    data[collection][index] = { 
      ...data[collection][index], 
      ...body,
      updatedAt: new Date().toISOString()
    };
    await writeData(data);
    
    return NextResponse.json(data[collection][index]);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
