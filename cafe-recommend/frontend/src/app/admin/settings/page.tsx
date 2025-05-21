'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, CreditCard, ShieldAlert, Database, Server, Store, Clock, Save, RefreshCw } from 'lucide-react';
import PaymentSettings from './payment';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery, useApiMutation } from '@/hooks/useApiClient';
import { toast, Toaster } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import StoreInfoForm from '@/components/admin/settings/StoreInfoForm';
import OperationHoursForm from '@/components/admin/settings/OperationHoursForm';

interface StoreInfoData {
  name: string;
  phone: string;
  address: string;
  description: string;
}

interface OperationHoursData {
  weekdayStartTime: string;
  weekdayEndTime: string;
  weekendStartTime: string;
  weekendEndTime: string;
  closedDays: string; // 이전: holidays, API 스키마와 일관성 유지
  lastOrderTime: string;
}

interface GeneralSettingsData {
  storeInfo: StoreInfoData;
  operationHours: OperationHoursData;
}

// Validation error types
interface StoreInfoValidationErrors {
  name?: string;
  phone?: string;
  address?: string;
  description?: string;
}

interface OperationHoursValidationErrors {
  weekdayStartTime?: string;
  weekdayEndTime?: string;
  weekendStartTime?: string;
  weekendEndTime?: string;
  closedDays?: string;
  lastOrderTime?: string;
  timeSequence?: string; // For errors like start time > end time
}

interface AllValidationErrors {
  storeInfo?: StoreInfoValidationErrors;
  operationHours?: OperationHoursValidationErrors;
}

const INITIAL_STORE_INFO: StoreInfoData = {
  name: '',
  phone: '',
  address: '',
  description: '',
};

