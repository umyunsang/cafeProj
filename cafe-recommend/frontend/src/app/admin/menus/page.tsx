'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toaster, toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Filter, X, Settings2, Edit3 } from 'lucide-react';
import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { MenuTable, Menu } from '@/components/admin/menus/MenuTable';
import { MenuForm, MenuFormData } from '@/components/admin/menus/MenuForm';
import { useAuth } from '@/contexts/AuthContext';
import { useApiMutation, useApiQuery } from '@/hooks/useApiClient';

export default function MenuManagement() {
  const { token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddMenuMode, setIsAddMenuMode] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formError, setFormError] = useState<string>('');
  
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Menu; direction: 'ascending' | 'descending' } | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryFormError, setCategoryFormError] = useState('');

  const { 
    data: menusData, 
    isLoading: menusLoading, 
    error: menusError, 
    refetch: fetchMenus 
  } = useApiQuery<Menu[]>('/api/admin/menus');
  
  const menus = useMemo(() => menusData || [], [menusData]);

  const { mutate: saveMenuMutation, isLoading: isSaveMenuLoading } = useApiMutation<
    Menu,
    globalThis.FormData
  >(
    editingMenu ? 'PUT' : 'POST',
    (vars) => editingMenu ? `/api/admin/menus/${editingMenu.id}` : '/api/admin/menus'
  );

  const { mutate: deleteMenuMutation, isLoading: isDeleteMenuLoading } = useApiMutation<
    null, 
    { menuId: number }
  >(
    'DELETE',
    (vars) => `/api/admin/menus/${vars.menuId}`
  );

  const { mutate: toggleAvailabilityMutation, isLoading: isToggleAvailabilityLoading } = useApiMutation<
    Menu,
    { menuId: number; is_available: boolean }
  >(
    'PUT',
    (vars) => `/api/admin/menus/${vars.menuId}/availability`
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      fetchMenus();
    } else if (!authLoading && !isAuthenticated) {
        logout();
    }
  }, [authLoading, isAuthenticated, token, fetchMenus, logout]);

  useEffect(() => {
    const uniqueCategoriesFromMenus = Array.from(new Set(menus.map(menu => menu.category).filter(Boolean)));
    setCategories(uniqueCategoriesFromMenus.sort((a, b) => a.localeCompare(b)));
  }, [menus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(rawSearchTerm);
      setCurrentPage(1);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [rawSearchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRawSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setRawSearchTerm('');
  };

  const handleFormSubmit = async (formData: globalThis.FormData, menuId?: number) => {
    setFormError('');
    
    // PUT 요청인 경우 _method 파라미터 추가
    if (menuId) {
      formData.append('_method', 'PUT');
    }

    await saveMenuMutation(formData, {
      onSuccess: () => {
        toast.success(menuId ? '메뉴가 수정되었습니다.' : '메뉴가 추가되었습니다.');
        setIsFormOpen(false);
        setEditingMenu(null);
        setIsAddMenuMode(false);
        fetchMenus(); 
      },
      onError: (error) => {
        let errorMessage = menuId ? '메뉴 수정 실패' : '메뉴 추가 실패';
        if (error.details?.detail) {
          errorMessage = typeof error.details.detail === 'string' 
            ? error.details.detail 
            : JSON.stringify(error.details.detail);
        } else if (error.message) {
          errorMessage = error.message;
        }
        setFormError(errorMessage);
        toast.error(errorMessage);
      }
    });
  };
  
  const handleDelete = async (menuId: number) => {
    if (!confirm('정말로 이 메뉴를 삭제하시겠습니까?')) return;
    await deleteMenuMutation({ menuId }, {
        onSuccess: () => {
            toast.success('메뉴가 삭제되었습니다.');
            fetchMenus();
        },
        onError: (error) => {
            toast.error(error.details?.detail || error.message || '메뉴 삭제 실패');
        }
    });
  };

  const handleAvailabilityChange = async (menuId: number, isAvailable: boolean) => {
    await toggleAvailabilityMutation({ menuId, is_available: isAvailable }, {
        onSuccess: (updatedMenu) => {
            toast.success(`메뉴 상태가 ${isAvailable ? '판매중' : '판매 중지'}으로 변경되었습니다.`);
            fetchMenus();
        },
        onError: (error) => {
            toast.error(error.details?.detail || error.message || '메뉴 상태 변경 실패');
        }
    });
  };

  const openAddForm = () => {
    setIsAddMenuMode(true);
    setEditingMenu(null);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (menu: Menu) => {
    setIsAddMenuMode(false);
    setEditingMenu(menu);
    setFormError('');
    setIsFormOpen(true);
  };

  const filteredAndSortedMenus = useMemo(() => {
    return menus
      .filter(menu => {
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const matchesSearchTerm = 
          menu.name.toLowerCase().includes(searchTermLower) ||
          (menu.description && menu.description.toLowerCase().includes(searchTermLower)) ||
          menu.category.toLowerCase().includes(searchTermLower);
        
        const matchesCategory = 
          selectedCategory === 'all' || menu.category === selectedCategory;

        const matchesAvailability = 
          availabilityFilter === 'all' || 
          (availabilityFilter === 'available' && menu.is_available) ||
          (availabilityFilter === 'unavailable' && !menu.is_available);

        return matchesSearchTerm && matchesCategory && matchesAvailability;
      })
      .sort((a, b) => {
        if (sortConfig) {
          const valA = a[sortConfig.key];
          const valB = b[sortConfig.key];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
          } 
          if (typeof valA === 'string' && typeof valB === 'string') {
             return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
        }
        return a.name.localeCompare(b.name);
      });
  }, [menus, debouncedSearchTerm, selectedCategory, sortConfig, availabilityFilter]);

  const totalPages = Math.ceil(filteredAndSortedMenus.length / ITEMS_PER_PAGE);
  const currentPagedMenus = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredAndSortedMenus.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedMenus, currentPage]);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const requestSort = (key: keyof Menu) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIndicator = (key: keyof Menu) => {
    if (sortConfig && sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleAddCategory = () => {
    setCategoryFormError('');
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setCategoryFormError('카테고리 이름을 입력해주세요.');
      return;
    }
    if (categories.includes(trimmedName)) {
      setCategoryFormError('이미 존재하는 카테고리입니다.');
      return;
    }
    setCategories(prev => [...prev, trimmedName].sort((a, b) => a.localeCompare(b)));
    setNewCategoryName('');
    toast.success(`카테고리 '${trimmedName}'이(가) 추가되었습니다.`);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    const isCategoryInUse = menus.some(menu => menu.category === categoryToDelete);

    if (isCategoryInUse) {
      toast.error(`카테고리 '${categoryToDelete}'은(는) 현재 사용 중인 메뉴가 있어 삭제할 수 없습니다.`);
      return;
    }

    if (confirm(`'${categoryToDelete}' 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      setCategories(prev => prev.filter(c => c !== categoryToDelete));
      toast.success(`카테고리 '${categoryToDelete}'이(가) 삭제되었습니다.`);
      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('all');
      }
    }
  };

  if (authLoading) {
    return <div className="container p-4 text-center">인증 확인 중...</div>;
  }
  if (menusLoading && menus.length === 0) {
    return <div className="container p-4 text-center">메뉴 목록을 불러오는 중...</div>;
  }
  if (menusError) {
    return <div className="container p-4 text-center text-red-500">오류: {menusError.message}</div>;
  }

  return (
    <>
      {/* <Toaster richColors position="top-right" /> */}
      <div className="container mx-auto py-10">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>메뉴 관리</CardTitle>
            <CardDescription>메뉴를 추가, 수정, 삭제하고 판매 여부를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center">
              <div className="flex gap-2 flex-grow w-full sm:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="메뉴 이름, 설명, 카테고리 검색..."
                    value={rawSearchTerm}
                    onChange={handleSearchChange}
                    className="pl-8 w-full"
                  />
                  {rawSearchTerm && (
                    <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={clearSearch}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4 inline-block" />
                    <SelectValue placeholder="카테고리 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="판매 여부 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 메뉴</SelectItem>
                    <SelectItem value="true">판매중</SelectItem>
                    <SelectItem value="false">판매 중지</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-auto">
                <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" /> 카테고리 관리
                </Button>
                <Button onClick={openAddForm}>
                  <Plus className="mr-2 h-4 w-4" /> 새 메뉴 추가
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isCategoryModalOpen} onOpenChange={(isOpen) => {
          setIsCategoryModalOpen(isOpen);
          if (!isOpen) {
            setNewCategoryName('');
            setCategoryFormError('');
          }
        }}>
          <DialogTrigger className="hidden" />
          <DialogContent className="sm:max-w-md" aria-labelledby="category-dialog-title" aria-describedby="category-dialog-description">
            <DialogTitle id="category-dialog-title">카테고리 관리</DialogTitle>
            <DialogDescription id="category-dialog-description">
              메뉴에 사용될 카테고리를 관리합니다. 여기서 추가/삭제하는 카테고리는 메뉴 생성/수정 시 선택지에 반영됩니다.
            </DialogDescription>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">새 카테고리 추가</h4>
              <div className="flex items-start gap-2">
                <div className="flex-grow">
                  <Input 
                    placeholder="카테고리 이름"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleAddCategory();
                      }
                    }}
                  />
                  {categoryFormError && <p className="text-xs text-red-500 mt-1">{categoryFormError}</p>}
                </div>
                <Button onClick={handleAddCategory}><Plus className="mr-1 h-4 w-4" /> 추가</Button>
              </div>
            </div>

            <div className="mt-6 py-4 border-t max-h-[250px] overflow-y-auto">
              <h4 className="text-sm font-medium mb-3">현재 카테고리 목록</h4>
              {categories.length > 0 ? (
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category} className="flex justify-between items-center p-3 pr-2 border rounded-md bg-background hover:bg-muted/50 text-sm">
                      <span className="flex-grow truncate" title={category}>{category}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleDeleteCategory(category)} aria-label={`${category} 카테고리 삭제`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-gray-500 py-4">등록된 카테고리가 없습니다. 새 카테고리를 추가해보세요.</p>
              )}
            </div>
            
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog 
          open={isFormOpen} 
          onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
              setEditingMenu(null);
              setIsAddMenuMode(false);
              setFormError('');
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]" aria-labelledby="menu-dialog-title" aria-describedby="menu-dialog-description">
            <DialogTitle id="menu-dialog-title">
              {isAddMenuMode ? '새 메뉴 추가' : '메뉴 수정'}
            </DialogTitle>
            <DialogDescription id="menu-dialog-description">
              {isAddMenuMode 
                ? '새로운 메뉴 정보를 입력해주세요. 필수 항목을 모두 입력해야 합니다.' 
                : '메뉴 정보를 수정합니다. 기존 정보를 변경하고 저장하세요.'}
            </DialogDescription>
            
            <MenuForm
              onSubmit={handleFormSubmit}
              initialData={isAddMenuMode ? {
                name: '',
                description: '',
                price: '', 
                category: categories.length > 0 ? categories[0] : '',
                is_available: true,
                image: null,
                image_url: null,
              } : editingMenu ? {
                id: editingMenu.id,
                name: editingMenu.name,
                description: editingMenu.description || '',
                price: String(editingMenu.price),
                category: editingMenu.category,
                is_available: editingMenu.is_available,
                image: null, 
                image_url: editingMenu.image_url,
              } : null}
              categories={categories}
              formError={formError}
              onClearError={() => setFormError('')}
              isLoading={isSaveMenuLoading}
              isAddMode={isAddMenuMode}
              onClose={() => {
                setIsFormOpen(false);
                setEditingMenu(null);
                setIsAddMenuMode(false);
                setFormError('');
              }}
            />
            <DialogFooter className="mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                    setIsFormOpen(false);
                    setEditingMenu(null);
                    setIsAddMenuMode(false);
                    setFormError('');
                }} disabled={isSaveMenuLoading}>
                    취소
                </Button>
                <Button type="submit" form="menu-form-id" disabled={isSaveMenuLoading}>
                    {isSaveMenuLoading ? (isAddMenuMode ? '추가 중...' : '저장 중...') : (isAddMenuMode ? '메뉴 추가' : '변경사항 저장')}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {menusLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-1"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {!menusLoading && menusError && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-destructive">오류 발생</CardTitle>
            </CardHeader>
            <CardContent>
              <p>메뉴 목록을 불러오는 중 오류가 발생했습니다.</p>
              <pre className="mt-2 p-2 bg-muted rounded text-sm">{menusError.message || JSON.stringify(menusError.details)}</pre>
              <Button onClick={() => fetchMenus()} className="mt-4">다시 시도</Button>
            </CardContent>
          </Card>
        )}

        {!menusLoading && !menusError && menus.length === 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>데이터 없음</CardTitle>
            </CardHeader>
            <CardContent>
              <p>등록된 메뉴가 없습니다. 새 메뉴를 추가해주세요.</p>
            </CardContent>
          </Card>
        )}

        {!menusLoading && !menusError && menus.length > 0 && (
          <>
            <MenuTable 
              currentMenus={currentPagedMenus}
              openEditDialog={openEditForm}
              handleDelete={handleDelete}
              handleAvailabilityChange={handleAvailabilityChange}
              sortConfig={sortConfig}
              requestSort={requestSort}
              getSortIndicator={getSortIndicator}
            />
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                    <Button 
                        variant="outline" 
                        onClick={() => paginate(currentPage - 1)} 
                        disabled={currentPage === 1}
                        aria-label="이전 페이지"
                    >
                        이전
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                        <Button 
                            key={pageNumber} 
                            variant={currentPage === pageNumber ? "default" : "outline"} 
                            onClick={() => paginate(pageNumber)}
                            aria-current={currentPage === pageNumber ? "page" : undefined}
                            aria-label={`${pageNumber} 페이지로 이동`}
                        >
                            {pageNumber}
                        </Button>
                    ))}
                    <Button 
                        variant="outline" 
                        onClick={() => paginate(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        aria-label="다음 페이지"
                    >
                        다음
                    </Button>
                </div>
            )}
          </>
        )}
      </div>
    </>
  );
} 