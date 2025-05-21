'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Bell, Eye, Trash2, CheckCircle, XCircle, AlertTriangle, ShoppingCart, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Search, Filter as FilterIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery, useApiMutation } from '@/hooks/useApiClient';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from '@/hooks/useDebounce';
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { formatRelativeDate } from '@/lib/utils';

// 알림 항목 인터페이스 (가정)
export interface NotificationItem {
  id: string; // 또는 number
  type: 'info' | 'warning' | 'error' | 'success' | 'stock'; // 알림 종류 (예: 일반정보, 경고, 오류, 성공, 재고부족 등)
  title: string; // 알림 제목
  message: string; // 알림 내용
  created_at: string; // 생성 일시 (ISO 문자열)
  is_read: boolean; // 읽음 여부
  importance?: 'low' | 'medium' | 'high'; // 중요도 (선택적)
  link?: string; // 관련 링크 (선택적)
}

// 알림 설정 관련 인터페이스 (가정)
interface NotificationSetting {
  id: string; 
  key: string; // API 요청 시 사용될 키 (예: 'newOrderNotifications')
  label: string; 
  enabled: boolean;
  description?: string;
}

interface NotificationSettingsData {
  // 예시: { newOrderNotifications: true, lowStockNotifications: false }
  [key: string]: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Record<string, boolean>>({});
  
  // 필터링 및 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterReadStatus, setFilterReadStatus] = useState<'all' | 'read' | 'unread'>('all');
  // const [filterImportance, setFilterImportance] = useState<'all' | 'low' | 'medium' | 'high'>('all'); // 추후 확장 가능
  // const [filterType, setFilterType] = useState<'all' | NotificationItem['type'][]>('all'); // 추후 확장 가능

