import { NextRequest, NextResponse } from 'next/server';

// 백엔드 서버 URL (환경변수에서 가져오거나 기본값 사용)
const BACKEND_URL = process.env.BACKEND_URL || 'https://cafe-backend-jv0t.onrender.com';

export async function GET(request: NextRequest) {
  try {
    console.log('Forwarding user identify request to backend:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/api/user/identify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.error('User Identify API Error Response:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      return NextResponse.json(
        { error: '사용자 식별에 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('User identify data received from backend:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('User Identify API Error:', error);
    return NextResponse.json(
      { error: '사용자 식별에 실패했습니다.' },
      { status: 500 }
    );
  }
} 