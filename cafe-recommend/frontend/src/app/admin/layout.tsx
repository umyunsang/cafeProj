'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

interface AdminLayoutClientProps {
  children: ReactNode;
}

function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin') {
      router.push('/admin');
    } else if (!isLoading && isAuthenticated && pathname === '/admin') {
      router.push('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/admin') {
    return null;
  }
  
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950">
      {children}
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
} 