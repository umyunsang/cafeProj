'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, Save, RefreshCw, History } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

// inventory/page.tsx 에서 Ingredient 타입을 가져오거나 여기에 직접 정의
interface Ingredient {
  id: number;
  name: string;
  description?: string;
  unit: string;
  min_stock_level: number;
  is_active: boolean;
  current_quantity: number; // 현재 수량도 수정 가능하도록
  // is_in_stock, stock_status 등은 current_quantity와 min_stock_level에 의해 파생될 수 있으므로 폼에서는 직접 다루지 않을 수 있음
}

interface IngredientFormData {
  name: string;
  description: string;
  unit: string;
  min_stock_level: string; // number로 변환 필요
  current_quantity: string; // number로 변환 필요
  is_active: boolean;
}

// 입출고 기록 아이템 인터페이스 (가정)
interface StockHistoryItem {
  id: number;
  changed_at: string; // 변경 일시 (ISO 문자열)
  type: '입고' | '출고' | '조정' | '초기화'; // 변경 유형
  quantity_changed: number; // 변경된 수량 (양수: 입고/증가, 음수: 출고/감소)
  reason?: string; // 변경 사유 (선택적)
  user?: string; // 변경 담당자 (선택적)
  quantity_after_change: number; // 변경 후 총 수량
}

