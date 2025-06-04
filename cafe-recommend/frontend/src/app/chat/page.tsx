'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatRecommendationCard } from '@/components/menu/ChatRecommendationCard';
import { StoreInfoCard } from '@/components/chat/StoreInfoCard';
import { OrderGuideCard } from '@/components/chat/OrderGuideCard';
import { 
  ChatMessage, 
  RecommendedMenu, 
  ChatApiResponse, 
  ChatMessageType 
} from '@/types';
import { cn } from "@/lib/utils";
import { 
  SendHorizontal, 
  Clock,
  MapPin, 
  Phone, 
  ParkingCircle, 
  Wifi, 
  Dog, 
  ShoppingBag, 
  Globe, 
  CreditCard, 
  Users 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';

// Typewriter 컴포넌트 최적화
const Typewriter = ({ text, speed = 15, onFinished, messageId }: { text: string; speed?: number; onFinished?: (id: string) => void; messageId: string; }) => {
  const [displayedText, setDisplayedText] = useState('');
  const currentIndexRef = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    currentIndexRef.current = 0;

    if (text && text.length > 0) {
      const intervalId = setInterval(() => {
        const charToAdd = text[currentIndexRef.current];

        if (charToAdd !== undefined) {
          setDisplayedText((prev) => prev + charToAdd);
          currentIndexRef.current += 1;
        } else {
          clearInterval(intervalId);
          if (onFinished) {
            onFinished(messageId);
          }
        }
      }, speed);
      return () => {
        clearInterval(intervalId);
      };
    } else {
      if (onFinished) {
        onFinished(messageId);
      }
    }
  }, [text, speed, onFinished, messageId]);

  return <>{displayedText}</>;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 'initial-0',
  role: 'assistant',
  content: '안녕하세요! 저는 카페 AI 챗봇입니다. 고객님의 취향에 맞는 완벽한 음료나 디저트를 추천해드릴게요. 매장 정보나 주문 방법 등에 대한 문의도 가능합니다. 무엇을 도와드릴까요?'
};

// 사용자 가이드 메시지
const USER_GUIDE: Record<ChatMessageType, string[]> = {
  menu_recommendation: [
    "✨ 오늘 가장 인기 있는 메뉴는 뭐야?",
    "🍹 달지 않은 음료 추천해 줄래?",
    "🧊 시원한 디카페인 음료 있어?",
    "🍰 새로 나온 디저트 메뉴 알려줘"
  ],
  customer_service: [
    "🕒 오늘 영업시간 알려줘",
    "🅿️ 주차 가능한지 알려줘",
    "📶 와이파이 비밀번호 뭐야?",
    "🚻 화장실은 어디에 있어?"
  ],
  order_info: [
    "🛍️ 포장 주문 가능한가요?",
    "🤖 키오스크 사용법 알려줘",
    "⚡ 가장 빨리 나오는 메뉴가 뭐예요?",
    "🥜 알레르기 정보 표시되어 있나요?"
  ],
  error: [] // 오류 상황에 대한 가이드 메시지는 비워둠
};

