import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tid = searchParams.get('tid');
    const pg_token = searchParams.get('pg_token');
    const order_id = searchParams.get('order_id');
    
    const sessionId = request.headers.get('X-Session-ID');

    if (!tid || !pg_token || !order_id) {
      return NextResponse.json(
        { error: '필수 파라미터 (tid, pg_token, order_id)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({
      tid: tid,
      pg_token: pg_token,
      order_id: order_id,
    }).toString();
    const fetchURL = `${API_BASE_URL}/api/payments/kakao/complete?${queryParams}`;

    const response = await fetch(fetchURL, {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId || '',
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: response.statusText || '알 수 없는 백엔드 오류' };
      }
      return NextResponse.json(
        { error: errorData.detail || '결제 완료 처리에 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('결제 완료 처리 중 오류 발생 (프론트엔드 API 라우트):', error);
    return NextResponse.json(
      { error: '결제 완료 처리 중 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 