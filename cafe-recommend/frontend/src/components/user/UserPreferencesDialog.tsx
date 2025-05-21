'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser, UserPreferences } from '@/contexts/UserContext';

interface UserPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPreferencesDialog({ 
  open, 
  onOpenChange 
}: UserPreferencesDialogProps) {
  const { anonymousId, preferences, updatePreferences, resetUser, isReturningUser } = useUser();
  
  // 로컬 상태 (변경 전에 확인을 위해)
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(preferences);
  
  // 설정이 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // 테마 변경 핸들러
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setLocalPreferences(prev => ({ ...prev, theme }));
  };

  // 알림 설정 변경 핸들러
  const handleNotificationsChange = (enabled: boolean) => {
    setLocalPreferences(prev => ({ ...prev, notificationsEnabled: enabled }));
  };

  // 주문 타입 변경 핸들러
  const handleOrderTypeChange = (type: 'pickup' | 'delivery') => {
    setLocalPreferences(prev => ({ ...prev, lastOrderType: type }));
  };

  // 변경사항 저장
  const handleSave = () => {
    updatePreferences(localPreferences);
    onOpenChange(false);
  };

  // 사용자 데이터 초기화
  const handleReset = () => {
    if (window.confirm('모든 사용자 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetUser();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>사용자 설정</DialogTitle>
          <DialogDescription>
            사용자 경험을 개선하기 위한 설정을 관리하세요.
            {isReturningUser && (
              <span className="block mt-1 text-xs text-muted-foreground">방문 기록이 있는 사용자입니다.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* 사용자 식별자 */}
          <div className="space-y-2">
            <Label htmlFor="user-id">사용자 식별자</Label>
            <div className="flex items-center space-x-2">
              <code className="px-2 py-1 bg-muted rounded text-xs flex-1 overflow-x-auto">
                {anonymousId || '식별자 없음'}
              </code>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
              >
                초기화
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              이 식별자는 로그인 없이 사용자를 구분하기 위해 사용됩니다.
            </p>
          </div>
          
          <Separator />
          
          {/* 테마 설정 */}
          <div className="space-y-2">
            <Label>테마 설정</Label>
            <RadioGroup 
              value={localPreferences.theme || 'system'} 
              onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}
              className="flex space-x-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light" className="cursor-pointer">밝게</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark" className="cursor-pointer">어둡게</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system" className="cursor-pointer">시스템</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* 알림 설정 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">알림 수신</Label>
              <p className="text-xs text-muted-foreground">
                프로모션 및 이벤트 알림을 수신합니다.
              </p>
            </div>
            <Switch 
              id="notifications" 
              checked={localPreferences.notificationsEnabled || false} 
              onCheckedChange={handleNotificationsChange}
            />
          </div>
          
          {/* 주문 타입 설정 */}
          <div className="space-y-2">
            <Label>기본 주문 방식</Label>
            <RadioGroup 
              value={localPreferences.lastOrderType || 'pickup'} 
              onValueChange={(value) => handleOrderTypeChange(value as 'pickup' | 'delivery')}
              className="flex space-x-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="order-pickup" />
                <Label htmlFor="order-pickup" className="cursor-pointer">포장</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="order-delivery" />
                <Label htmlFor="order-delivery" className="cursor-pointer">배달</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 