  // 알림 설정 상태
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);

  // fetchNotifications 로직을 useApiQuery로 대체
  const { 
    data: fetchedNotifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
    manualFetch: triggerFetchNotifications 
  } = useApiQuery<NotificationItem[]>('/api/admin/notifications'); // 엔드포인트 전달

  // 알림 설정 fetch (useApiQuery 사용)
  const {
    data: fetchedSettings,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useApiQuery<NotificationSettingsData>('/api/admin/notification-settings'); // 실제 엔드포인트

  // 알림 설정 업데이트 (useApiMutation 사용)
  const { 
    mutate: updateSettingMutation,
    isLoading: isSettingUpdating 
  } = useApiMutation<NotificationSettingsData, { key: string; enabled: boolean }>(
    'PUT',
    '/api/admin/notification-settings' // 실제 엔드포인트, 요청 시 body에 key와 enabled 전달
  );

  // 데이터 패칭 및 상태 업데이트
  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      // useApiQuery의 refetch 또는 manualFetch를 사용하여 데이터 로드
      // useApiQuery가 endpoint를 받으면 자동으로 fetch하도록 수정하거나,
      // 여기서 명시적으로 호출. 현재 useApiQuery는 자동 fetch 로직이 주석처리 되어있음.
      // 따라서 manualFetch를 사용.
      triggerFetchNotifications('/api/admin/notifications');
    }
  }, [authLoading, isAuthenticated, token, triggerFetchNotifications]);

  useEffect(() => {
    if (fetchedNotifications) {
      // 최신 알림이 위로 오도록 정렬
      const sortedNotifications = [...fetchedNotifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(sortedNotifications);
    }
  }, [fetchedNotifications]);
  
  // 알림 읽음/안읽음 처리 (PUT)
  const { mutate: toggleReadStatusMutation, isLoading: isToggleReadLoading } = useApiMutation<
    NotificationItem, // 응답 타입 (수정된 알림 객체 또는 단순 성공 여부)
    { is_read: boolean } // 요청 변수 타입
  >(
    'PUT',
    (params) => `/api/admin/notifications/${params.notificationId}/read` // params에서 notificationId를 받아 엔드포인트 생성
  );

  // 알림 삭제 처리 (DELETE)
  const { mutate: deleteNotificationMutation, isLoading: isDeleteLoading } = useApiMutation<
    null, // 응답 타입 (보통 null 또는 성공 메시지)
    { notificationId: string } // 요청 변수 타입
  >(
    'DELETE',
    (params) => `/api/admin/notifications/${params.notificationId}`
  );

  // 초기 설정 데이터 로드 및 UI용 데이터 변환
  useEffect(() => {
    if (fetchedSettings) {
      // API 응답(fetchedSettings)을 UI에서 사용할 NotificationSetting[] 형태로 변환
      // 이 부분은 실제 API 응답 구조에 따라 맞춤 설정 필요
      const settingsForUI: NotificationSetting[] = [
        { id: 'newOrder', key: 'newOrderNotifications', label: '새 주문 알림', enabled: fetchedSettings.newOrderNotifications ?? true, description: '새로운 주문이 접수되면 알림을 받습니다.' },
        { id: 'lowStock', key: 'lowStockNotifications', label: '재고 부족 알림', enabled: fetchedSettings.lowStockNotifications ?? true, description: '특정 상품의 재고가 설정된 임계값 이하로 떨어지면 알림을 받습니다.' },
        { id: 'systemUpdates', key: 'systemUpdateNotifications', label: '시스템 업데이트 알림', enabled: fetchedSettings.systemUpdateNotifications ?? false, description: '시스템 관련 주요 업데이트 및 공지사항 알림을 받습니다.' },
      ];
      setNotificationSettings(settingsForUI);
    }
  }, [fetchedSettings]);

  useEffect(() => {
    // 페이지 로드 시 설정 데이터 가져오기
    if (isAuthenticated && token) {
        refetchSettings();
    }
  }, [isAuthenticated, token, refetchSettings]);

  const handleSettingChange = async (settingKey: string, newEnabledState: boolean) => {
    await updateSettingMutation({ key: settingKey, enabled: newEnabledState }, {
      onSuccess: (updatedData) => {
        toast.success('알림 설정이 업데이트되었습니다.');
        // 로컬 상태 업데이트 (UI에 즉시 반영)
        setNotificationSettings(prevSettings => 
          prevSettings.map(s => s.key === settingKey ? { ...s, enabled: newEnabledState } : s)
        );
        // 또는 refetchSettings()를 호출하여 서버에서 최신 설정 다시 가져오기
        // refetchSettings(); 
      },
      onError: (error) => {
        toast.error(error.message || '알림 설정 업데이트 중 오류 발생');
        // 실패 시 UI 롤백 (선택적)
        setNotificationSettings(prevSettings => 
            prevSettings.map(s => s.key === settingKey ? { ...s, enabled: !newEnabledState } : s)
          );
      }
    });
  };

  const handleToggleReadStatus = async (notificationId: string, currentIsRead: boolean) => {
    if (authLoading || !isAuthenticated || !token) {
        toast.warning('인증 상태를 확인 중이거나 유효하지 않은 세션입니다.');
        return;
    }
    const newReadStatus = !currentIsRead;
    
    // @ts-ignore: endpointGenerator가 variables를 받는데, mutate는 is_read만 넘기므로 id를 추가 전달해야 함
    // 또는 useApiMutation의 endpointGenerator가 mutate 시점에 모든 필요 정보를 받을 수 있도록 구조 변경 필요
    // 임시로 variables에 notificationId를 포함하여 전달
    const result = await toggleReadStatusMutation({ is_read: newReadStatus, notificationId: notificationId as any }, {
      onSuccess: (updatedNotification) => {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: newReadStatus } : n)
        );
        toast.success(`알림이 ${newReadStatus ? '읽음' : '안읽음'} 상태로 변경되었습니다.`);
      },
      onError: (error) => {
        toast.error(error.message || '알림 상태 변경 중 오류 발생');
      }
    });
  };
  
  const handleDeleteNotification = async (notificationId: string) => {
    if (authLoading || !isAuthenticated || !token) {
        toast.warning('인증 상태를 확인 중이거나 유효하지 않은 세션입니다.');
        return;
    }
    if (!confirm('정말로 이 알림을 삭제하시겠습니까?')) return;

    await deleteNotificationMutation({ notificationId }, {
      onSuccess: () => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast.success('알림이 삭제되었습니다.');
      },
      onError: (error) => {
        toast.error(error.message || '알림 삭제 중 오류 발생');
      }
    });
  };

  const toggleExpandNotification = (id: string) => {
    setExpandedNotifications(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getImportanceBadge = (importance?: 'low' | 'medium' | 'high') => {
    if (!importance) return null;
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' = 'outline';
    if (importance === 'high') variant = 'destructive';
    else if (importance === 'medium') variant = 'secondary'; // shadcn badge에는 warning이 없으므로 secondary 사용
    return <Badge variant={variant} className="capitalize">{importance}</Badge>;
  };

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'info': return <Bell className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case 'stock': return <ShoppingCart className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
      default: return <Bell className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    let items = [...notifications];

    // 읽음 상태 필터
    if (filterReadStatus === 'read') {
      items = items.filter(n => n.is_read);
    } else if (filterReadStatus === 'unread') {
      items = items.filter(n => !n.is_read);
    }

    // 중요도 필터 (추후 구현 시)
    // if (filterImportance !== 'all') {
    //   items = items.filter(n => n.importance === filterImportance);
    // }

    // 검색어 필터 (제목 또는 메시지)
    if (debouncedSearchTerm) {
      items = items.filter(n => 
        n.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    return items;
  }, [notifications, debouncedSearchTerm, filterReadStatus /*, filterImportance */]);

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 text-center">사용자 인증 정보를 확인 중입니다...</div>
      </AdminLayout>
    );
  }

  const isLoading = notificationsLoading || authLoading; // 실제 데이터 로딩 상태
  const currentError = notificationsError;

  if (isLoading && notifications.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 md:p-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center"><Bell className="mr-3 h-6 w-6" /> 알림 관리</CardTitle>
            <CardDescription>시스템 알림을 확인하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border-b">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-sm" />
                <div className="space-y-2 flex-grow">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </div>
      </AdminLayout>
    );
  }

  if (currentError) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-4 text-center">
          <p className="text-red-500">오류: {currentError.message}</p>
          <Button onClick={() => refetchNotifications()} className="mt-4">다시 시도</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Toaster richColors position="top-right" />
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* 알림 목록 카드 */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <CardTitle className="text-2xl font-bold flex items-center"><Bell className="mr-3 h-6 w-6" /> 알림 관리</CardTitle>
                <Button variant="outline" size="sm" onClick={() => triggerFetchNotifications('/api/admin/notifications')} disabled={notificationsLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${notificationsLoading ? 'animate-spin' : ''}`} /> 새로고침
                </Button>
            </div>
            <CardDescription className="mt-1">
              시스템 알림을 확인하고 관리합니다. (총 {filteredNotifications.length} / {notifications.length}개 표시 중)
            </CardDescription>
            
            {/* 필터 및 검색 UI 추가 */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative sm:flex-grow">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search"
                  placeholder="알림 제목 또는 내용 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
                {searchTerm && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <FilterIcon className="h-4 w-4 text-muted-foreground sm:hidden" /> {/* 모바일에서 필터 아이콘만 */} 
                <Select value={filterReadStatus} onValueChange={(value) => setFilterReadStatus(value as any)}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="읽음 상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모두</SelectItem>
                    <SelectItem value="read">읽음</SelectItem>
                    <SelectItem value="unread">안읽음</SelectItem>
                  </SelectContent>
                </Select>
                {/* 중요도/타입 필터 추가 위치 */}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredNotifications.length === 0 && !notificationsLoading ? (
              <p className="text-center text-gray-500 py-10">
                {searchTerm || filterReadStatus !== 'all' ? '검색/필터 결과가 없습니다.' : '새로운 알림이 없습니다.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredNotifications.map((notification) => {
                  const isExpanded = expandedNotifications[notification.id] || false;
                  return (
                    <li key={notification.id} className={`transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5 dark:bg-primary/10' : 'bg-card'}`}>
                      <div className="p-4 flex flex-col sm:flex-row items-start space-x-0 sm:space-x-3">
                        <div className="flex items-start w-full sm:w-auto mb-2 sm:mb-0">
                            <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${!notification.is_read ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} mr-3`}></span>
                            <div className="flex-shrink-0 w-5 h-5">{getTypeIcon(notification.type)}</div>
                        </div>
                        <div className="flex-grow space-y-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <h3 className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-card-foreground truncate pr-2`} title={notification.title}>
                              {notification.title}
                            </h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{formatRelativeDate(notification.created_at)}</span>
                          </div>
                          <div className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {notification.message}
                          </div>
                          {(notification.message.length > 80 || notification.message.split('\n').length > 2) && (
                            <Button variant="link" size="sm" onClick={() => toggleExpandNotification(notification.id)} className="p-0 h-auto text-xs mt-1">
                              {isExpanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                              {isExpanded ? '간략히 보기' : '자세히 보기'}
                            </Button>
                          )}
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                            {getImportanceBadge(notification.importance)}
                            {notification.link && (
                              <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                                관련 링크 <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 items-center mt-3 sm:mt-0 sm:ml-3 flex-shrink-0">
                          <Button
                            variant={notification.is_read ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleReadStatus(notification.id, notification.is_read)}
                            disabled={isToggleReadLoading || notificationsLoading}
                            aria-pressed={notification.is_read}
                            aria-label={notification.is_read ? "안읽음으로 표시" : "읽음으로 표시"}
                            className="w-full sm:w-[100px] justify-start sm:justify-center"
                          >
                            <Eye className="mr-1.5 h-4 w-4" /> {notification.is_read ? '안 읽음' : '읽음'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteNotification(notification.id)}
                            disabled={isDeleteLoading || notificationsLoading}
                            aria-label="알림 삭제"
                            className="w-full sm:w-[100px] justify-start sm:justify-center hover:border-destructive hover:text-destructive"
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" /> 삭제
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 알림 설정 카드 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold">알림 수신 설정</CardTitle>
            <CardDescription>수신하고 싶은 알림 종류를 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {settingsLoading && !settingsError && (
              <div className="space-y-3">
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-10" />
                    </div>
                ))}
              </div>
            )}
            {settingsError && (
                <p className="text-red-500 text-center py-4">알림 설정을 불러오는 데 실패했습니다: {settingsError.message}</p>
            )}
            {!settingsLoading && !settingsError && notificationSettings.length > 0 && (
              notificationSettings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div className="space-y-0.5 mr-4">
                    <Label htmlFor={`setting-${setting.id}`} className="font-medium text-sm">
                      {setting.label}
                    </Label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`setting-${setting.id}`}
                    checked={setting.enabled}
                    onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                    disabled={isSettingUpdating}
                    aria-label={`${setting.label} 알림 ${setting.enabled ? '끄기' : '켜기'}`}
                  />
                </div>
              ))
            )}
            {!settingsLoading && !settingsError && notificationSettings.length === 0 && (
                <p className="text-center text-gray-500 py-4">설정 가능한 알림 항목이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 