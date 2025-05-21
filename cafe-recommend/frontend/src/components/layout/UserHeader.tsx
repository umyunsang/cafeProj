'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { CONFIG } from "@/config";
import { CartPopover } from '@/components/cart/CartPopover';
import { UserButton } from '@/components/user/UserButton';
import { cn } from '@/lib/utils';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface UserHeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function UserHeader({ theme, toggleTheme }: UserHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // 모바일 메뉴 키보드 접근성
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  // 메뉴 열렸을 때 포커스 처리
  useEffect(() => {
    if (isMenuOpen && menuRef.current) {
      const firstFocusableElement = menuRef.current.querySelector(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
    }
  }, [isMenuOpen]);

  const navLinkClasses = (href: string) => 
    cn(
      "relative group px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 active:scale-[0.98] transition-all duration-150",
      pathname === href 
        ? "text-primary-600 dark:text-primary-400 bg-primary-500/10 dark:bg-primary-400/10"
        : "text-neutral-700 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
    );
  
  const mobileNavLinkClasses = (href: string) => 
    cn(
      "block px-4 py-3 rounded-lg text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 active:bg-neutral-200 dark:active:bg-neutral-700",
      pathname === href
        ? "bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300"
        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[color:var(--border-color)] bg-background dark:bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95"
            aria-label={`${CONFIG.site.name} 홈페이지로 이동`}
          >
            <span className="text-2xl font-bold gradient-text">
              {CONFIG.site.name}
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/chat" className={navLinkClasses("/chat")}>AI 상담사</Link>
            <Link href="/menu" className={navLinkClasses("/menu")}>메뉴 보기</Link>
            <Link href="/orders" className={navLinkClasses("/orders")}>주문 내역</Link>
            <Link href="/settings" className={navLinkClasses("/settings")}>설정</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? '다크 모드로 변경' : '라이트 모드로 변경'}
              className="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <UserButton />
            <CartPopover theme={theme} />
            <button 
              ref={menuButtonRef}
              id="mobile-menu-button"
              className="md:hidden p-2 -mr-2 rounded-md text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:bg-neutral-100 dark:active:bg-neutral-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={`메뉴 ${isMenuOpen ? '닫기' : '열기'}`}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className={`block w-6 h-0.5 bg-current transition-transform duration-300 ease-in-out ${isMenuOpen ? 'rotate-45 translate-y-[5px]' : ''}`}></span>
              <span className={`block w-5 h-0.5 bg-current mt-1 transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-current mt-1 transition-transform duration-300 ease-in-out ${isMenuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`}></span>
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            className="md:hidden absolute top-16 inset-x-0 z-40 shadow-lg bg-background dark:bg-neutral-900 border-t border-[color:var(--border-color)] py-3 overflow-hidden"
            role="menu"
            aria-labelledby="mobile-menu-button"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <nav className="flex flex-col gap-1 px-3">
              <Link href="/chat" className={mobileNavLinkClasses("/chat")} role="menuitem" onClick={() => setIsMenuOpen(false)}>AI 상담사</Link>
              <Link href="/menu" className={mobileNavLinkClasses("/menu")} role="menuitem" onClick={() => setIsMenuOpen(false)}>메뉴 보기</Link>
              <Link href="/orders" className={mobileNavLinkClasses("/orders")} role="menuitem" onClick={() => setIsMenuOpen(false)}>주문 내역</Link>
              <Link href="/settings" className={mobileNavLinkClasses("/settings")} role="menuitem" onClick={() => setIsMenuOpen(false)}>설정</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
} 