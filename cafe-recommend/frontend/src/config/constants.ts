export const LOCAL_STORAGE_KEYS = {
  SELECTED_PAYMENT_METHOD: 'selected_payment_method',
  CAFE_CART_DATA: 'cafe_cart_data',
  CAFE_SESSION_ID: 'cafe_session_id', // apiClient.ts 에서도 사용 가능성 있음
  LAST_PAYMENT_DATA: 'last_payment_data',
  NAVER_PAYMENT_KEY: 'naverPaymentKey',
  KAKAO_PAYMENT_INFO: 'kakaoPaymentInfo', // sessionStorage에 저장되지만, 키는 여기서 관리
  KAKAO: 'kakao',
};

export const API_ENDPOINTS = {
  ORDER: '/api/payments/order',
  NAVER_PAY_PREPARE: '/api/payments/naver/prepare',
  KAKAO_PAY_PREPARE: '/api/payments/kakao',
  // 추가적인 API 엔드포인트들...
};

export const PAYMENT_METHODS = {
  NAVER: 'naver',
  KAKAO: 'kakao',
};

export const CHECKOUT_PROCESS = {
  MAX_FETCH_ATTEMPTS: 3,
};

// 기타 자주 사용되는 상수들... 