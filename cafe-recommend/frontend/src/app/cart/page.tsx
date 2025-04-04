'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // 장바구니 데이터 로드
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      const response = await fetch('http://116.124.191.174:15026/cart');
      const data = await response.json();
      setCartItems(data.items);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    try {
      await fetch(`http://116.124.191.174:15026/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await fetch(`http://116.124.191.174:15026/cart/${itemId}`, {
        method: 'DELETE',
      });
      fetchCartItems();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">장바구니</h1>
      {cartItems.length === 0 ? (
        <Card className="p-4">
          <p className="text-center text-gray-500">장바구니가 비어있습니다.</p>
        </Card>
      ) : (
        <>
          {cartItems.map((item) => (
            <Card key={item.id} className="p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-600">{item.price.toLocaleString()}원</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.id, parseInt(e.target.value))
                    }
                    className="w-16 text-center"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          <div className="mt-4">
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">총 금액</h3>
                <p className="text-xl font-bold">
                  {totalAmount.toLocaleString()}원
                </p>
              </div>
              <Button className="w-full mt-4">주문하기</Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 