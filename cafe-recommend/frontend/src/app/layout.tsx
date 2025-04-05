import { Inter } from "next/font/google";
import "./globals.css";
import { CONFIG } from "@/config";
import { RootLayoutClient } from "@/components/layout/RootLayoutClient";

const inter = Inter({ subsets: ["latin"] });

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
        <title>{CONFIG.site.name}</title>
        <meta name="description" content={CONFIG.site.description} />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
