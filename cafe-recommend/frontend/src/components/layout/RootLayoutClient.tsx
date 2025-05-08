'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { CONFIG } from "@/config";
import { CartProvider } from '@/contexts/CartContext';
import { CartModal } from '@/components/cart/CartModal';
import { CartButton } from '@/components/cart/CartButton';
import { Toaster } from 'sonner';

declare global {
  interface Window {
    Naver?: any;
    naverPayInstance?: any;
  }
}

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const naverPaySdkUrl = 'https://nsp.pay.naver.com/sdk/js/naverpay.min.js';

    if (document.querySelector(`script[src="${naverPaySdkUrl}"]`)) {
      if (window.naverPayInstance) {
        console.log('Naver Pay SDK 이미 로드 및 초기화됨.');
        return;
      }
      console.log('Naver Pay SDK 스크립트는 로드됨. 초기화 재시도...');
    }

    const initializeNaverPay = () => {
      if (window.Naver && window.Naver.Pay) {
        console.log(`Naver Pay SDK create 시도 (clientId: ${CONFIG.naver.clientId}, chainId: ${CONFIG.naver.chainId}, mode: development)`);
        try {
          window.naverPayInstance = window.Naver.Pay.create({
            mode: 'development',
            clientId: CONFIG.naver.clientId,
            chainId: CONFIG.naver.chainId,
          });
          console.log('Naver Pay SDK 객체 생성 완료 (window.naverPayInstance):', window.naverPayInstance);
        } catch (createError) {
          console.error('Naver Pay SDK create 중 오류:', createError);
        }
      } else {
        console.error('Naver Pay SDK 초기화 실패: window.Naver.Pay 객체를 찾을 수 없음.');
      }
    };

    if (document.querySelector(`script[src="${naverPaySdkUrl}"]`)) {
      initializeNaverPay();
      return;
    }

    const script = document.createElement('script');
    script.src = naverPaySdkUrl;
    script.async = true;
    script.onload = initializeNaverPay;
    script.onerror = () => {
      console.error('Naver Pay SDK 로드 실패.');
    };

    document.body.appendChild(script);
    console.log('Naver Pay SDK 로드 시작...');

    return () => {
      const existingScript = document.querySelector(`script[src="${naverPaySdkUrl}"]`);
      if (existingScript) {
        document.body.removeChild(existingScript);
        console.log('Naver Pay SDK 스크립트 제거됨.');
      }
    };
  }, []);

  return (
    <CartProvider>
      <header className="sticky top-0 z-50 w-full border-b border-[color:var(--border)] bg-white/50 backdrop-blur-xl dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold gradient-text">{CONFIG.site.name}</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {/* 데스크톱 메뉴 */}
              <div className="hidden md:flex gap-6">
                <Link 
                  href="/chat" 
                  className="relative group px-4 py-2"
                >
                  <span className="relative z-10 text-text-light dark:text-text-dark group-hover:text-white transition-colors duration-200">
                    AI 상담사
                  </span>
                  <div className="absolute inset-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-lg bg-gradient-blue opacity-80"></div>
                </Link>
                <Link 
                  href="/menu" 
                  className="relative group px-4 py-2"
                >
                  <span className="relative z-10 text-text-light dark:text-text-dark group-hover:text-white transition-colors duration-200">
                    메뉴 보기
                  </span>
                  <div className="absolute inset-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-lg bg-gradient-blue opacity-80"></div>
                </Link>
              </div>
              
              {/* 장바구니 버튼 */}
              <CartButton />
              
              {/* 모바일 메뉴 버튼 */}
              <button 
                className="md:hidden p-2 hover:bg-background-light/10 rounded-lg"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="메뉴 열기"
              >
                <div className="w-6 h-0.5 bg-text-light dark:bg-text-dark mb-1.5"></div>
                <div className="w-6 h-0.5 bg-text-light dark:bg-text-dark mb-1.5"></div>
                <div className="w-6 h-0.5 bg-text-light dark:bg-text-dark"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[color:var(--border)] bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            <div className="glassmorphism p-4 md:p-6 rounded-xl">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 gradient-text">{CONFIG.site.name}</h3>
              <p className="text-sm md:text-base text-text-light/70 dark:text-text-dark/70">
                {CONFIG.site.description}
              </p>
            </div>
            <div className="glassmorphism p-4 md:p-6 rounded-xl">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 gradient-text">메뉴</h3>
              <ul className="space-y-2 md:space-y-3">
                <li>
                  <Link href="/chat" className="block text-sm md:text-base text-text-light/70 dark:text-text-dark/70 hover:text-primary transition-colors p-2">
                    AI 상담사
                  </Link>
                </li>
                <li>
                  <Link href="/menu" className="block text-sm md:text-base text-text-light/70 dark:text-text-dark/70 hover:text-primary transition-colors p-2">
                    메뉴 보기
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 md:mt-12 pt-4 md:pt-6 border-t border-[color:var(--border)] text-center text-xs md:text-sm text-text-light/50 dark:text-text-dark/50">
            © {new Date().getFullYear()} {CONFIG.site.name}. All rights reserved.
          </div>
        </div>
      </footer>
      <CartModal />
      <Toaster position="top-right" />
    </CartProvider>
  );
} 