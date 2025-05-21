'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Plus, RefreshCw, Search, Package, AlertTriangle as AlertTriangleIcon, XCircle as XCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { API_BASE_URL } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryCard } from '@/components/admin/common/SummaryCard';
import { cn } from '@/lib/utils';

type IngredientStatus = '충분' | '부족' | '재고 없음';

interface Ingredient {
  id: number;
  name: string;
  description?: string;
  unit: string;
  min_stock_level: number;
  is_active: boolean;
  current_quantity: number;
  is_in_stock: boolean;
  stock_status: IngredientStatus;
}

interface InventorySummary {
  total_ingredients: number;
  out_of_stock_count: number;
  low_stock_count: number;
  total_stock_value: number;
  stock_alerts: Array<{
    ingredient_id: number;
    ingredient_name: string;
    current_quantity: number;
    min_stock_level: number;
    unit: string;
    status: string;
  }>;
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState<InventorySummary | null>(null);

  // 정렬 및 페이지네이션 상태 추가
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ingredient; direction: 'ascending' | 'descending' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // 페이지 당 항목 수

  const router = useRouter();

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/inventory/stock`),
        fetch(`${API_BASE_URL}/api/admin/inventory/dashboard`)
      ]);

      if (!ingredientsResponse.ok || !summaryResponse.ok) {
        throw new Error('재고 데이터를 불러오는데 실패했습니다.');
      }

      const ingredientsData = await ingredientsResponse.json();
      const summaryData = await summaryResponse.json();

      setIngredients(ingredientsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = useMemo(() => {
    let tempFiltered = [...ingredients];

    // 검색어 필터링
    if (searchQuery) {
      tempFiltered = tempFiltered.filter(
        (ingredient) =>
          ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ingredient.description && 
            ingredient.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 탭 필터링
    if (activeTab === 'low') {
      tempFiltered = tempFiltered.filter((ingredient) => ingredient.stock_status === '부족');
    } else if (activeTab === 'out') {
      tempFiltered = tempFiltered.filter((ingredient) => ingredient.stock_status === '재고 없음');
    }

    // 정렬 로직 추가
    if (sortConfig !== null) {
      tempFiltered.sort((a, b) => {
        // 숫자형 속성인지 문자열 속성인지에 따라 정렬 방식 분기 고려 (현재는 모든 키에 대해 <, > 비교)
        // 예를 들어 a[sortConfig.key]가 숫자일 경우와 문자일 경우 다르게 처리
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        } 
        // 기본 문자열 비교 또는 기타 타입 비교
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return tempFiltered;
  }, [ingredients, searchQuery, activeTab, sortConfig]);

  const requestSort = (key: keyof Ingredient) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // 정렬 시 첫 페이지로 이동
  };

  const getSortIndicator = (key: keyof Ingredient) => {
    if (sortConfig && sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  // 페이지네이션 관련 계산
  const totalPages = Math.ceil(filteredIngredients.length / ITEMS_PER_PAGE);
  const currentPagedIngredients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredIngredients.slice(startIndex, endIndex);
  }, [filteredIngredients, currentPage, ITEMS_PER_PAGE]);

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // 검색 시 첫 페이지로
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로
  };

  const getStockStatusBadge = (status: IngredientStatus) => {
    switch (status) {
      case '충분':
        return <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:text-green-400 dark:border-green-600 dark:bg-green-900/30">충분</Badge>;
      case '부족':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-600 dark:bg-yellow-900/30">부족</Badge>;
      case '재고 없음':
        return <Badge variant="destructive">재고 없음</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">재고 관리</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/admin/inventory/add-ingredient')}>
            <Plus className="mr-2 h-4 w-4" /> 재료 추가
          </Button>
          <Button variant="outline" onClick={fetchInventoryData} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} 새로고침
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {loading && !summary ? (
          <>
            <Skeleton className="h-[125px] w-full rounded-lg" />
            <Skeleton className="h-[125px] w-full rounded-lg" />
            <Skeleton className="h-[125px] w-full rounded-lg" />
          </>
        ) : (
          <>
            <SummaryCard 
              title="총 재료" 
              value={summary?.total_ingredients || 0} 
              icon={<Package className="h-4 w-4 text-muted-foreground" />} 
            />
            <SummaryCard 
              title="재고 부족" 
              value={summary?.low_stock_count || 0} 
              icon={<AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />} 
              valueClassName="text-yellow-500 dark:text-yellow-400"
            />
            <SummaryCard 
              title="재고 없음" 
              value={summary?.out_of_stock_count || 0} 
              icon={<XCircleIcon className="h-4 w-4 text-muted-foreground" />} 
              valueClassName="text-red-500 dark:text-red-400"
            />
          </>
        )}
      </div>

      {/* 부족 재고 알림 섹션 추가 */}
      {summary && summary.stock_alerts && summary.stock_alerts.length > 0 && (
        <Alert variant="warning" className="mb-6 shadow-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">재고 부족 및 소진 알림!</AlertTitle>
          <AlertDescription>
            다음 재료들이 최소 재고량보다 부족하거나 소진되었습니다. 빠른 조치가 필요합니다.
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {summary.stock_alerts.map(alert => (
                <li key={alert.ingredient_id}>
                  <span className="font-medium">{alert.ingredient_name}</span>: 현재 {alert.current_quantity}{alert.unit} (최소 {alert.min_stock_level}{alert.unit}) - 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-yellow-700 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-400"
                    onClick={() => router.push(`/admin/inventory/edit/${alert.ingredient_id}`)}
                  >
                    수량 조절
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-background rounded-md shadow p-4 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="재료 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">전체 ({ingredients.length})</TabsTrigger>
                <TabsTrigger value="low">부족 ({ingredients.filter(i => i.stock_status === '부족').length})</TabsTrigger>
                <TabsTrigger value="out">소진 ({ingredients.filter(i => i.stock_status === '재고 없음').length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {loading && currentPagedIngredients.length === 0 ? (
          <div className="space-y-2 mt-4">
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => requestSort('name')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && requestSort('name')}
                  role="button"
                  tabIndex={0}
                  aria-label="재료명으로 정렬"
                >
                  재료명{getSortIndicator('name')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => requestSort('current_quantity')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && requestSort('current_quantity')}
                  role="button"
                  tabIndex={0}
                  aria-label="현재 수량으로 정렬"
                >
                  현재 수량{getSortIndicator('current_quantity')}
                </TableHead>
                <TableHead>단위</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                  onClick={() => requestSort('min_stock_level')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && requestSort('min_stock_level')}
                  role="button"
                  tabIndex={0}
                  aria-label="최소 재고량으로 정렬"
                >
                  최소 재고량{getSortIndicator('min_stock_level')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors text-center"
                  onClick={() => requestSort('stock_status')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && requestSort('stock_status')}
                  role="button"
                  tabIndex={0}
                  aria-label="재고 상태로 정렬"
                >
                  재고 상태{getSortIndicator('stock_status')}
                </TableHead>
                <TableHead className="text-center">활성 상태</TableHead>
                <TableHead className="text-right pr-6">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPagedIngredients.length > 0 ? (
                currentPagedIngredients.map((ingredient) => (
                  <TableRow key={ingredient.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell className="text-right">{ingredient.current_quantity}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell className="text-right">{ingredient.min_stock_level}</TableCell>
                    <TableCell className="text-center">{getStockStatusBadge(ingredient.stock_status)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={ingredient.is_active ? "default" : "secondary"} className={cn(ingredient.is_active ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' : 'dark:bg-gray-700 dark:hover:bg-gray-600')}>
                        {ingredient.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 pr-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/inventory/edit/${ingredient.id}`)}
                          aria-label={`재료 ${ingredient.name} 수정`}
                        >
                          수정
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {searchQuery
                      ? '검색된 재료가 없습니다.'
                      : activeTab !== 'all'
                      ? '해당 상태의 재료가 없습니다.'
                      : '등록된 재료가 없습니다. 재료를 추가해주세요.'
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4 mt-4" role="navigation" aria-label="페이지네이션">
          <Button
            variant="outline"
            size="sm"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            aria-label="이전 페이지로 이동"
          >
            이전
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
            <Button
              key={pageNumber}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              onClick={() => paginate(pageNumber)}
              disabled={loading}
              aria-label={`페이지 ${pageNumber}로 이동`}
              aria-current={currentPage === pageNumber ? 'page' : undefined}
            >
              {pageNumber}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            aria-label="다음 페이지로 이동"
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
} 