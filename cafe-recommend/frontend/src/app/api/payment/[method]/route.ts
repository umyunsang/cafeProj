import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function POST(
  request: NextRequest,
  { params }: { params: { method: string } }
) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/payments/${params.method}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('결제 요청 중 오류 발생:', error);
    return NextResponse.json({ error: '결제 요청을 처리할 수 없습니다.' }, { status: 500 });
  }
} 