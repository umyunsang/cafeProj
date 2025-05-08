export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15026/api/v1';

export const CONFIG = {
  site: {
    name: 'Cafe Recommend',
    description: '당신의 취향에 맞는 카페를 추천해드립니다.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://116.124.191.174:15022',
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