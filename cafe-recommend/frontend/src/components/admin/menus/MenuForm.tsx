/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, FormEvent, useRef } from "react";
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X as ClearIcon, Trash2 as RemoveImageButtonIcon } from 'lucide-react';

export interface MenuFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
  image: File | null;
  image_url?: string | null;
  id?: number; // 수정 시 메뉴 ID (initialData에 포함될 수 있도록)
}

interface MenuFormProps {
  onClose: () => void;
  onSubmit: (formData: globalThis.FormData, menuId?: number) => Promise<void>;
  initialData?: MenuFormData | null;
  categories?: string[];
  isLoading?: boolean;
  formError?: string | null;
  onClearError?: () => void;
  isAddMode: boolean;
}

const DEFAULT_IMAGE_PREVIEW = '/static/menu_images/default-menu.jpg';
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_PRICE = 0;
const MAX_PRICE = 10000000;
const MAX_DESCRIPTION_LENGTH = 500;

export const MenuForm = ({
  onClose,
  onSubmit,
  initialData,
  categories = [],
  isLoading,
  formError: externalFormError,
  onClearError,
  isAddMode,
}: MenuFormProps) => {
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    is_available: true,
    image: null,
    image_url: null,
  });
  const [imagePreview, setImagePreview] = useState<string>(DEFAULT_IMAGE_PREVIEW);
  const [internalFormError, setInternalFormError] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price?.toString() || '',
        category: initialData.category || '',
        is_available: initialData.is_available === undefined ? true : initialData.is_available,
        image: null,
        image_url: initialData.image_url || null,
      });
      setImagePreview(initialData.image_url || DEFAULT_IMAGE_PREVIEW);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: categories.length > 0 ? categories[0] : '',
        is_available: true,
        image: null,
        image_url: null,
      });
      setImagePreview(DEFAULT_IMAGE_PREVIEW);
    }
    setInternalFormError('');
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [initialData, categories]);

  useEffect(() => {
    if (externalFormError) {
      setInternalFormError(externalFormError);
    }
  }, [externalFormError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (internalFormError && onClearError) onClearError();
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_available: checked }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setErrors(prev => ({ ...prev, image: '' }));

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: '이미지 파일 크기는 2MB 이하이어야 합니다.' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setErrors(prev => ({ ...prev, image: '지원되는 이미지 파일 형식은 JPG, PNG, GIF, WEBP 입니다.' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFormData((prev) => ({ ...prev, image: file, image_url: null }));
      setImagePreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, image: null }));
      setImagePreview(initialData?.image_url || DEFAULT_IMAGE_PREVIEW);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData((prev) => ({ ...prev, image: null, image_url: null }));
    setImagePreview(DEFAULT_IMAGE_PREVIEW);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = '메뉴 이름을 입력해주세요.';
    else if (formData.name.trim().length < MIN_NAME_LENGTH) newErrors.name = `메뉴 이름은 최소 ${MIN_NAME_LENGTH}자 이상이어야 합니다.`;
    else if (formData.name.trim().length > MAX_NAME_LENGTH) newErrors.name = `메뉴 이름은 최대 ${MAX_NAME_LENGTH}자까지 가능합니다.`;

    if (!formData.price.trim()) newErrors.price = '가격을 입력해주세요.';
    else {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum)) newErrors.price = '가격은 숫자로 입력해야 합니다.';
      else if (priceNum < MIN_PRICE) newErrors.price = `가격은 최소 ${MIN_PRICE}원 이상이어야 합니다.`;
      else if (priceNum > MAX_PRICE) newErrors.price = `가격은 최대 ${MAX_PRICE}원까지 가능합니다.`;
    }

    if (!formData.category || !formData.category.trim()) newErrors.category = '카테고리를 선택해주세요.';
    if (formData.description && formData.description.trim().length > MAX_DESCRIPTION_LENGTH) newErrors.description = `설명은 최대 ${MAX_DESCRIPTION_LENGTH}자까지 가능합니다.`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitInternal = async (e: FormEvent) => {
    e.preventDefault();
    if (internalFormError && onClearError) onClearError();
    if (!validateForm()) return;

    const submissionData = new FormData();
    submissionData.append('name', formData.name.trim());
    submissionData.append('description', formData.description.trim());
    submissionData.append('price', formData.price.trim());
    submissionData.append('category', formData.category.trim());
    submissionData.append('is_available', formData.is_available.toString());
    if (formData.image) {
      submissionData.append('image', formData.image);
    } else if (formData.image_url) {
      // 새 이미지가 없고 기존 이미지 URL이 있는 경우, 백엔드가 이를 어떻게 처리할지 명확해야 합니다.
      // 여기서는 image_url을 보내지 않거나, 혹은 특정 필드로 보내는 것을 고려할 수 있습니다.
      // 예: submissionData.append('existing_image_url', formData.image_url);
      // 이번 예제에서는 새 이미지가 없으면 이미지 관련 필드를 보내지 않는 것으로 가정합니다.
    }
    
    // 백엔드에서 AI 이미지 생성을 위해 name과 description을 사용한다면,
    // 이미지 파일이 없을 때 이 정보들이 올바르게 전달되는지 확인 필요.

    await onSubmit(submissionData, initialData?.id);
  };

  return (
    <form onSubmit={handleSubmitInternal} id="menu-form-id" className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <Label htmlFor="name">메뉴 이름</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="예: 아이스 아메리카노" className="mt-1" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div className="sm:col-span-6">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="예: 신선한 원두로 만든 시원한 커피" className="mt-1" rows={3} />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">이미지를 등록하지 않으면 메뉴 이름과 설명을 기반으로 AI가 자동으로 이미지를 생성합니다.</p>
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="price">가격</Label>
          <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="예: 4500" className="mt-1" />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>

        <div className="sm:col-span-3">
          <Label htmlFor="category">카테고리</Label>
          <Select name="category" value={formData.category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
              {categories.length === 0 && <SelectItem value="" disabled>사용 가능한 카테고리가 없습니다.</SelectItem>}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>

        <div className="sm:col-span-6">
          <Label htmlFor="image">메뉴 이미지</Label>
          <div className="mt-2 flex items-center gap-x-3">
            <Image 
              src={imagePreview || DEFAULT_IMAGE_PREVIEW} 
              alt="메뉴 이미지 미리보기" 
              width={80} 
              height={80} 
              className="h-20 w-20 rounded-md object-cover bg-muted"
              onError={() => setImagePreview(DEFAULT_IMAGE_PREVIEW)}
            />
            <div className="flex-grow">
                <Input 
                    id="image" 
                    name="image" 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    accept="image/png, image/jpeg, image/gif, image/webp" 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                {imagePreview !== DEFAULT_IMAGE_PREVIEW && formData.image_url !== imagePreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="mt-1 text-xs text-red-600 hover:text-red-700">
                        <RemoveImageButtonIcon className="w-3 h-3 mr-1"/> 이미지 삭제
                    </Button>
                )}
            </div>
          </div>
          {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
        </div>

        <div className="sm:col-span-6 flex items-center space-x-2 pt-2">
          <Switch id="is_available" checked={formData.is_available} onCheckedChange={handleSwitchChange} />
          <Label htmlFor="is_available" className="cursor-pointer">판매 여부 (체크 시 판매중)</Label>
        </div>
      </div>

      {internalFormError && (
        <p className="text-sm text-red-500 text-center py-2 bg-red-50 border border-red-200 rounded-md">{internalFormError}</p>
      )}
    </form>
  );
}; 