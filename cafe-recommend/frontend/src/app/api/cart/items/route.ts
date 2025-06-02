import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049/api';

export async function POST(request: NextRequest) {
  try {
    // 헤더에서 세션 ID 우선 확인 (CartContext에서 전달)
    let sessionId = request.headers.get('X-Session-ID');
    
    // 헤더에 없으면 쿠키에서 확인 (여러 이름으로)
    if (!sessionId) {
      sessionId = request.cookies.get('cafe_session_id')?.value || 
                  request.cookies.get('session_id')?.value ||
                  request.cookies.get('cafe_user_id')?.value;
    }
    
    console.log('Adding item to cart with session ID:', sessionId);
    
    if (!sessionId) {
      console.error('Session ID not found in headers or cookies');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Adding item to cart:', body);
    
    const response = await fetch(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Cart Items API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니에 아이템을 추가하는 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const nextResponse = NextResponse.json(data);
    
    // 세션 ID를 모든 쿠키 형태로 저장
    nextResponse.cookies.set('cafe_session_id', sessionId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 24시간
    });
    nextResponse.cookies.set('session_id', sessionId, {
      httpOnly: false,
      sameSite: 'lax', 
      path: '/',
      maxAge: 24 * 60 * 60
    });
    
    return nextResponse;
  } catch (error) {
    console.error('Cart Items API Error:', error);
    return NextResponse.json(
      { error: '장바구니에 아이템을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 
