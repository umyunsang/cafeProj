/**
 * 사용자 식별 시스템 관련 API 클라이언트
 */

import apiClient from './api-client';

// 사용자 식별 응답 타입
export interface UserIdentityResponse {
  user_id: string;
  is_new: boolean;
}

// 사용자 설정 타입
export interface UserPreferences {
  theme?: string;
  language?: string;
  notification_enabled?: boolean;
}

/**
 * 사용자 ID를 가져오거나 생성합니다.
 * 처음 방문한 사용자는 새 ID가 생성되고, 재방문 사용자는 기존 ID가 반환됩니다.
 */
export async function identifyUser(): Promise<UserIdentityResponse> {
  try {
    const response = await apiClient.get<UserIdentityResponse>('/api/user/identify');
    return response;
  } catch (error) {
    console.error('사용자 식별 실패:', error);
    throw error;
  }
}

/**
 * 사용자 설정을 가져옵니다.
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const response = await apiClient.get<UserPreferences>('/api/user/preferences');
    return response;
  } catch (error) {
    console.error('사용자 설정 가져오기 실패:', error);
    // 기본 설정 반환
    return {
      theme: 'light',
      language: 'ko',
      notification_enabled: true
    };
  }
}

/**
 * 사용자 설정을 업데이트합니다.
 */
export async function updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  try {
    const response = await apiClient.post<{status: string, preferences: UserPreferences}>('/api/user/preferences', {
      data: preferences
    });
    return response.preferences;
  } catch (error) {
    console.error('사용자 설정 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 사용자 세션을 초기화합니다.
 */
export async function clearUserSession(): Promise<{status: string, message: string}> {
  try {
    const response = await apiClient.post<{status: string, message: string}>('/api/user/clear');
    return response;
  } catch (error) {
    console.error('사용자 세션 초기화 실패:', error);
    throw error;
  }
} 