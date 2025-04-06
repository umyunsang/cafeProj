import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'http://116.124.191.174:15026/api';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    console.log('Forwarding request to backend with session ID:', sessionId);
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/cart`, {
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

    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Cookie': `session_id=${sessionId}`
      }
    });
    
    if (!response.ok) {
      console.error('Cart Delete API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니를 비울 수 없습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: '장바구니가 비워졌습니다.' });
  } catch (error) {
    console.error('Cart Delete API Error:', error);
    return NextResponse.json(
      { error: '장바구니를 비울 수 없습니다.' },
      { status: 500 }
    );
  }
} 