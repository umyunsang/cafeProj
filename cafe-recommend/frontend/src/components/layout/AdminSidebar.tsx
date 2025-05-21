'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListOrdered, ShoppingCart, Settings, Package, Bell } from 'lucide-react';

const adminNavItems = [
  { href: '/admin/dashboard', label: '대시보드', shortLabel: '홈', icon: LayoutDashboard },
  { href: '/admin/menus', label: '메뉴 관리', shortLabel: '메뉴', icon: ListOrdered },
  { href: '/admin/orders', label: '주문 관리', shortLabel: '주문', icon: ShoppingCart },
  { href: '/admin/inventory', label: '재고', shortLabel: '재고', icon: Package },
  // { href: '/admin/notifications', label: '알림 관리', shortLabel: '알림', icon: Bell }, // 하단 탭에는 4-5개가 적당
  { href: '/admin/settings', label: '설정', shortLabel: '설정', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 border-r dark:border-gray-700 hidden md:block print:hidden">
        <nav className="space-y-2">
          {adminNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={`desktop-${item.href}`}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-primary dark:text-primary-300' : 'text-gray-500 dark:text-gray-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around items-center h-16 p-1 z-50 print:hidden">
        {adminNavItems.slice(0, 5).map((item) => { // 최대 5개 아이템 표시
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 p-1 rounded-md text-xs',
                isActive ? 'text-primary dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <item.icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-primary dark:text-primary-300' : '')} />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
} 