const INITIAL_OPERATION_HOURS: OperationHoursData = {
  weekdayStartTime: '09:00',
  weekdayEndTime: '21:00',
  weekendStartTime: '10:00',
  weekendEndTime: '22:00',
  closedDays: '',
  lastOrderTime: '20:30',
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [storeInfo, setStoreInfo] = useState<StoreInfoData>(INITIAL_STORE_INFO);
  const [operationHours, setOperationHours] = useState<OperationHoursData>(INITIAL_OPERATION_HOURS);
  const [validationErrors, setValidationErrors] = useState<AllValidationErrors>({});

  const {
    data: fetchedGeneralSettings,
    isLoading: isLoadingGeneralSettings,
    error: generalSettingsError,
    refetch: refetchGeneralSettings,
  } = useApiQuery<GeneralSettingsData>('/api/admin/settings/general');

  const {
    mutate: updateGeneralSettings,
    isLoading: isUpdatingGeneralSettings,
  } = useApiMutation<GeneralSettingsData, GeneralSettingsData>(
    'PUT',
    '/api/admin/settings/general'
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
        refetchGeneralSettings(); 
    }
  }, [isAuthenticated, token, refetchGeneralSettings]);

  useEffect(() => {
    if (fetchedGeneralSettings) {
      setStoreInfo(fetchedGeneralSettings.storeInfo || INITIAL_STORE_INFO);
      setOperationHours(fetchedGeneralSettings.operationHours || INITIAL_OPERATION_HOURS);
    }
  }, [fetchedGeneralSettings]);

  const handleStoreInfoChange = useCallback((field: keyof StoreInfoData, value: string) => {
    setStoreInfo(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, storeInfo: { ...prev.storeInfo, [field]: undefined } }));
  }, []);

  const handleOperationHoursChange = useCallback((field: keyof OperationHoursData, value: string) => {
    setOperationHours(prev => ({ ...prev, [field]: value }));
    if (field === 'weekdayStartTime' || field === 'weekdayEndTime' || field === 'weekendStartTime' || field === 'weekendEndTime') {
      setValidationErrors(prev => ({ 
        ...prev, 
        operationHours: { ...prev.operationHours, [field]: undefined, timeSequence: undefined } 
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, operationHours: { ...prev.operationHours, [field]: undefined } }));
    }
  }, []);

  const handleSaveChanges = async () => {
    if (!isAuthenticated) {
      toast.error('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.');
      return;
    }
    setValidationErrors({}); // Reset errors before new validation
    let currentValidationErrors: AllValidationErrors = {};

    // 유효성 검사 - 매장 정보
    const storeInfoErrors: StoreInfoValidationErrors = {};
    if (!storeInfo.name.trim()) storeInfoErrors.name = '매장 이름을 입력해주세요.';
    else if (storeInfo.name.trim().length < 2 || storeInfo.name.trim().length > 50) storeInfoErrors.name = '매장 이름은 2자 이상 50자 이하로 입력해주세요.';
    if (!storeInfo.phone.trim()) storeInfoErrors.phone = '매장 연락처를 입력해주세요.';
    else if (!/^[\d-]{7,15}$/.test(storeInfo.phone.trim())) storeInfoErrors.phone = '유효한 매장 연락처를 입력해주세요. (예: 02-123-4567)'; // 길이 제한 추가
    if (!storeInfo.address.trim()) storeInfoErrors.address = '매장 주소를 입력해주세요.';
    if (storeInfo.description.length > 500) storeInfoErrors.description = '매장 소개는 500자 이하로 입력해주세요.';
    if (Object.keys(storeInfoErrors).length > 0) currentValidationErrors.storeInfo = storeInfoErrors;

    // 유효성 검사 - 운영 시간
    const opHoursErrors: OperationHoursValidationErrors = {};
    if (!operationHours.weekdayStartTime) opHoursErrors.weekdayStartTime = '평일 시작 시간을 입력해주세요.';
    if (!operationHours.weekdayEndTime) opHoursErrors.weekdayEndTime = '평일 종료 시간을 입력해주세요.';
    if (!operationHours.weekendStartTime) opHoursErrors.weekendStartTime = '주말 시작 시간을 입력해주세요.';
    if (!operationHours.weekendEndTime) opHoursErrors.weekendEndTime = '주말 종료 시간을 입력해주세요.';
    if (!operationHours.lastOrderTime) opHoursErrors.lastOrderTime = '주문 마감 시간을 입력해주세요.';
    if (operationHours.closedDays && operationHours.closedDays.length > 100) opHoursErrors.closedDays = '휴무일 설명은 100자 이하로 입력해주세요.';

    if (operationHours.weekdayStartTime && operationHours.weekdayEndTime && operationHours.weekdayStartTime >= operationHours.weekdayEndTime) {
      opHoursErrors.timeSequence = (opHoursErrors.timeSequence || '') + '평일 운영 시작 시간은 종료 시간보다 빨라야 합니다. ';
    }
    if (operationHours.weekendStartTime && operationHours.weekendEndTime && operationHours.weekendStartTime >= operationHours.weekendEndTime) {
      opHoursErrors.timeSequence = (opHoursErrors.timeSequence || '') + '주말/공휴일 운영 시작 시간은 종료 시간보다 빨라야 합니다. ';
    }
    
    const latestEndTime = operationHours.weekdayEndTime > operationHours.weekendEndTime ? operationHours.weekdayEndTime : operationHours.weekendEndTime;
    if (operationHours.lastOrderTime && latestEndTime && operationHours.lastOrderTime >= latestEndTime) {
        opHoursErrors.lastOrderTime = (opHoursErrors.lastOrderTime || '') + '주문 마감 시간은 매장 운영 종료 시간보다 빨라야 합니다.';
    }
    if (Object.keys(opHoursErrors).length > 0) currentValidationErrors.operationHours = opHoursErrors;

    if (Object.keys(currentValidationErrors).length > 0) {
      setValidationErrors(currentValidationErrors);
      toast.error('입력 내용을 확인해주세요.');
      return;
    }

    const payload: GeneralSettingsData = { storeInfo, operationHours };
    await updateGeneralSettings(payload, {
      onSuccess: (updatedData) => {
        toast.success('일반 설정이 성공적으로 저장되었습니다.');
        if (updatedData) {
            setStoreInfo(updatedData.storeInfo || INITIAL_STORE_INFO);
            setOperationHours(updatedData.operationHours || INITIAL_OPERATION_HOURS);
        }
        setValidationErrors({}); // Clear errors on success
      },
      onError: (error) => {
        toast.error(error.message || '설정 저장 중 오류가 발생했습니다.');
      },
    });
  };

  const GeneralSettingsSkeleton = () => (
    <CardContent className="space-y-8 pt-6">
        <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><Store className="mr-2 h-5 w-5 text-primary" /><Skeleton className="h-6 w-32" /></h3>
            <Skeleton className="h-40 w-full" /> {/* StoreInfoForm Placeholder */}
        </section>
        <Separator />
        <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" /><Skeleton className="h-6 w-32" /></h3>
            <Skeleton className="h-64 w-full" /> {/* OperationHoursForm Placeholder */}
        </section>
        <Separator />
        <div className="flex justify-end pt-4"><Skeleton className="h-12 w-36" /></div>
    </CardContent>
  );

  return (
    <>
      {/* <Toaster richColors position="top-right" /> */}
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">시스템 설정</h1>
            <p className="text-muted-foreground">
              카페 시스템의 다양한 설정을 관리합니다.
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>일반 설정</span>
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 2.69l.94-2.69.94 2.69L15 3l-2.06 1.88.94 2.69L12 6.5l-1.88 1.07.94-2.69L9 3l1.06-.31.94-2.69z"/><path d="M2 12.38V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6.62"/><path d="M2 8.88V7a2 2 0 0 1 2-2h.5"/><path d="M22 7a2 2 0 0 0-2-2h-.5"/><path d="M7 2h10"/><path d="M7 22h10"/></svg>
              <span>화면 설정</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2" disabled>
              <CreditCard className="h-4 w-4" />
              <span>결제 설정</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2" disabled>
              <ShieldAlert className="h-4 w-4" />
              <span>보안 설정</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2" disabled>
              <Database className="h-4 w-4" />
              <span>데이터베이스</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2" disabled>
              <Server className="h-4 w-4" />
              <span>API 설정</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center"><Settings className="mr-2 h-5 w-5"/>일반 설정</CardTitle>
                <CardDescription>
                  매장 기본 정보, 운영 시간 등 시스템의 일반적인 설정을 관리합니다.
                  {generalSettingsError && <span className="text-red-500 ml-2"> (데이터 로드 실패: {generalSettingsError.message})</span>}
                </CardDescription>
              </CardHeader>
              {isLoadingGeneralSettings && !fetchedGeneralSettings ? (
                  <GeneralSettingsSkeleton />
              ) : (
                <CardContent className="space-y-8 pt-6">
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Store className="mr-2 h-5 w-5 text-primary"/>매장 정보</h3>
                    <StoreInfoForm 
                      initialData={storeInfo} 
                      onDataChange={handleStoreInfoChange} 
                      validationErrors={validationErrors.storeInfo || {}}
                    />
                  </section>
                  
                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Clock className="mr-2 h-5 w-5 text-primary"/>운영 시간 설정</h3>
                    <OperationHoursForm 
                      initialData={operationHours} 
                      onDataChange={handleOperationHoursChange} 
                      validationErrors={validationErrors.operationHours || {}}
                    />
                  </section>
                  
                  <Separator />

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveChanges} 
                      disabled={isUpdatingGeneralSettings || isLoadingGeneralSettings}
                      className="min-w-[120px]"
                    >
                      {isUpdatingGeneralSettings ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      변경 사항 저장
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="interface">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5"><path d="M12 2.69l.94-2.69.94 2.69L15 3l-2.06 1.88.94 2.69L12 6.5l-1.88 1.07.94-2.69L9 3l1.06-.31.94-2.69z"/><path d="M2 12.38V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6.62"/><path d="M2 8.88V7a2 2 0 0 1 2-2h.5"/><path d="M22 7a2 2 0 0 0-2-2h-.5"/><path d="M7 2h10"/><path d="M7 22h10"/></svg>
                  화면 설정
                </CardTitle>
                <CardDescription>
                  시스템의 테마, 언어, 폰트 크기 등 사용자 인터페이스 관련 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <section className="space-y-3 p-4 border rounded-md">
                  <h4 className="font-medium">테마 설정</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>라이트 모드, 다크 모드 또는 시스템 설정을 따르도록 선택할 수 있습니다. (현재 기능 준비 중)</p>
                    {/* 테마 변경 컴포넌트 위치 (예: Select 또는 RadioGroup) */}
                  </div>
                </section>
                <section className="space-y-3 p-4 border rounded-md">
                  <h4 className="font-medium">언어 설정</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>표시 언어를 선택합니다. (현재 기능 준비 중, 기본 한국어)</p>
                    {/* 언어 선택 컴포넌트 위치 (예: Select) */}
                  </div>
                </section>
                <section className="space-y-3 p-4 border rounded-md">
                  <h4 className="font-medium">폰트 크기</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>시스템 전체 폰트 크기를 조절합니다. (현재 기능 준비 중)</p>
                    {/* 폰트 크기 조절 컴포넌트 위치 (예: Slider 또는 Select) */}
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Other TabsContent for payment, security, etc. can be added here */}
          {/* 예시: <TabsContent value="payment"><PaymentSettings /></TabsContent> */}

        </Tabs>
      </div>
    </>
  );
} 