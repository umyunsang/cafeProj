'use client';

import { useUser } from '@/contexts/user-context';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface UserIdentityDisplayProps {
  className?: string;
}

export function UserIdentityDisplay({ className = '' }: UserIdentityDisplayProps) {
  const { userId, isNewUser, isLoading, preferences, updatePreferences, resetSession } = useUser();
  
  const [theme, setTheme] = useState(preferences.theme || 'system');
  const [language, setLanguage] = useState(preferences.language || 'ko');
  const [notificationEnabled, setNotificationEnabled] = useState(preferences.notification_enabled || false);

  // preferences 객체가 변경될 때마다 내부 상태를 업데이트합니다.
  useEffect(() => {
    setTheme(preferences.theme || 'system');
    setLanguage(preferences.language || 'ko');
    setNotificationEnabled(preferences.notification_enabled || false);
  }, [preferences]);

  const handleSavePreferences = async () => {
    try {
      await updatePreferences({
        theme,
        language,
        notification_enabled: notificationEnabled
      });
      toast.success('설정이 성공적으로 저장되었습니다.');
    } catch (error) {
      toast.error('설정 저장 중 오류가 발생했습니다.');
      console.error("Failed to save preferences:", error);
    }
  };

  const handleResetSession = async () => {
    try {
      await resetSession();
      toast.success('세션이 초기화되었습니다. 새로운 사용자 ID가 발급됩니다.');
      // 상태 초기화 (선택적, UserProvider에서 처리할 수도 있음)
      // setTheme('system');
      // setLanguage('ko');
      // setNotificationEnabled(false);
    } catch (error) {
      toast.error('세션 초기화 중 오류가 발생했습니다.');
      console.error("Failed to reset session:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>사용자 정보 로딩 중...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <RotateCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>사용자 식별 정보</CardTitle>
          <CardDescription>
            현재 브라우저 세션에 할당된 고유 식별자입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="userId" className="text-sm font-medium text-muted-foreground">사용자 ID</Label>
            <p id="userId" className="text-lg font-semibold break-all">{userId}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">세션 상태</Label>
            <p className="text-lg font-semibold">
              {isNewUser ? '새 사용자 (초기화됨)' : '기존 사용자'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기본 설정</CardTitle>
          <CardDescription>앱의 표시 언어와 테마를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="languageSelect">언어</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="languageSelect" className="w-full">
                <SelectValue placeholder="언어 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="themeSelect">테마</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="themeSelect" className="w-full">
                <SelectValue placeholder="테마 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">라이트 모드</SelectItem>
                <SelectItem value="dark">다크 모드</SelectItem>
                <SelectItem value="system">시스템 설정 따르기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="notifications" 
              checked={notificationEnabled} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotificationEnabled(e.target.checked)} 
            />
            <Label htmlFor="notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              새로운 추천 및 중요 업데이트에 대한 알림을 받습니다.
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>세션 관리</CardTitle>
          <CardDescription>현재 세션 정보를 초기화하고 모든 설정을 기본값으로 되돌립니다. 이 작업은 되돌릴 수 없습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSavePreferences} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> 설정 저장
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <AlertCircle className="mr-2 h-4 w-4" /> 세션 초기화
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말로 세션을 초기화하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  모든 사용자 설정(테마, 언어, 알림)이 기본값으로 돌아가며, 새로운 사용자 ID가 발급됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetSession} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  초기화 진행
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
} 