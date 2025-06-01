import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function PUT(
  request: NextRequest,
  { params }: { params: { menuId: string } }
) {
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
    console.log('Updating cart item:', { menuId: params.menuId, ...body });
    
    const response = await fetch(`${API_BASE_URL}/api/cart/items/${params.menuId}`, {
      method: 'PUT',
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
        { error: '장바구니 항목을 수정할 수 없습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cart Items API Error:', error);
    return NextResponse.json(
      { error: '장바구니 항목을 수정할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { menuId: string } }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    
    if (!sessionId) {
      console.error('Session ID not found');
      return NextResponse.json(
        { error: '세션이 유효하지 않습니다.' },
        { status: 401 }
      );
    }

    console.log('Deleting cart item:', params.menuId);
    
    const response = await fetch(`${API_BASE_URL}/api/cart/items/${params.menuId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Cookie': `session_id=${sessionId}`
      }
    });

    if (!response.ok) {
      console.error('Cart Items API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '장바구니 항목을 삭제할 수 없습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: '장바구니 항목이 삭제되었습니다.' });
  } catch (error) {
    console.error('Cart Items API Error:', error);
    return NextResponse.json(
      { error: '장바구니 항목을 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
} 