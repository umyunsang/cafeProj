import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15026';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Adding item to cart:', body);
    
    const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Cookie': `session_id=${sessionId}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Cart Items API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니에 항목을 추가할 수 없습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart Items API Error:', error);
    return NextResponse.json(
      { error: '장바구니에 항목을 추가할 수 없습니다.' },
      { status: 500 }
    );
  }
} 