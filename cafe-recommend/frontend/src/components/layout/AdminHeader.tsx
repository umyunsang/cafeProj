'use client';

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { CONFIG } from "@/config";
import { cn } from '@/lib/utils';
import { 
  Sun, Moon, LogOut, Menu as MenuIcon, X,
  LayoutDashboard, Coffee, ShoppingCart, ListOrdered, Bell, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

interface AdminHeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function AdminHeader({ theme, toggleTheme }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout: authLogout, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard, exact: true },
    { href: '/admin/menus', label: '메뉴 관리', icon: Coffee },
    { href: '/admin/orders', label: '주문 관리', icon: ShoppingCart },
    { href: '/admin/inventory', label: '재고 관리', icon: ListOrdered },
    { href: '/admin/notifications', label: '알림 관리', icon: Bell },
    { href: '/admin/settings', label: '설정', icon: Settings },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path;
    if (path === '/admin' && pathname !== '/admin/dashboard') return false;
    return pathname.startsWith(path);
  };
  
  const handleLogout = async () => {
    await authLogout();
    router.push('/admin');
    setIsMobileMenuOpen(false); 
  };

  const navLinkClasses = (href: string, exact: boolean = false, isMobile: boolean = false) => 
    cn(
      isMobile 
        ? "flex items-center space-x-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors"
        : "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive(href, exact) 
        ? (isMobile 
            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300' 
            : 'bg-primary-100 text-primary-700 dark:text-primary-300 dark:bg-primary-700/30')
        : (isMobile
            ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            : 'text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'),
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 active:scale-[0.98]"
    );

  if (!isMounted || !isAuthenticated) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 shadow-sm">
         <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                <span className="text-primary-600 dark:text-primary-400">Admin</span> Panel
              </span>
            </Link>
         </div>
        </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/admin/dashboard"
              className="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95"
              aria-label={`${CONFIG.site.name} 관리자 대시보드로 이동`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
                <span className="text-primary-600 dark:text-primary-400">Admin</span> Panel
              </span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={navLinkClasses(item.href, item.exact)}
              >
                <item.icon className="inline-block h-4 w-4 mr-1.5 align-text-bottom" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isMounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === 'light' ? '다크 모드로 변경' : '라이트 모드로 변경'}
                className="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:bg-neutral-200 dark:active:bg-neutral-700"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="hidden md:flex items-center text-sm text-neutral-600 dark:text-neutral-300 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:bg-neutral-200 dark:active:bg-neutral-700"
            >
              <LogOut size={18} className="mr-1.5" />
              로그아웃
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="메뉴 열기/닫기"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900">
          <nav className="container mx-auto px-2 py-2 flex flex-col space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={navLinkClasses(item.href, item.exact, true)}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center justify-start space-x-3 px-3 py-2.5 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/30"
            >
              <LogOut size={20} />
              <span>로그아웃</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
} 