import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = request.headers.get('X-Session-ID');

    const response = await fetch(`${API_BASE_URL}/api/payment/kakao/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId || '',
      },
      body: JSON.stringify(body),
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