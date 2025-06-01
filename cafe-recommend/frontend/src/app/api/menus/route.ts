import { NextRequest, NextResponse } from 'next/server';

// 백엔드 서버 URL (환경변수에서 가져오거나 기본값 사용)
const BACKEND_URL = process.env.BACKEND_URL || 'https://cafe-backend-jv0t.onrender.com';

export async function GET() {
  try {
    console.log('Forwarding menu request to backend:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/menus`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // CORS 및 캐시 설정
      cache: 'no-cache'
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
    console.log('Menu data received from backend:', data?.length || 0, 'items');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Menu API Error:', error);
    return NextResponse.json(
      { error: '메뉴를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
} 
