'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Edit, X, MessageSquare, Coffee, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

// 옵션 수정 모달 컴포넌트
const EditItemModal = ({ item, onSave }) => {
  const [selectedOptions, setSelectedOptions] = useState(item.options || []);
  const [specialInstructions, setSpecialInstructions] = useState(item.specialInstructions || '');
  const [quantity, setQuantity] = useState(item.quantity);

  // 옵션 토글 함수
  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(o => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  // 변경사항 저장
  const handleSave = () => {
    onSave({
      ...item,
      quantity,
      options: selectedOptions,
      specialInstructions
    });
    toast.success('메뉴가 수정되었습니다',{
      description: `${item.menu.name}의 옵션이 업데이트되었습니다.`
    });
  };

  // 수량 변경
  const changeQuantity = (amount) => {
    const newQty = Math.max(1, quantity + amount);
    setQuantity(newQty);
  };

  // 예시 옵션 (실제로는 메뉴 데이터에서 가져와야 함)
  const availableOptions = [
    '샷 추가',
    '시럽 추가',
    '휘핑크림',
    '얼음 적게',
    '얼음 많이',
    '따뜻하게',
    '차갑게'
  ];

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          <span>{item.menu.name} 옵션 수정</span>
        </DialogTitle>
        <DialogDescription>
          선택하신 메뉴의 수량, 옵션 및 특별 요청사항을 수정할 수 있습니다.
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        {/* 수량 변경 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">수량</label>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => changeQuantity(-1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => changeQuantity(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 옵션 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">옵션 선택</label>
          <div className="grid grid-cols-2 gap-2">
            {availableOptions.map((option) => (
              <Button
                key={option}
                variant={selectedOptions.includes(option) ? "default" : "outline"}
                className="justify-start"
                onClick={() => toggleOption(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        
        {/* 특별 요청사항 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">요청사항</label>
          <Textarea
            placeholder="특별 요청사항이 있으시면 적어주세요"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">취소</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button onClick={handleSave}>변경사항 저장</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default function CartPage() {
  const router = useRouter();
  const { items, updateCartItem, removeFromCart, updateCartItemWithOptions, error, isLoading } = useCart();
  
  // 전체 특별 요청사항
  const [globalSpecialInstructions, setGlobalSpecialInstructions] = useState('');
  const [showSpecialInstructions, setShowSpecialInstructions] = useState(false);

  // 아이템 옵션 및 정보 업데이트
  const handleItemUpdate = useCallback((updatedItem) => {
    updateCartItemWithOptions(
      updatedItem.id, 
      updatedItem.quantity, 
      updatedItem.options, 
      updatedItem.specialInstructions
    );
  }, [updateCartItemWithOptions]);

  // 전체 요청사항 적용
  const applyGlobalInstructions = () => {
    if (!items || items.length === 0) return;
    
    // 모든 장바구니 아이템에 동일한 특별 요청사항 적용
    items.forEach(item => {
      updateCartItemWithOptions(
        item.id,
        item.quantity,
        item.options || [],
        globalSpecialInstructions
      );
    });
    
    toast.info('요청사항이 적용되었습니다', {
      description: '모든 메뉴에 동일한 요청사항이 적용되었습니다.'
    });
    
    setShowSpecialInstructions(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  const calculateSubtotal = () => {
    if (!items) return 0;
    return items.reduce((total, item) => {
      const priceWithoutTax = Math.round((item.menu.price || 0) / 1.1);
      return total + (priceWithoutTax * item.quantity);
    }, 0);
  };

  const calculateTax = () => {
    return Math.round(calculateSubtotal() * 0.1);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        장바구니
      </h1>
      {items && items.length > 0 ? (
        <div className="space-y-4">
          {/* 전체 요청사항 토글 버튼 */}
          <div className="mb-2 flex justify-end">
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={() => setShowSpecialInstructions(!showSpecialInstructions)}
            >
              <MessageSquare className="h-4 w-4" />
              <span>전체 요청사항</span>
            </Button>
          </div>
          
          {/* 전체 요청사항 입력 영역 */}
          <AnimatePresence>
            {showSpecialInstructions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 shadow-md mb-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">모든 메뉴에 적용할 요청사항</label>
                    <Textarea
                      placeholder="모든 메뉴에 적용할 특별 요청사항을 입력하세요"
                      value={globalSpecialInstructions}
                      onChange={(e) => setGlobalSpecialInstructions(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={applyGlobalInstructions}>
                      적용하기
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="transition-all duration-300"
            >
              <Card className="p-6 backdrop-blur-lg bg-white/80 dark:bg-gray-800/80">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {item.menu.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(item.menu.price / 1.1).toLocaleString()}원 x {item.quantity} = {(Math.round(item.menu.price / 1.1) * item.quantity).toLocaleString()}원
                    </p>
                    
                    {/* 선택된 옵션 표시 */}
                    {item.options && item.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">옵션: {item.options.join(', ')}</p>
                      </div>
                    )}
                    
                    {/* 특별 요청사항 표시 */}
                    {item.specialInstructions && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          "{item.specialInstructions}"
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* 옵션 수정 버튼 */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <EditItemModal 
                        item={item} 
                        onSave={handleItemUpdate} 
                      />
                    </Dialog>
                    
                    {/* 수량 조절 및 삭제 버튼 */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="text-lg font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          <div className="mt-8 space-y-4">
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">소계</span>
                <span className="text-gray-900 dark:text-gray-100">{calculateSubtotal().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">세금 (10%)</span>
                <span className="text-gray-900 dark:text-gray-100">{calculateTax().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-semibold">총계</span>
                <span className="text-xl font-bold">{calculateTotal().toLocaleString()}원</span>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push('/checkout')}
            >
              주문하기
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            장바구니가 비어있습니다.
          </p>
        </div>
      )}
    </div>
  );
} 