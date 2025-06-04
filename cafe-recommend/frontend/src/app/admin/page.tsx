'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Coffee, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLogin() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false); // 개발 환경 여부 상태

  useEffect(() => {
    setMounted(true);
    // NEXT_PUBLIC_NODE_ENV와 같은 공개 환경 변수를 사용하거나, 서버로부터 prop을 받는 것이 더 안전합니다.
    // 여기서는 process.env.NODE_ENV를 직접 사용하지만, 실제 프로덕션에서는 주의가 필요합니다.
    setIsDevelopment(process.env.NODE_ENV === 'development'); 
    
    // AuthContext에서 인증 상태가 로딩 완료되고 이미 인증된 경우 리다이렉션
    if (!authLoading && isAuthenticated) {
      router.push('/admin/dashboard');
    }
  }, [router, authLoading, isAuthenticated]);

  const validateForm = () => {
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return false;
    }
    if (!password) { 
      toast.error('비밀번호를 입력해주세요.');
      return false;
    }
    if (password.length < 6) { 
      toast.error('비밀번호는 최소 6자리 이상이어야 합니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { 
      return;
    }
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://116.124.191.174:15049/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('로그인 API 경로를 찾을 수 없습니다. 관리자에게 문의하세요.');
        }
        const errorData = await response.json().catch(() => ({ detail: '응답 처리 중 오류가 발생했습니다.' }));
        throw new Error(errorData.detail || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }

      const data = await response.json();
      
      await login(data.access_token, { id: 'temp-user-id', email: email });

      toast.success('로그인 성공');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('로그인 실패:', error);
      let errorMessage = '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크 상태를 확인하거나 관리자에게 문의하세요.';
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
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
        
        {isDevelopment && (
          <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500 mb-2">개발 환경 관리자 계정</h3>
            <div className="space-y-1 text-xs">
              <p className="flex items-center text-gray-700 dark:text-gray-300">
                <Mail className="h-3 w-3 mr-1 text-gray-500" />
                <span className="font-medium">이메일:</span>
                <code className="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">admin@example.com</code>
              </p>
              <p className="flex items-center text-gray-700 dark:text-gray-300">
                <Lock className="h-3 w-3 mr-1 text-gray-500" />
                <span className="font-medium">비밀번호:</span>
                <code className="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">admin1234</code>
              </p>
              <p className="flex items-center text-gray-700 dark:text-gray-300">
                <Mail className="h-3 w-3 mr-1 text-gray-500" />
                <span className="font-medium">대체 이메일:</span>
                <code className="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">admin@test.com</code>
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 