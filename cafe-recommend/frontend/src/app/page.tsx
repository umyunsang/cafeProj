'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ShoppingBag, MessageCircle, Coffee, CreditCard, Settings, Star, Clock, TrendingUp, ArrowRight, Zap, Users, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from 'next/image';

// Card 컴포넌트 메모이제이션 - 반복적으로 사용되는 UI 컴포넌트 성능 최적화
const FeatureCard = React.memo(({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) => (
  <Card className="p-6 h-full shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 flex flex-col">
    <div className="flex items-center mb-4">
      <div className="p-3 rounded-lg mr-4 preferred-gradient-bg shadow-md">
        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
    </div>
    <p className="text-slate-600 dark:text-slate-300 text-sm flex-grow">
      {description}
    </p>
    <Button variant="link" size="sm" className="mt-4 self-start px-0 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
      자세히 보기 <ArrowRight className="ml-1.5 size-4" />
    </Button>
  </Card>
));

FeatureCard.displayName = 'FeatureCard';

// 추천 메뉴 카드 컴포넌트
const PopularItemCard = React.memo(({ 
  title, 
  image,
  rating, 
  category,
  description
}: { 
  title: string;
  image: string;
  rating: number;
  category: string;
  description?: string; 
}) => (
  <Card className="bg-white dark:bg-slate-800/80 group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-slate-700/50 hover:border-primary-500/30 dark:hover:border-primary-400/30 flex flex-col">
    <div className="relative h-52 bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <Image 
        src={image || '/static/menu_images/default-menu.jpg'} 
        alt={`${title} 이미지`} 
        fill
        style={{ objectFit: "cover" }}
        className="group-hover:scale-110 transition-transform duration-500 ease-in-out"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== '/static/menu_images/default-menu.jpg') {
            target.src = '/static/menu_images/default-menu.jpg';
          }
        }}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        priority={false}
      />
      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1">
        <Star className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
        <span className="text-xs text-white font-medium">{rating.toFixed(1)}</span>
      </div>
    </div>
    <div className="p-5 flex flex-col flex-grow">
      <span className="inline-block px-3 py-1 bg-primary-500/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300 rounded-full text-xs font-semibold mb-2.5">
        {category}
      </span>
      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-1.5">
        {title}
      </h3>
      <div className="opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-40 transition-all duration-300 ease-in-out mt-auto pt-2">
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          {description || '맛있는 메뉴입니다. 상세 설명을 곧 추가할 예정입니다.'}
        </p>
      </div>
      <Button size="sm" className="w-full mt-3 bg-white/50 hover:bg-white/70 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg transform group-hover:scale-105 focus-visible:ring-offset-background">
        상세보기 <ArrowRight className="ml-1.5 size-4" />
      </Button>
    </div>
  </Card>
));

PopularItemCard.displayName = 'PopularItemCard';

