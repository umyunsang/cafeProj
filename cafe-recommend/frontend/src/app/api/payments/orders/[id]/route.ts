import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const response = await fetch(`${API_BASE_URL}/api/payments/orders/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': request.cookies.get('session_id')?.value || ''
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: '주문 정보를 가져오는데 실패했습니다.' }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('주문 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '주문을 조회할 수 없습니다.' }, 
      { status: 500 }
    );
  }
} 