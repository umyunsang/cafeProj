import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('주문 ?�성 �??�류 발생:', error);
    return NextResponse.json({ error: '주문???�성?????�습?�다.' }, { status: 500 });
  }
} 
