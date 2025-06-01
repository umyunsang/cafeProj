import { NextRequest, NextResponse } from 'next/server';

// 백엔드 서버 URL (환경변수에서 가져오거나 기본값 사용)
const BACKEND_URL = process.env.BACKEND_URL || 'https://cafe-backend-jv0t.onrender.com';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-ID') || request.cookies.get('session_id')?.value;
    console.log('Forwarding cart GET request to backend with session ID:', sessionId);
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error('Cart API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니를 불러오는데 실패했습니다.' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Cart data received from backend:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart API Error:', error);
    return NextResponse.json(
      { error: '장바구니를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-ID') || request.cookies.get('session_id')?.value;
    console.log('Forwarding cart POST request to backend with session ID:', sessionId);
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/api/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify(body),
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error('Cart POST API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니 생성에 실패했습니다.' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Cart created/updated:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart POST API Error:', error);
    return NextResponse.json(
      { error: '장바구니 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-ID') || request.cookies.get('session_id')?.value;
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/cart`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error('Cart Delete API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니를 비우는데 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: '장바구니가 비워졌습니다.' });
  } catch (error) {
    console.error('Cart Delete API Error:', error);
    return NextResponse.json(
      { error: '장바구니를 비우는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 
