'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Package } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AdminLayout from '@/components/admin/AdminLayout';

// 입고 양식 유효성 검증 스키마
const restockFormSchema = z.object({
  quantity: z.coerce
    .number()
    .positive({ message: '입고량은 0보다 커야 합니다.' }),
  notes: z.string().optional(),
  created_by: z.string().min(1, { message: '담당자 이름을 입력해주세요.' }),
});

type RestockFormValues = z.infer<typeof restockFormSchema>;

interface Ingredient {
  id: number;
  name: string;
  description?: string;
  unit: string;
  min_stock_level: number;
  current_quantity: number;
  stock_status: string;
}

export default function RestockPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [fetchingIngredient, setFetchingIngredient] = useState(true);
  const router = useRouter();
  const ingredientId = parseInt(params.id);

  // 폼 기본값 설정
  const defaultValues: Partial<RestockFormValues> = {
    quantity: 0,
    notes: '',
    created_by: '',
  };

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockFormSchema),
    defaultValues,
  });

  // 재료 정보 가져오기
  useEffect(() => {
    const fetchIngredient = async () => {
      setFetchingIngredient(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/inventory/stock`);
        if (!response.ok) {
          throw new Error('재료 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        const found = data.find((item: any) => item.id === ingredientId);
        
        if (!found) {
          throw new Error('재료를 찾을 수 없습니다.');
        }
        
        setIngredient(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : '재료 정보를 불러오는데 실패했습니다.');
      } finally {
        setFetchingIngredient(false);
      }
    };

    fetchIngredient();
  }, [ingredientId]);

  const onSubmit = async (data: RestockFormValues) => {
    setLoading(true);
    setError(null);

    try {
      // 트랜잭션 생성 요청
      const transactionResponse = await fetch(`${API_BASE_URL}/api/admin/inventory/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          transaction_type: '입고',
          quantity: data.quantity,
          notes: data.notes || `입고: ${data.quantity} ${ingredient?.unit}`,
          created_by: data.created_by,
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.detail || '입고 처리에 실패했습니다.');
      }

      router.push('/admin/inventory');
      router.refresh(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '입고 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case '충분':
        return <Badge className="bg-green-500">충분</Badge>;
      case '부족':
        return <Badge className="bg-yellow-500">부족</Badge>;
      case '재고 없음':
        return <Badge className="bg-red-500">재고 없음</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
          <h1 className="text-2xl font-bold">재료 입고</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 재료 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>재료 정보</CardTitle>
              <CardDescription>재고를 추가할 재료의 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingIngredient ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : ingredient ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-500" />
                    <h3 className="text-xl font-semibold">{ingredient.name}</h3>
                  </div>
                  
                  {ingredient.description && (
                    <p className="text-gray-600">{ingredient.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div>
                      <p className="text-sm text-gray-500">현재 재고</p>
                      <p className="font-medium">
                        {ingredient.current_quantity} {ingredient.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">최소 재고</p>
                      <p className="font-medium">
                        {ingredient.min_stock_level} {ingredient.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">단위</p>
                      <p className="font-medium">{ingredient.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">상태</p>
                      <div className="mt-1">
                        {getStockStatusBadge(ingredient.stock_status)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">재료 정보를 찾을 수 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 입고 양식 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>재고 입고</CardTitle>
              <CardDescription>입고할 수량과 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {ingredient && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>입고량 ({ingredient.unit}) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0.1}
                              step={0.1}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            추가할 재고의 양을 입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="created_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>담당자 *</FormLabel>
                          <FormControl>
                            <Input placeholder="담당자 이름" {...field} />
                          </FormControl>
                          <FormDescription>
                            입고 작업을 수행한 담당자의 이름을 입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>메모</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="추가 정보 (선택 사항)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                      >
                        취소
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? '처리 중...' : '입고 확인'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
} 