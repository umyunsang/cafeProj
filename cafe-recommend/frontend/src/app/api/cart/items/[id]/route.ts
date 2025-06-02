import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049/api';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 15에서는 params를 await 해야 함
    const { id } = await params;
    
    // 헤더에서 세션 ID 우선 확인 (CartContext에서 전달)
    let sessionId = request.headers.get('X-Session-ID');
    
    // 헤더에 없으면 쿠키에서 확인 (여러 이름으로)
    if (!sessionId) {
      sessionId = request.cookies.get('cafe_session_id')?.value || 
                  request.cookies.get('session_id')?.value ||
                  request.cookies.get('cafe_user_id')?.value;
    }
    
    console.log('Updating cart item with session ID:', sessionId, 'Item ID:', id);
    
    if (!sessionId) {
      console.error('Session ID not found in headers or cookies');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Updating cart item:', body);
    
    const response = await fetch(`${API_BASE_URL}/cart/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Cart Item Update API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니 아이템을 수정하는 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart Item Update API Error:', error);
    return NextResponse.json(
      { error: '장바구니 아이템을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 15에서는 params를 await 해야 함
    const { id } = await params;
    
    // 헤더에서 세션 ID 우선 확인 (CartContext에서 전달)
    let sessionId = request.headers.get('X-Session-ID');
    
    // 헤더에 없으면 쿠키에서 확인 (여러 이름으로)
    if (!sessionId) {
      sessionId = request.cookies.get('cafe_session_id')?.value || 
                  request.cookies.get('session_id')?.value ||
                  request.cookies.get('cafe_user_id')?.value;
    }
    
    console.log('Deleting cart item with session ID:', sessionId, 'Item ID:', id);
    
    if (!sessionId) {
      console.error('Session ID not found in headers or cookies');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${API_BASE_URL}/cart/items/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      console.error('Cart Item Delete API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니 아이템을 삭제하는 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart Item Delete API Error:', error);
    return NextResponse.json(
      { error: '장바구니 아이템을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 