'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Coffee,
  ShoppingCart,
  BarChart,
  LogOut,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* 사이드바 */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">카페 관리 시스템</h1>
        </div>
        <nav className="space-y-2">
          <Link href="/admin/dashboard" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <LayoutDashboard size={20} />
            <span>대시보드</span>
          </Link>
          <Link href="/admin/menus" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <Coffee size={20} />
            <span>메뉴 관리</span>
          </Link>
          <Link href="/admin/orders" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <ShoppingCart size={20} />
            <span>주문 관리</span>
          </Link>
          <Link href="/admin/statistics" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <BarChart size={20} />
            <span>통계</span>
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full flex items-center space-x-2 text-white hover:bg-gray-700"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            <span>로그아웃</span>
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-8 bg-gray-100">
        {children}
      </div>
    </div>
  );
} 