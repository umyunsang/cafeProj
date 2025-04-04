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
} as const; 