export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
      setIsMounted(true);
      const handleScroll = () => {
        setScrollY(window.scrollY);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
  }, []);
  
  // 메모이제이션된 기능 카드 데이터
  const featureCards = useMemo(() => [
    { 
      icon: MessageCircle, 
      title: "1. AI 상담", 
      description: "AI 상담사와 대화하며 취향을 분석하고 맞춤 메뉴를 추천받으세요" 
    },
    { 
      icon: Coffee, 
      title: "2. 메뉴 선택", 
      description: "추천받은 메뉴나 전체 메뉴에서 원하는 음료를 선택하세요" 
    },
    { 
      icon: ShoppingBag, 
      title: "3. 장바구니", 
      description: "선택한 메뉴를 장바구니에 담고 주문 내역을 확인하세요" 
    },
    { 
      icon: CreditCard, 
      title: "4. 결제", 
      description: "카카오페이로 간편하게 결제하고 주문을 완료하세요" 
    }
  ], []);

  // 인기 메뉴 데이터 (실제 서비스에서는 API로 가져올 수 있음)
  const popularItems = useMemo(() => [
    {
      title: "카페 라떼",
      image: "/static/menu_images/latte.jpg",
      rating: 4.8,
      category: "커피",
      description: "부드러운 우유와 깊은 풍미의 에스프레소가 조화로운 클래식 라떼입니다."
    },
    {
      title: "아메리카노",
      image: "/static/menu_images/default-menu.jpg",
      rating: 4.7,
      category: "커피",
      description: "신선한 원두로 추출한 에스프레소에 물을 더해 깔끔하고 시원하게 즐길 수 있습니다."
    },
    {
      title: "바닐라 프라푸치노",
      image: "/static/menu_images/default-menu.jpg",
      rating: 4.5,
      category: "프라푸치노",
      description: "달콤한 바닐라 시럽과 얼음을 함께 갈아 만든 시원하고 부드러운 프라푸치노입니다."
    },
    {
      title: "녹차 라떼",
      image: "/static/menu_images/green_tea_latte.jpg",
      rating: 4.6,
      category: "차",
      description: "쌉싸름한 국내산 녹차와 부드러운 우유가 만나 더욱 풍부한 맛을 내는 음료입니다."
    },
  ], []);

  // 하이라이트 기능 - 사용자에게 주요 기능을 강조
  const highlights = useMemo(() => [
    {
      icon: Star,
      title: "AI 맞춤 추천",
      description: "당신의 취향을 분석해 딱 맞는 메뉴를 제안합니다"
    },
    {
      icon: Clock,
      title: "빠른 주문",
      description: "클릭 몇 번으로 주문부터 결제까지 간편하게"
    },
    {
      icon: TrendingUp,
      title: "인기 메뉴",
      description: "다른 고객들이 선택한 인기 메뉴를 확인하세요"
    }
  ], []);
  
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* 상단 히어로 섹션 */}
      <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden group rounded-b-3xl md:rounded-b-[4rem] preferred-gradient-bg">
        {/* 배경 이미지 - group-hover 효과로 약간 확대, 그라데이션과 어울리도록 투명도 조절 */}
        <div 
          className="absolute inset-0 bg-[url('/images/coffee-bg.jpg')] bg-cover bg-center opacity-20 group-hover:opacity-25 transition-opacity duration-500 ease-in-out transform group-hover:scale-105"
          style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.05)` }}
        ></div>
        {/* 그라데이션 위에 미세한 패턴이나 노이즈 오버레이 (선택적) */}
        {/* <div className="absolute inset-0 bg-[url('/images/noise-overlay.png')] opacity-5"></div> */}
        
        <div className="container mx-auto relative z-20 h-full flex flex-col justify-center items-center text-center px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-white leading-tight">
              지금 바로 특별한 커피 경험을 시작하세요!
            </h1>
            <p className="text-lg sm:text-xl text-slate-100/90 mb-10 max-w-xl mx-auto">
              몇 가지 질문에 답하고,<br />당신의 취향에 완벽하게 맞는 커피를 AI가 추천해 드립니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8 py-3.5 text-lg rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg hover:shadow-white/10 backdrop-blur-sm transform hover:scale-105 focus-visible:ring-offset-slate-900">
                <Link href="/chat">
                  내 커피 취향 찾기 <Zap className="ml-2 size-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-3.5 text-lg rounded-full border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 shadow-lg hover:shadow-white/20 transform hover:scale-105 focus-visible:ring-offset-slate-900">
                <Link href="/menu">
                  전체 메뉴 보기 <Search className="ml-2 size-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-30 pt-12 md:pt-16">
        <div className="max-w-6xl mx-auto">
          {/* 하이라이트 섹션 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {highlights.map((highlight, index) => (
              <Card key={index} className="p-6 h-full shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 flex flex-col text-center items-center">
                <div className="p-4 rounded-full mb-5 preferred-gradient-bg shadow-lg">
                  <highlight.icon className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{highlight.title}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  {highlight.description}
                </p>
              </Card>
            ))}
          </section>

          {/* 메인 섹션 - 주요 기능 링크 */}
          <section className="mb-24">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">서비스 시작하기</h2>
              <Link href="/menu" className="group inline-flex items-center text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold transition-colors" aria-label="서비스 시작하기 - 모두 보기">
                모두 보기
                <ArrowRight className="w-4 h-4 ml-1.5 transform transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link href="/chat" className="block h-full group">
                <Card className="bg-slate-50 dark:bg-slate-800/60 p-8 h-full border border-slate-200 dark:border-slate-700/80 shadow-lg hover:shadow-xl group-hover:border-primary-500/50 dark:group-hover:border-primary-400/50 transition-all duration-300 rounded-xl">
                  <MessageCircle className="h-10 w-10 text-primary-500 dark:text-primary-400 mb-6" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">AI 상담사와 대화하기</h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    취향과 기분에 대해 이야기하고 맞춤 추천을 받아보세요
                  </p>
                </Card>
              </Link>
              <Link href="/menu" className="block h-full group">
                <Card className="bg-slate-50 dark:bg-slate-800/60 p-8 h-full border border-slate-200 dark:border-slate-700/80 shadow-lg hover:shadow-xl group-hover:border-secondary-500/50 dark:group-hover:border-secondary-400/50 transition-all duration-300 rounded-xl">
                  <Coffee className="h-10 w-10 text-secondary-500 dark:text-secondary-400 mb-6" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">전체 메뉴 보기</h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    다양한 음료와 디저트 메뉴를 둘러보세요
                  </p>
                </Card>
              </Link>
              <Link href="/admin" className="block h-full group">
                <Card className="bg-slate-50 dark:bg-slate-800/60 p-8 h-full border border-slate-200 dark:border-slate-700/80 shadow-lg hover:shadow-xl group-hover:border-accent/50 dark:group-hover:border-accent/50 transition-all duration-300 rounded-xl">
                  <Settings className="h-10 w-10 text-accent mb-6" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100">관리자 페이지</h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    매장 메뉴 관리 및 주문 현황을 확인하세요
                  </p>
                </Card>
              </Link>
            </div>
          </section>

          {/* 인기 메뉴 섹션 */}
          <section className="mb-24">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">인기 메뉴</h2>
              <Link href="/menu" className="group inline-flex items-center text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-semibold transition-colors" aria-label="인기 메뉴 - 모든 메뉴 보기">
                모든 메뉴 보기
                <ArrowRight className="w-4 h-4 ml-1.5 transform transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
            
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {popularItems.map((item, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <div className="p-1 h-full">
                      <PopularItemCard 
                        title={item.title}
                        image={item.image}
                        rating={item.rating}
                        category={item.category}
                        description={item.description}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2 fill-current" />
              <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2 fill-current" />
            </Carousel>
          </section>

          {/* 이용 방법 섹션 */}
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-10 text-slate-800 dark:text-slate-100">이용 방법</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featureCards.map((card, index) => (
                <FeatureCard 
                  key={index}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                />
              ))}
            </div>
          </section>

          {/* 프로모션 섹션 */}
          <section className="py-16 md:py-24 bg-gradient-to-br from-primary-600 to-secondary-600 text-white rounded-xl shadow-2xl">
            <div className="max-w-4xl mx-auto text-center px-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">지금 바로 특별한 커피 경험을 시작하세요!</h2>
              <p className="text-lg md:text-xl text-slate-200 mb-10">
                몇 가지 질문에 답하고,<br />당신의 취향에 완벽하게 맞는 커피를 AI가 추천해 드립니다.
              </p>
              <Button asChild size="lg" variant="secondary" className="px-10 py-4 text-lg rounded-full shadow-2xl hover:shadow-white/30 transform hover:scale-105 focus-visible:ring-offset-primary-600">
                <Link href="/chat">
                  내 커피 취향 찾기 <Zap className="ml-2 size-5" />
                </Link>
              </Button>
            </div>
          </section>

          {/* 관리자 정보 섹션 */}
          <section className="mt-24 mb-16">
            <div className="flex items-center justify-center mb-6">
              <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400 mr-2" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100">카페 관리자</h2>
            </div>
            <Card className="bg-slate-50 dark:bg-slate-800/60 p-6 border border-slate-200 dark:border-slate-700/80 shadow-lg rounded-xl">
              <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
                메뉴, 주문, 매출 관리가 필요하신가요? 관리자 페이지에서 모든 것을 한눈에 확인하세요.
              </p>
              <div className="flex justify-center">
                <Button asChild variant="secondary" size="lg">
                  <Link href="/admin">
                    관리자 페이지로 이동 <Users className="ml-2 size-5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* 최종 CTA 섹션 */}
      <section className="py-20 bg-background-light dark:bg-background-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto p-8 md:p-12 preferred-gradient-bg rounded-3xl shadow-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white leading-tight">
              지금 바로 특별한 커피 경험을 시작하세요!
            </h2>
            <p className="text-lg text-slate-100/90 mb-10 max-w-xl mx-auto">
              몇 가지 질문에 답하고,<br />당신의 취향에 완벽하게 맞는 커피를 AI가 추천해 드립니다.
            </p>
            <Button asChild size="lg" className="px-8 py-3.5 text-lg rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg hover:shadow-white/10 backdrop-blur-sm transform hover:scale-105 focus-visible:ring-offset-current">
              <Link href="/chat">
                내 커피 취향 찾기 <Zap className="ml-2 size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 개발 환경에서만 온보딩 가이드 표시 */}
      {isMounted && process.env.NODE_ENV === 'development' ? (
        <div className="hidden">
          <p>개발 환경 온보딩 가이드</p>
        </div>
      ) : null}
    </div>
  );
}
