'use client';

import { useEffect, useState } from 'react';
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
import { Plus, Pencil, Trash2, Search, Filter, Coffee, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Menu {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
}

export default function MenuManagement() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    is_available: true,
  });
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    // 카테고리 목록 추출
    const uniqueCategories = Array.from(new Set(menus.map(menu => menu.category)));
    setCategories(uniqueCategories);
  }, [menus]);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/menus', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMenus(data);
      }
    } catch (error) {
      console.error('메뉴 로딩 실패:', error);
      toast.error('메뉴 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          is_available: formData.is_available
        }),
      });

      if (response.ok) {
        toast.success('메뉴가 추가되었습니다.');
        setIsAddDialogOpen(false);
        resetForm();
        fetchMenus();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '메뉴 추가에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/menus/${selectedMenu.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          is_available: formData.is_available
        }),
      });

      if (response.ok) {
        toast.success('메뉴가 수정되었습니다.');
        setIsEditDialogOpen(false);
        resetForm();
        fetchMenus();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '메뉴 수정에 실패했습니다.');
      }
    } catch (error) {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleDelete = async (menuId: number) => {
    if (!confirm('정말로 이 메뉴를 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/menus/${menuId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('메뉴가 삭제되었습니다.');
        fetchMenus();
      } else {
        toast.error('메뉴 삭제에 실패했습니다.');
      }
    } catch (error) {
      toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const openEditDialog = (menu: Menu) => {
    setSelectedMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description,
      price: menu.price.toString(),
      category: menu.category,
      is_available: menu.is_available
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      is_available: true,
    });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_available: checked }));
  };

  // 필터링된 메뉴 목록
  const filteredMenus = menus.filter(menu => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         menu.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || menu.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">메뉴 관리</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">카페 메뉴를 추가, 수정, 삭제할 수 있습니다.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow hover:shadow-md transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                새 메뉴 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-gray-100">새 메뉴 추가</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  새로운 메뉴 정보를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">메뉴 이름</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="예: 아이스 아메리카노" className="dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">설명</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="메뉴에 대한 설명을 입력하세요." className="dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-gray-700 dark:text-gray-300">가격</Label>
                    <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="예: 4500" className="dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">카테고리</Label>
                    <Input id="category" name="category" value={formData.category} onChange={handleInputChange} placeholder="예: 커피" className="dark:bg-gray-700 dark:border-gray-600" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_available" name="is_available" checked={formData.is_available} onCheckedChange={handleSwitchChange} />
                  <Label htmlFor="is_available" className="text-gray-700 dark:text-gray-300">판매 가능</Label>
                </div>
                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">취소</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">추가</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              placeholder="메뉴 이름 또는 설명 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] dark:bg-gray-700 dark:border-gray-600">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800">
                <SelectItem value="all" className="dark:hover:bg-gray-700">모든 카테고리</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="dark:hover:bg-gray-700">{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-b dark:border-gray-700 hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="text-gray-700 dark:text-gray-300">메뉴 이름</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">카테고리</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">가격</TableHead>
                <TableHead className="text-center text-gray-700 dark:text-gray-300">판매 상태</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMenus.map((menu) => (
                <TableRow key={menu.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{menu.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{menu.category}</TableCell>
                  <TableCell className="text-right text-gray-800 dark:text-gray-200">{menu.price.toLocaleString()}원</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={menu.is_available ? "default" : "outline"} className={`${menu.is_available ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'} border-transparent`}>
                      {menu.is_available ? '판매중' : '품절'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={isEditDialogOpen && selectedMenu?.id === menu.id} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); resetForm(); } }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(menu)} className="dark:border-gray-600 dark:hover:bg-gray-700">
                            <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-gray-100">메뉴 수정</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleEdit} className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name" className="text-gray-700 dark:text-gray-300">메뉴 이름</Label>
                              <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} className="dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-description" className="text-gray-700 dark:text-gray-300">설명</Label>
                              <Textarea id="edit-description" name="description" value={formData.description} onChange={handleInputChange} className="dark:bg-gray-700 dark:border-gray-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-price" className="text-gray-700 dark:text-gray-300">가격</Label>
                                <Input id="edit-price" name="price" type="number" value={formData.price} onChange={handleInputChange} className="dark:bg-gray-700 dark:border-gray-600" />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-category" className="text-gray-700 dark:text-gray-300">카테고리</Label>
                                <Input id="edit-category" name="category" value={formData.category} onChange={handleInputChange} className="dark:bg-gray-700 dark:border-gray-600" />
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch id="edit-is_available" name="is_available" checked={formData.is_available} onCheckedChange={handleSwitchChange} />
                              <Label htmlFor="edit-is_available" className="text-gray-700 dark:text-gray-300">판매 가능</Label>
                            </div>
                            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">취소</Button>
                              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">수정 완료</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(menu.id)} className="dark:border-gray-600 dark:hover:bg-gray-700">
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
} 