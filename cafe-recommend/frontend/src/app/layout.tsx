import { Inter } from "next/font/google";
import "./globals.css";
import { CONFIG } from "@/config";
import { RootLayoutClient } from "@/components/layout/RootLayoutClient";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap', // 폰트 로딩 중에도 텍스트가 보이도록 설정
  preload: true, // 사전 로드 활성화
});

// metadata는 별도의 파일로 분리
export const metadata = {
  title: '카페 추천 서비스',
  description: 'AI 기반 카페 메뉴 추천 서비스',
};

// 서버 컴포넌트로 메타데이터 내보내기
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0A67C7" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
