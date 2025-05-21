'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  AlertCircle, 
  Check, 
  ExternalLink, 
  FileUp, 
  Save, 
  X 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// 결제 설정 폼 스키마
const paymentSettingsSchema = z.object({
  client_id: z.string().min(1, '클라이언트 ID는 필수입니다'),
  client_secret: z.string().optional(),
  is_active: z.boolean().default(false),
  additional_settings: z.record(z.string(), z.any()).optional(),
});

type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>;

// 설정 백업 다이얼로그 컴포넌트
function BackupRestoreDialog({ onBackup, onRestore }: { onBackup: () => void, onRestore: (file: File) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleRestore = () => {
    if (selectedFile) {
      onRestore(selectedFile);
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2">백업 및 복원</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>결제 설정 백업 및 복원</DialogTitle>
          <DialogDescription>
            현재 결제 설정을 백업하거나 이전 백업에서 복원할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">백업</h4>
            <p className="text-sm text-muted-foreground">
              현재 설정의 백업 파일을 생성하여 다운로드합니다.
            </p>
            <Button onClick={onBackup} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              백업 파일 생성
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">복원</h4>
            <p className="text-sm text-muted-foreground">
              백업 파일에서 설정을 복원합니다. 주의: 현재 설정을 덮어씁니다.
            </p>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input 
                id="backup-file" 
                type="file" 
                accept=".json" 
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" type="button">
            취소
          </Button>
          <Button 
            type="button" 
            onClick={handleRestore}
            disabled={!selectedFile}
          >
            <FileUp className="mr-2 h-4 w-4" />
            설정 복원
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 결제 제공사 설정 카드 컴포넌트
function PaymentProviderCard({
  title,
  description,
  logoSrc,
  provider,
  disabled = false,
  documentUrl,
  initialData,
  onSubmit,
  onToggle,
}: {
  title: string;
  description: string;
  logoSrc?: string;
  provider: 'naverpay' | 'kakaopay';
  disabled?: boolean;
  documentUrl: string;
  initialData: any;
  onSubmit: (provider: string, data: PaymentSettingsFormValues) => void;
  onToggle: (provider: string) => void;
}) {
  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      client_id: initialData?.client_id || '',
      client_secret: '',
      is_active: initialData?.is_active || false,
      additional_settings: initialData?.additional_settings || {},
    },
  });
  
  // 초기 데이터 업데이트 시 폼 값 업데이트
  useEffect(() => {
    if (initialData) {
      form.reset({
        client_id: initialData.client_id || '',
        client_secret: '',
        is_active: initialData.is_active || false,
        additional_settings: initialData.additional_settings || {},
      });
    }
  }, [initialData, form]);
  
  const handleSubmit = (data: PaymentSettingsFormValues) => {
    onSubmit(provider, data);
  };
  
  const handleToggle = () => {
    onToggle(provider);
  };
  
  return (
    <Card className={disabled ? 'opacity-70' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {logoSrc ? (
              <img src={logoSrc} alt={title} className="h-8" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {title.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={disabled}>
            <ExternalLink className="h-4 w-4 mr-2" />
            API 문서
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>클라이언트 ID</FormLabel>
              <FormControl>
                <Input 
                  {...form.register('client_id')} 
                  placeholder="API 클라이언트 ID를 입력하세요" 
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            
            <FormItem>
              <FormLabel>클라이언트 시크릿</FormLabel>
              <FormControl>
                <Input 
                  {...form.register('client_secret')} 
                  type="password" 
                  placeholder={initialData?.client_secret_masked ? '••••••••••••' : 'API 클라이언트 시크릿을 입력하세요'} 
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch 
                  id={`${provider}-active`}
                  checked={form.watch('is_active')}
                  onCheckedChange={handleToggle}
                  disabled={disabled || !initialData?.client_id}
                />
                <label 
                  htmlFor={`${provider}-active`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {form.watch('is_active') ? '활성화됨' : '비활성화됨'}
                </label>
              </div>
              
              <Button type="submit" disabled={disabled}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </div>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="text-xs text-muted-foreground">
          {initialData?.updated_at ? `마지막 업데이트: ${new Date(initialData.updated_at).toLocaleString()}` : '설정되지 않음'}
        </div>
      </CardFooter>
    </Card>
  );
}

export default function PaymentSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<{
    naverpay: any;
    kakaopay: any;
  } | null>(null);
  
  // 결제 설정 불러오기
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 개발 환경에서 하드코딩된 API 키 사용
      const isDev = process.env.NODE_ENV === 'development';
      
      if (isDev) {
        // 개발 환경에서 하드코딩된 설정 사용
        setSettings({
          naverpay: {
            provider: 'naverpay',
            is_active: true,
            client_id: 'HN3GGCMDdTgGUfl0kFCo',
            client_secret_masked: '••••••••••••',
            additional_settings: {
              partner_id: 'np_pbyrr410908',
              chain_id: 'c1l0UTFCMlNwNjY',
              api_url: 'https://dev-pub.apis.naver.com'
            },
            updated_at: new Date().toISOString()
          },
          kakaopay: {
            provider: 'kakaopay',
            is_active: true,
            client_id: 'kakaoadmin_api_key_here',
            client_secret_masked: '••••••••••••',
            additional_settings: {},
            updated_at: new Date().toISOString()
          }
        });
      } else {
        // 프로덕션 환경에서는 API에서 설정 가져오기
        const response = await fetch('/api/admin/settings/payment');
        
        if (!response.ok) {
          throw new Error('설정을 불러오는 중 오류가 발생했습니다');
        }
        
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('결제 설정 로딩 오류:', err);
      toast.error('결제 설정을 불러오지 못했습니다.', { description: '데이터 로딩 중 문제가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 결제 설정 저장
  const saveSettings = async (provider: string, data: PaymentSettingsFormValues) => {
    try {
      setIsLoading(true);
      
      // 개발 환경에서는 API 호출 없이 로컬 상태 업데이트
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경에서는 클라이언트 사이드에서만 상태 업데이트
        const updatedData = {
          ...data,
          provider,
          client_secret_masked: data.client_secret ? '••••••••••••' : (settings?.[provider as 'naverpay' | 'kakaopay']?.client_secret_masked || ''),
          updated_at: new Date().toISOString()
        };
      
      // 설정 상태 업데이트
        setSettings(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [provider]: updatedData,
          };
        });
        
        toast.success(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'} 설정이 성공적으로 저장되었습니다.`);
        fetchSettings();
      } else {
        // 프로덕션 환경에서는 API 호출
        const response = await fetch(`/api/admin/settings/payment/${provider}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('설정을 저장하는 중 오류가 발생했습니다');
        }
        
        const updatedData = await response.json();
        
        // 설정 상태 업데이트
        setSettings(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [provider]: updatedData,
          };
        });
        
        toast.success(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'} 설정이 성공적으로 저장되었습니다.`);
        fetchSettings();
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('결제 설정 저장 오류:', err);
      
      toast.error(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'} 설정 저장에 실패했습니다.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 결제 제공업체 활성화/비활성화 토글
  const toggleProvider = async (provider: string) => {
    try {
      setIsLoading(true);
      
      // 개발 환경에서는 API 호출 없이 로컬 상태 업데이트
      if (process.env.NODE_ENV === 'development') {
        // 현재 설정 가져오기
        const currentSettings = settings?.[provider as 'naverpay' | 'kakaopay'];
        if (!currentSettings) {
          throw new Error('설정을 찾을 수 없습니다');
        }
        
        // 상태 토글
        const isActive = !currentSettings.is_active;
        
        // 업데이트된 데이터
        const updatedData = {
          ...currentSettings,
          is_active: isActive,
          updated_at: new Date().toISOString()
        };
      
      // 설정 상태 업데이트
        setSettings(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [provider]: updatedData,
          };
        });
        
        toast.success(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'}가 ${updatedData.is_active ? '활성화' : '비활성화'}되었습니다.`);
        fetchSettings();
      } else {
        // 프로덕션 환경에서는 API 호출
        const response = await fetch(`/api/admin/settings/payment/${provider}/toggle`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error('설정을 변경하는 중 오류가 발생했습니다');
        }
        
        const updatedData = await response.json();
        
        // 설정 상태 업데이트
        setSettings(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [provider]: updatedData,
          };
        });
        
        toast.success(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'}가 ${updatedData.is_active ? '활성화' : '비활성화'}되었습니다.`);
        fetchSettings();
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('결제 제공업체 토글 오류:', err);
      
      toast.error(`${provider === 'naverpay' ? '네이버페이' : '카카오페이'} 상태 변경에 실패했습니다.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 결제 설정 백업
  const backupSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings/payment/backup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('설정을 백업하는 중 오류가 발생했습니다');
      }
      
      const data = await response.json();
      
      toast.success('결제 설정이 성공적으로 백업되었습니다.');
      
      // 백업 파일 다운로드 (서버에서 제공하는 경우)
      if (data.file) {
        const a = document.createElement('a');
        a.href = `/static/backup/${data.file}`;
        a.download = data.file.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('결제 설정 백업 오류:', err);
      
      toast.error('설정 백업에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 결제 설정 복원
  const restoreSettings = async (file: File) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/settings/payment/restore', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('설정을 복원하는 중 오류가 발생했습니다');
      }
      
      const data = await response.json();
      
      toast.success('결제 설정이 성공적으로 복원되었습니다.');
      
      // 설정 다시 불러오기
      fetchSettings();
    } catch (err) {
      setError((err as Error).message);
      console.error('결제 설정 복원 오류:', err);
      
      toast.error('설정 복원에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, []);
  
  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">결제 API 설정</h2>
          <p className="text-muted-foreground">
            네이버페이, 카카오페이 결제 연동을 위한 API 키 설정을 관리합니다.
          </p>
        </div>
        <BackupRestoreDialog 
          onBackup={backupSettings}
          onRestore={restoreSettings}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentProviderCard
          title="네이버페이"
          description="네이버페이 결제 시스템 연동 설정"
          provider="naverpay"
          documentUrl="https://developer.pay.naver.com/docs/v2/api"
          initialData={settings?.naverpay}
          onSubmit={saveSettings}
          onToggle={toggleProvider}
        />
        
        <PaymentProviderCard
          title="카카오페이"
          description="카카오페이 결제 시스템 연동 설정"
          provider="kakaopay"
          documentUrl="https://developers.kakao.com/docs/latest/ko/kakaopay/common"
          initialData={settings?.kakaopay}
          onSubmit={saveSettings}
          onToggle={toggleProvider}
        />
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>중요</AlertTitle>
        <AlertDescription>
          결제 API 키는 암호화되어 저장되며, 보안을 위해 시크릿 키는 마스킹 처리됩니다.
          변경이 필요한 경우에만 새 값을 입력하세요.
        </AlertDescription>
      </Alert>
    </div>
  );
} 