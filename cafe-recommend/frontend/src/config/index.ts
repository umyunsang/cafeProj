export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049/api';

export const CONFIG = {
  site: {
    name: 'SipSmart',
    description: 'AI와 함께하는 스마트 카페 경험',
    url: 'http://116.124.191.174:15030',
  },
  api: {
    baseUrl: API_URL,
  },
  theme: {
    defaultTheme: 'system' as const,
  },
  naver: {
    clientId: process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID || 'HN3GGCMDdTgGUfl0kFCo',
    chainId: process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID || 'c1l0UTFCMlNwNjY',
  },
} as const; 