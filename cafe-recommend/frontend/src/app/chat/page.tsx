'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MenuCard } from '@/components/menu/MenuCard';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RecommendedMenu {
  id: number;
  name: string;
  description: string;
  price: number;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '안녕하세요! 저는 카페 AI 상담사입니다. 음료나 디저트에 대해 궁금한 점을 물어보세요.'
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 새 메시지가 추가될 때마다 스크롤
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const userMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      const response = await fetch('/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input
        }),
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const data = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        content: data.response
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-4">AI 카페 상담사와 대화하기</h1>
          <Card className="p-4">
            <div ref={scrollAreaRef}>
              <ScrollArea className="h-[500px] mb-4 p-4">
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-end gap-2 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          AI
                        </div>
                      )}
                      <div
                        className={`relative max-w-[80%] p-4 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-primary/10 text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                        }`}
                      >
                        <div className={`
                          absolute bottom-0 ${message.role === 'user' ? 'right-0 -translate-y-1/2' : 'left-0 -translate-y-1/2'}
                          w-4 h-4 transform ${message.role === 'user' ? 'rotate-45' : '-rotate-45'}
                          ${message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}
                        `}></div>
                        <div className="relative z-10">
                          {message.content}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary text-sm font-medium">
                          나
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading}
                type="button"
                className="px-6 min-w-[80px] whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    전송 중
                  </span>
                ) : '전송'}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">추천 메뉴</h2>
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.map((menu) => (
                <MenuCard
                  key={menu.id}
                  id={menu.id}
                  name={menu.name}
                  description={menu.description}
                  price={menu.price}
                  category="추천"
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                추천 메뉴가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 