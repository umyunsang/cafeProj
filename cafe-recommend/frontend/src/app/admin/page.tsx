'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Coffee, Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 이미 로그인된 경우 메뉴 관리 페이지로 리다이렉트
    const token = localStorage.getItem('adminToken');
    if (token) {
      router.push('/admin/menus');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('로그인 API를 찾을 수 없습니다.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '로그인에 실패했습니다.');
      }

      const data = await response.json();
      
      // 토큰 저장
      localStorage.setItem('adminToken', data.access_token);
      
      // 세션 스토리지에도 토큰 저장 (브라우저 세션 유지)
      sessionStorage.setItem('adminToken', data.access_token);
      
      toast.success('로그인 성공');
      router.push('/admin/menus');
    } catch (error) {
      console.error('로그인 실패:', error);
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <Toaster position="top-center" richColors />
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-3">
          <div className="inline-block p-3 bg-primary/10 dark:bg-primary/20 rounded-full">
            <Coffee className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">관리자 로그인</h1>
          <p className="text-gray-600 dark:text-gray-400">카페 관리 시스템에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary dark:focus:ring-primary/40 dark:focus:border-primary outline-none transition duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Lock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </span>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/50 focus:border-primary dark:focus:ring-primary/40 dark:focus:border-primary outline-none transition duration-200"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </Card>
    </div>
  );
} 