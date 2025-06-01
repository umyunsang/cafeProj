import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 0;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049';

export async function GET() {
  try {
    console.log('Forwarding request to backend');
    
    const response = await fetch(`${API_BASE_URL}/api/menus`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Menu API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '메뉴를 불러올 수 없습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Menu API Error:', error);
    return NextResponse.json(
      { error: '메뉴를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
} 