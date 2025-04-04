'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RecommendedMenu {
  id: number;
  name: string;
  price: number;
  description: string;
  matchScore: number;
}

export default function RecommendPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedMenu[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch('http://116.124.191.174:15026/chat/history');
      const data = await response.json();
      setChatHistory(data.history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://116.124.191.174:15026/recommend/from-chat', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (menuId: number) => {
    try {
      await fetch('http://116.124.191.174:15026/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menuId,
          quantity: 1,
        }),
      });
      alert('장바구니에 추가되었습니다.');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">AI 메뉴 추천</h1>
      
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">최근 대화 내역</h2>
        <ScrollArea className="h-[300px] mb-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </ScrollArea>
        <Button
          onClick={getRecommendations}
          className="w-full"
          disabled={loading || chatHistory.length === 0}
        >
          {loading ? '추천 메뉴 분석 중...' : '대화 기반 메뉴 추천받기'}
        </Button>
      </Card>

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">추천 메뉴</h2>
          {recommendations.map((menu) => (
            <Card key={menu.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{menu.name}</h3>
                  <p className="text-gray-600">{menu.price.toLocaleString()}원</p>
                  <p className="mt-1 text-sm text-gray-500">
                    매칭 점수: {menu.matchScore}%
                  </p>
                  <p className="mt-2">{menu.description}</p>
                </div>
                <Button onClick={() => addToCart(menu.id)}>
                  장바구니에 추가
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 