import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('주문 생성 중 오류 발생:', error);
    return NextResponse.json({ error: '주문을 생성할 수 없습니다.' }, { status: 500 });
  }
} 