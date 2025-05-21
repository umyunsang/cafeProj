import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const { orderNumber } = params;
    const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderNumber}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('주문 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '주문을 조회할 수 없습니다.' }, { status: 500 });
  }
} 