export default function EditInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const ingredientId = params.id as string;
  const { token, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [ingredient, setIngredient] = useState<IngredientFormData | null>(null);
  const [initialIngredientName, setInitialIngredientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      toast.error('접근 권한이 없습니다. 로그인 페이지로 이동합니다.');
      logout();
      return;
    }

    if (!ingredientId) {
      router.push('/admin/inventory');
      return;
    }

    const fetchIngredientDetails = async () => {
      setLoading(true);
      setError(null);

      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        logout();
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/inventory/stock/${ingredientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (response.status === 401) {
          toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
          logout();
          return;
        }
        if (!response.ok) {
          throw new Error('재료 정보를 불러오는데 실패했습니다.');
        }
        const data: Ingredient = await response.json();
        setIngredient({
          name: data.name,
          description: data.description || '',
          unit: data.unit,
          min_stock_level: data.min_stock_level.toString(),
          current_quantity: data.current_quantity.toString(),
          is_active: data.is_active,
        });
        setInitialIngredientName(data.name); 
      } catch (err: any) {
        setError(err.message || '재료 정보를 불러오는 중 오류 발생');
        toast.error(err.message || '재료 정보를 불러오는 중 오류 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchIngredientDetails();
  }, [ingredientId, router, token, isAuthenticated, authLoading, logout]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setIngredient(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSwitchChange = (checked: boolean) => {
    setIngredient(prev => prev ? { ...prev, is_active: checked } : null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ingredient || authLoading) return;
    if (!isAuthenticated) {
        toast.error('세션이 만료되었거나 권한이 없습니다.');
        logout();
        return;
    }

    // 유효성 검사 강화
    if (!ingredient.name.trim() || ingredient.name.trim().length < 2) {
      toast.error('재료 이름은 2자 이상 입력해주세요.');
      return;
    }
    if (ingredient.name.trim().length > 50) { // 예: 최대 길이 50자
      toast.error('재료 이름은 50자 이하로 입력해주세요.');
      return;
    }
    if (!ingredient.unit.trim() || ingredient.unit.trim().length > 10) {
        toast.error('단위는 1자 이상 10자 이하로 입력해주세요.');
        return;
    }
    if (isNaN(parseFloat(ingredient.current_quantity)) || parseFloat(ingredient.current_quantity) < 0 || parseFloat(ingredient.current_quantity) > 99999) {
      toast.error('현재 수량은 0 이상 99999 이하의 숫자로 입력해주세요.');
      return;
    }
    if (isNaN(parseFloat(ingredient.min_stock_level)) || parseFloat(ingredient.min_stock_level) < 0 || parseFloat(ingredient.min_stock_level) > 99999) {
      toast.error('최소 재고량은 0 이상 99999 이하의 숫자로 입력해주세요.');
      return;
    }
    if (ingredient.description && ingredient.description.length > 200) { // 설명 최대 길이
        toast.error('설명은 200자 이하로 입력해주세요.');
        return;
    }

    setSaving(true);
    setError(null);
    if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        logout();
        setSaving(false);
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/inventory/stock/${ingredientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: ingredient.name,
          description: ingredient.description,
          unit: ingredient.unit,
          min_stock_level: parseFloat(ingredient.min_stock_level),
          current_quantity: parseFloat(ingredient.current_quantity),
          is_active: ingredient.is_active,
        }),
      });

      if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '재료 정보 수정에 실패했습니다.');
      }
      toast.success(`재료 '${ingredient.name}' 정보가 성공적으로 수정되었습니다.`);
      router.push('/admin/inventory');
    } catch (err: any) {
      setError(err.message || '재료 정보 저장 중 오류 발생');
      toast.error(err.message || '재료 정보 저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  };

  // 입출고 기록 Fetch useEffect
  useEffect(() => {
    if (authLoading || !isAuthenticated || !ingredientId || !token) return;

    const fetchStockHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/inventory/stock/${ingredientId}/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });
        if (response.status === 401) {
          toast.error('인증 만료 (기록 조회)');
          logout();
          return;
        }
        if (!response.ok) {
          throw new Error('재고 변경 기록을 불러오는데 실패했습니다.');
        }
        const data: StockHistoryItem[] = await response.json();
        setStockHistory(data.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()));
      } catch (err: any) {
        setHistoryError(err.message || '기록 조회 중 오류 발생');
        toast.error(err.message || '기록 조회 중 오류 발생');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchStockHistory();
  }, [ingredientId, token, isAuthenticated, authLoading, logout]);

  if (authLoading || loading) return <AdminLayout><div className="container p-4 text-center">데이터 로딩 중...</div></AdminLayout>;
  if (error && !ingredient) return <AdminLayout><div className="container p-4 text-center text-red-500">오류: {error}</div></AdminLayout>;
  if (!isAuthenticated && !authLoading) return <AdminLayout><div className="container p-4 text-center">인증 정보 없음. 로그인 페이지로 이동합니다...</div></AdminLayout>;
  if (!ingredient) return <AdminLayout><div className="container p-4 text-center">재료 정보를 찾을 수 없습니다.</div></AdminLayout>;

  return (
    <AdminLayout>
      <Toaster richColors position="top-right" />
      <div className="container mx-auto p-4 md:p-6">
        <Button variant="outline" onClick={() => router.push('/admin/inventory')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> 재고 목록으로
        </Button>

        <Card className="max-w-2xl mx-auto shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">재고 항목 수정: {initialIngredientName}</CardTitle>
            <CardDescription>재료의 세부 정보를 수정하고 현재 수량을 업데이트합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">재료명 <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={ingredient.name} onChange={handleInputChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea id="description" name="description" value={ingredient.description} onChange={handleInputChange} className="mt-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="current_quantity">현재 수량 <span className="text-red-500">*</span></Label>
                  <Input id="current_quantity" name="current_quantity" type="number" value={ingredient.current_quantity} onChange={handleInputChange} required className="mt-1" placeholder="예: 100"/>
                </div>
                <div>
                  <Label htmlFor="unit">단위 <span className="text-red-500">*</span></Label>
                  <Input id="unit" name="unit" value={ingredient.unit} onChange={handleInputChange} required className="mt-1" placeholder="예: kg, 개, L"/>
                </div>
              </div>
              <div>
                <Label htmlFor="min_stock_level">최소 재고량 (알림 기준) <span className="text-red-500">*</span></Label>
                <Input id="min_stock_level" name="min_stock_level" type="number" value={ingredient.min_stock_level} onChange={handleInputChange} required className="mt-1" placeholder="예: 10"/>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={ingredient.is_active} onCheckedChange={handleSwitchChange} />
                <Label htmlFor="is_active">활성 상태 (사용 중인 재료)</Label>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/inventory')} disabled={saving || authLoading}>
                  취소
                </Button>
                <Button type="submit" disabled={saving || authLoading}>
                  {saving ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> 변경사항 저장</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <History className="mr-2 h-5 w-5" />
              재고 변경 기록: {initialIngredientName}
            </CardTitle>
            <CardDescription>해당 재료의 최근 입출고 및 조정 내역입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading && <p className="text-center py-4">기록을 불러오는 중...</p>}
            {historyError && <p className="text-red-500 text-center py-4">오류: {historyError}</p>}
            {!historyLoading && !historyError && stockHistory.length === 0 && (
              <p className="text-center text-gray-500 py-4">재고 변경 기록이 없습니다.</p>
            )}
            {!historyLoading && !historyError && stockHistory.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>변경일시</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead className="text-right">변경수량</TableHead>
                    <TableHead className="text-right">변경후수량</TableHead>
                    <TableHead>사유</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.changed_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            item.type === '입고' ? 'success' : 
                            item.type === '출고' ? 'destructive' : 
                            item.type === '조정' ? 'secondary' : 'outline'
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${item.quantity_changed > 0 ? 'text-green-600' : item.quantity_changed < 0 ? 'text-red-600' : ''}`}>
                        {item.quantity_changed > 0 ? '+' : ''}{item.quantity_changed}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity_after_change}</TableCell>
                      <TableCell>{item.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 