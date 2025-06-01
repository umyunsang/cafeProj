import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    console.log('Forwarding request to backend with session ID:', sessionId);
    
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Cookie': `session_id=${sessionId}`
      }
    });

    if (!response.ok) {
      console.error('Cart API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니를 불러올 수 없습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart API Error:', error);
    return NextResponse.json(
      { error: '장바구니를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    console.log('Clearing cart with session ID:', sessionId);
    
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Cookie': `session_id=${sessionId}`
      }
    });

    if (!response.ok) {
      console.error('Cart API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니를 비울 수 없습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: '장바구니가 비워졌습니다.' });
  } catch (error) {
    console.error('Cart API Error:', error);
    return NextResponse.json(
      { error: '장바구니를 비울 수 없습니다.' },
      { status: 500 }
    );
  }
} 