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

    const backendData = await response.json();
    console.log('User identify data received from backend:', backendData);
    
    // 백엔드 응답을 프론트엔드가 기대하는 User 형태로 변환
    const userData = {
      id: backendData.user_id,
      user_id: backendData.user_id, // 백호환성을 위해 둘 다 포함
      is_new: backendData.is_new,
      email: '',  // 기본값
      name: 'Guest User',  // 기본값
      role: 'guest' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Transformed user data:', userData);
    return NextResponse.json(userData);
  } catch (error) {
    console.error('User Identify API Error:', error);
    return NextResponse.json(
      { error: '사용자 식별에 실패했습니다.' },
      { status: 500 }
    );
  }
} 