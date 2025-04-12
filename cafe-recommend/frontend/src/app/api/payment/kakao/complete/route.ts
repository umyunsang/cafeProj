import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = request.headers.get('X-Session-ID');
    const { tid, pg_token, order_id } = body;

    const queryParams = new URLSearchParams({
      tid: tid,
      pg_token: pg_token,
      order_id: order_id,
    }).toString();
    const fetchURL = `${API_BASE_URL}/api/payment/kakao/complete?${queryParams}`;

    const response = await fetch(fetchURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || '결제 완료 처리에 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('결제 완료 처리 중 오류 발생:', error);
    return NextResponse.json(
      { error: '결제 완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 