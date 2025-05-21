'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-client';
import AdminLayout from '@/components/admin/AdminLayout';

// 재료 추가 폼 유효성 검증 스키마
const ingredientFormSchema = z.object({
  name: z.string().min(1, { message: '재료명을 입력해주세요.' }),
  description: z.string().optional(),
  unit: z.string().min(1, { message: '단위를 입력해주세요. (예: g, ml, 개)' }),
  min_stock_level: z.coerce
    .number()
    .min(0, { message: '최소 재고 수준은 0 이상이어야 합니다.' }),
  is_active: z.boolean().default(true),
});

type IngredientFormValues = z.infer<typeof ingredientFormSchema>;

export default function AddIngredientPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 폼 기본값 설정
  const defaultValues: Partial<IngredientFormValues> = {
    name: '',
    description: '',
    unit: 'g',
    min_stock_level: 0,
    is_active: true,
  };

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: IngredientFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/inventory/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '재료 추가에 실패했습니다.');
      }

      router.push('/admin/inventory');
      router.refresh(); // 목록 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : '재료 추가에 실패했습니다.');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold">새 재료 추가</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>재료 정보</CardTitle>
            <CardDescription>새로운 재료 정보를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>재료명 *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 에스프레소 원두" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="재료에 대한 설명 (선택 사항)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>단위 *</FormLabel>
                        <FormControl>
                          <Input placeholder="예: g, ml, 개" {...field} />
                        </FormControl>
                        <FormDescription>
                          재고를 측정하는 단위를 입력하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>최소 재고 수준 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          경고를 표시할 최소 재고량을 설정하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>활성화 상태</FormLabel>
                        <FormDescription>
                          재료를 사용 가능한 상태로 설정합니다.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                    {loading ? '처리 중...' : '재료 추가'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 