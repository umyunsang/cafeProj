'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONFIG } from "@/config";
import { CartProvider } from '@/contexts/CartContext';
import { UserProvider } from '@/contexts/user-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { UserHeader } from '@/components/layout/UserHeader';
import { AdminFooter } from '@/components/layout/AdminFooter';
import { UserFooter } from '@/components/layout/UserFooter';

declare global {
  interface Window {
    Naver?: any;
    naverPayInstance?: any;
  }
}

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (storedTheme) return storedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isAdminRoute || window.naverPayInstance) return;
    const naverPaySdkUrl = 'https://nsp.pay.naver.com/sdk/js/naverpay.min.js';
    if (document.querySelector(`script[src="${naverPaySdkUrl}"]`)) {
        return;
    }
    const initializeNaverPay = () => {
      if (window.Naver?.Pay) {
        try {
          window.naverPayInstance = window.Naver.Pay.create({
            mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
            clientId: CONFIG.naver.clientId,
            chainId: CONFIG.naver.chainId,
          });
        } catch (error) {
          console.error('네이버페이 초기화 오류:', error);
        }
      }
    };
    const script = document.createElement('script');
    script.src = naverPaySdkUrl;
    script.async = true;
    script.defer = true;
    script.onload = initializeNaverPay;
    document.body.appendChild(script);
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return (
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:p-3 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
          >
            본문으로 건너뛰기
          </a>
          <AdminHeader theme={theme} toggleTheme={toggleTheme} />
          <main id="main-content" className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <AdminFooter />
        </div>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    );
  } 
  
  return (
    <UserProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:p-3 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
          >
            본문으로 건너뛰기
          </a>
          <UserHeader theme={theme} toggleTheme={toggleTheme} />
          <main id="main-content" className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <UserFooter />
        </div>
        <Toaster richColors position="top-right" />
      </CartProvider>
    </UserProvider>
  );
} 