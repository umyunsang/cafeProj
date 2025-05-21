'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  OrderInfo, 
  PaymentPreference, 
  getOrderInfo, 
  saveOrderInfo 
} from '@/lib/payment-storage';
import { User, Save } from 'lucide-react';

interface PickupInfoFormProps {
  sessionId: string | null;
  onInfoChange: (info: OrderInfo) => void;
}

export function PickupInfoForm({ sessionId, onInfoChange }: PickupInfoFormProps) {
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    nickname: '',
    pickupOption: 'store'
  });
  const [saveInfo, setSaveInfo] = useState<boolean>(false);
  
  // 저장된 정보 불러오기
  useEffect(() => {
    if (sessionId) {
      const savedInfo = getOrderInfo(sessionId);
      if (savedInfo && savedInfo.orderInfo) {
        const newOrderInfo = {
          nickname: savedInfo.orderInfo.nickname || '',
          pickupOption: savedInfo.orderInfo.pickupOption || 'store'
        };
        
        setOrderInfo(newOrderInfo);
        
        // 저장 여부 설정
        setSaveInfo(savedInfo.preferences.savePaymentInfo);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  
  // 컴포넌트 마운트시 한 번만 상위 컴포넌트에 기본값 전달
  useEffect(() => {
    onInfoChange(orderInfo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트시 한 번만 실행
  
  // 정보 변경 시 호출
  const handleChange = (
    field: keyof OrderInfo,
    value: string
  ) => {
    const updatedInfo = { ...orderInfo, [field]: value };
    setOrderInfo(updatedInfo);
    onInfoChange(updatedInfo);
    
    // 저장 설정이 활성화된 경우 자동 저장
    if (saveInfo && sessionId) {
      const preferences: PaymentPreference = {
        savePaymentInfo: saveInfo
      };
      
      saveOrderInfo(sessionId, updatedInfo, preferences);
    }
  };
  
  // 저장 설정 변경
  const handleSaveSettingChange = (checked: boolean) => {
    setSaveInfo(checked);
    
    if (sessionId) {
      const preferences: PaymentPreference = {
        savePaymentInfo: checked
      };
      
      if (checked) {
        // 설정이 활성화된 경우 현재 정보 저장
        saveOrderInfo(sessionId, orderInfo, preferences);
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 정보</CardTitle>
        <CardDescription>메뉴를 받기 위한 최소한의 정보만 입력해주세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            주문자 이름(선택)
          </Label>
          <Input
            id="name"
            placeholder="주문 호출 시 불릴 이름이나 닉네임"
            value={orderInfo.nickname || ''}
            onChange={(e) => handleChange('nickname', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">이름이나 닉네임은 메뉴 준비가 완료되었을 때 호출을 위해 사용됩니다</p>
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            주문 방식
          </Label>
          <RadioGroup 
            key={`radio-group-${orderInfo.pickupOption || 'store'}`}
            defaultValue={orderInfo.pickupOption}
            onValueChange={(value) => handleChange('pickupOption', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="store" id="store" />
              <Label htmlFor="store">매장 이용</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="takeout" id="takeout" />
              <Label htmlFor="takeout">포장</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="save-info" 
            defaultChecked={saveInfo}
            onChange={(e) => handleSaveSettingChange(e.target.checked)}
          />
          <Label htmlFor="save-info" className="text-sm flex items-center cursor-pointer">
            <Save className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            다음에도 이 정보 사용하기
          </Label>
        </div>
      </CardContent>
    </Card>
  );
} 