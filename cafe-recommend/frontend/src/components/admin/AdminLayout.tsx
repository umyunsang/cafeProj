'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Coffee,
  ShoppingCart,
  LogOut,
  Menu as MenuIcon,
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* 모바일 메뉴 토글 버튼 */}
      <div className="md:hidden flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-amber-600">카페 관리</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-600"
        >
          {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
        </Button>
      </div>

      {/* 사이드바 */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 bg-white shadow-lg z-10 absolute md:relative h-full`}>
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-amber-600">카페 관리 시스템</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link 
            href="/admin/menus" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/admin/menus') 
                ? 'bg-amber-50 text-amber-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Coffee size={20} />
            <span>메뉴 관리</span>
          </Link>
          <Link 
            href="/admin/orders" 
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              isActive('/admin/orders') 
                ? 'bg-amber-50 text-amber-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart size={20} />
            <span>주문 관리</span>
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:bg-gray-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            <span>로그아웃</span>
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
} 