// 스켈레톤 MenuCard
const SkeletonMenuCard = () => (
  <Card className="p-3 sm:p-4 bg-background dark:bg-neutral-800/50 border-[color:var(--border-color)]">
    <div className="flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-md" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    </div>
  </Card>
);

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messageType, setMessageType] = useState<ChatMessageType>('menu_recommendation');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const resolvePromiseRef = useRef<(() => void) | null>(null);
  const { items: cartItems, isOpen: isCartOpen, closeCart, updateCartItem, removeFromCart, error: cartError } = useCart();
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSessionId = localStorage.getItem('chat_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
    if (messages.length > 0 && !messages[0].id) {
      setMessages(prev => [{...prev[0], id: `initial-${Date.now()}`}]);
    }
  }, []);

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
      setRecommendations([]);
      setIsRecommendationsLoading(true);
      const userMessage: ChatMessage = { 
        id: `user-${Date.now()}`,
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      const currentInput = input;
      setInput('');

      const response = await fetch('http://116.124.191.174:15049/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'API 응답 처리 중 오류 발생' }));
        throw new Error(errorData.detail || 'API 요청 실패');
      }

      const data: ChatApiResponse = await response.json();
      
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem('chat_session_id', data.session_id);
      }
      
      setMessageType(data.message_type);

      const allSubSentences: string[] = [];
      data.response_sentences.forEach(sentence => {
        // 마침표, 물음표, 느낌표 뒤에 공백이 올 수도 있고 안 올 수도 있음을 고려하여 분리
        // 정규표현식을 사용하여 문장 분리 및 구분자 유지
        const parts = sentence.split(/([.?!])(?=\s|$)/g); // 구분자 뒤에 공백이 오거나 문장 끝인 경우
        let currentSegment = '';
        for (let i = 0; i < parts.length; i++) {
          currentSegment += parts[i];
          if (i % 2 === 1 || (i === parts.length - 1 && currentSegment.trim() !== '')) {
             // 구분자이거나, 마지막 파트인데 내용이 있는 경우
            if (currentSegment.trim() !== '') {
              allSubSentences.push(currentSegment.trim());
            }
            currentSegment = '';
          }
        }
        if (currentSegment.trim() !== '') { // 남아있는 부분이 있다면 추가
          allSubSentences.push(currentSegment.trim());
        }
      });
      
      for (let i = 0; i < allSubSentences.length; i++) {
        const subSentence = allSubSentences[i];
        if (!subSentence) continue; // 빈 문자열은 건너뛰기

        const assistantMessageId = `assistant-${Date.now()}-${i}`;
        const newAssistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: subSentence,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newAssistantMessage]);
        setTypingMessageId(assistantMessageId); // 현재 타이핑 중인 메시지 ID 설정

        // Typewriter가 완료될 때까지 기다림
        await new Promise<void>((resolve) => {
          resolvePromiseRef.current = resolve; 
        });
      }
      setTypingMessageId(null); // 모든 메시지 타이핑 완료

      if (data.recommendations && data.recommendations.length > 0) {
        const mappedRecommendations = data.recommendations.map(rec => ({
          ...rec,
          imageUrl: rec.image_url, // image_url을 imageUrl로 매핑
          description: rec.description === null ? undefined : rec.description // null을 undefined로
        }));
        setRecommendations(mappedRecommendations);
      }
    } catch (error: any) {
      console.error('메시지 전송 중 오류:', error);
      const errorMessageContent = error.message || '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.';
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMessageContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setMessageType('error');
    } finally {
      setIsLoading(false);
      setIsRecommendationsLoading(false);
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

  const handleSuggestedQuestionClick = (question: string) => {
    setInput(question);
  };

  const handleTypingFinished = useCallback((messageId: string) => {
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current();
      resolvePromiseRef.current = null;
    }
  }, []);

  const storeInfoData = [
    { icon: Clock, label: "영업시간", value: "평일 7:00-22:00, 주말 9:00-21:00" },
    { icon: MapPin, label: "주소", value: "서울시 강남구 테헤란로 123" },
    { icon: Phone, label: "전화번호", value: "02-1234-5678" },
    { icon: ParkingCircle, label: "주차", value: "2시간 무료 주차 가능" },
    { icon: Wifi, label: "와이파이", value: "무료 제공" },
    { icon: Dog, label: "반려동물", value: "소형 반려동물 동반 가능" },
  ];

  const orderGuideData = [
    { icon: ShoppingBag, label: "매장 주문", value: "카운터에서 직접 주문" },
    { icon: Globe, label: "온라인 주문", value: "웹사이트 또는 앱에서 가능" },
    { icon: CreditCard, label: "결제 수단", value: "카드, 현금, 카카오페이, 네이버페이" },
    { icon: Users, label: "단체 주문", value: "10인 이상 사전 예약 필요" },
  ];

  const renderSidebarContent = () => {
    if (isRecommendationsLoading && recommendations.length === 0) {
      return (
        <div className="space-y-3 p-1 sm:p-2">
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">AI 추천 메뉴</h3>
          {[...Array(3)].map((_, i) => <SkeletonMenuCard key={i} />)}
        </div>
      );
    }

    if (recommendations.length > 0) {
      return (
        <div className="space-y-2 p-1 sm:p-2">
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">AI 추천 메뉴</h3>
          {recommendations.map((item) => (
            <ChatRecommendationCard
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              imageUrl={item.imageUrl}
              shortDescription={item.description}
              className="shadow-md"
            />
          ))}
        </div>
      );
    }

    switch(messageType) {
      case 'menu_recommendation':
        return (
          <div className="p-4 text-center text-sm text-gray-500">
            추천 드릴 메뉴를 찾고 있어요! 궁금한 점을 물어보세요.
          </div>
        );
        
      case 'customer_service':
        return <StoreInfoCard title="매장 정보" infoItems={storeInfoData} />;
        
      case 'order_info':
        return (
          <OrderGuideCard 
            title="주문 안내" 
            guideItems={orderGuideData} 
            actionButton={{text: "메뉴 보러가기", href: "/menu"}}
          />
        );
        
      default:
        return (
          <div className="text-center text-muted-foreground py-8">
            매장 이용에 관한 질문이 있으시면 편하게 물어보세요.
          </div>
        );
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-4">AI 카페 챗봇 대화하기</h1>
          <Card className="p-4">
            <div ref={scrollAreaRef}>
              <ScrollArea className="h-[500px] mb-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-md">
                <div
                  className="space-y-4"
                  aria-live="polite"
                >
                  {messages.map((message, index) => (
                    <div
                      key={message.id || `msg-${index}`}
                      className={`flex items-end gap-2.5 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                          AI
                        </div>
                      )}
                      <div
                        className={`relative max-w-[75%] p-3.5 rounded-xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-primary-500 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none' 
                        }`}
                      >
                        <div className={cn(
                          'absolute bottom-0 w-3.5 h-3.5 transform',
                          message.role === 'user'
                            ? 'right-0 translate-x-[1px] -translate-y-1/2 rotate-45 bg-primary-500' 
                            : 'left-0 -translate-x-[1px] -translate-y-1/2 -rotate-45 bg-white dark:bg-slate-700' 
                        )}></div>
                        <div className="relative z-10 leading-relaxed">
                          {message.role === 'assistant' ? (
                            <Typewriter 
                              text={message.content} 
                              speed={15} 
                              onFinished={handleTypingFinished}
                              messageId={message.id!}
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm font-medium shadow-sm">
                          나
                        </div>
                      )}
                    </div>
                  ))}
                  {/* AI 응답 로딩 중 메시지 표시 */}
                  {isLoading && typingMessageId === null && (
                    <div
                      className="flex items-end gap-2.5 justify-start"
                      aria-live="assertive"
                      aria-atomic="true"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-sm font-semibold shadow-md">
                        AI
                      </div>
                      <div className="relative max-w-[75%] p-3.5 rounded-xl shadow-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none">
                        <div className={cn(
                          'absolute bottom-0 w-3.5 h-3.5 transform',
                          'left-0 -translate-x-[1px] -translate-y-1/2 -rotate-45 bg-white dark:bg-slate-700'
                        )}></div>
                        <div className="relative z-10 leading-relaxed flex items-center">
                          <span className="italic text-slate-500 dark:text-slate-400">AI가 메시지를 준비 중입니다</span>
                          <div className="ml-2 flex space-x-1">
                            <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            <div className="mb-3 flex flex-wrap gap-2">
              {USER_GUIDE[messageType] && USER_GUIDE[messageType].map((question, idx) => (
                <Button 
                  key={idx} 
                  variant="outline" 
                  size="sm"
                  className="text-xs px-3 py-1.5 rounded-full border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 active:scale-95"
                  onClick={() => handleSuggestedQuestionClick(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 p-3 rounded-lg">
              <label htmlFor="chat-input" className="sr-only">메시지 입력</label>
              <Input
                id="chat-input"
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="AI에게 메시지를 보내보세요..."
                disabled={isLoading}
                className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 focus-visible:border-primary-500 dark:focus-visible:border-primary-400 rounded-lg text-sm p-2.5"
                aria-label="메시지 입력"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading}
                type="button"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap bg-primary-500 hover:bg-primary-600 text-white transition-all duration-300 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="메시지 전송"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    전송 중...
                  </span>
                ) : (
                  <>
                    <SendHorizontal className="w-4 h-4 mr-2" />
                    전송
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 h-full">
          <Card className="p-4 sm:p-6 h-full">
            <ScrollArea className="h-[calc(100vh-10rem)] sm:h-[500px] pr-3">
              {renderSidebarContent()}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
} 