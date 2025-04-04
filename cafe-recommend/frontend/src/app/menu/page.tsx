'use client';

import { useState } from 'react';
import { MenuCard } from '@/components/menu/MenuCard';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Menu {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
}

const API_BASE_URL = '/api';

const fetcher = async (url: string) => {
  try {
    console.log('Fetching URL:', url);
    const finalUrl = url.endsWith('/') ? url : `${url}/`;
    
    const res = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', {
        url: finalUrl,
        status: res.status,
        statusText: res.statusText,
        error: errorText
      });
      throw new Error(`메뉴를 불러오는데 실패했습니다 (${res.status}): ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    console.log('API Response:', data);
    
    if (!data) {
      console.error('Empty response from server');
      throw new Error('서버에서 데이터를 반환하지 않았습니다.');
    }
    
    if (!Array.isArray(data)) {
      console.error('Invalid data format:', data);
      throw new Error('서버에서 잘못된 형식의 데이터를 반환했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: menus, error, isLoading } = useSWR<Menu[]>(`${API_BASE_URL}/menus`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 0,
    refreshInterval: 0,
    shouldRetryOnError: false
  });

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg">
          메뉴를 불러오는데 실패했습니다.<br />
          {error.message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-4">로딩중...</div>
      </div>
    );
  }

  if (!menus || !Array.isArray(menus)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center p-4 bg-yellow-50 text-yellow-600 rounded-lg">
          메뉴 데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  // 카테고리 목록 생성
  const categorySet = new Set<string>();
  menus.forEach(menu => {
    if (menu.category) categorySet.add(menu.category);
  });
  const categories = ['all', ...Array.from(categorySet)];

  // 메뉴 필터링
  const filteredMenus = selectedCategory === 'all' 
    ? menus 
    : menus.filter(menu => menu.category === selectedCategory);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">메뉴</h1>
      
      {/* 카테고리 탭 */}
      <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <motion.button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
              selectedCategory === category
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {category === 'all' ? '전체 보기' : category}
          </motion.button>
        ))}
      </div>

      {/* 메뉴 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMenus.map((menu) => (
          <motion.div
            key={menu.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MenuCard
              name={menu.name}
              price={menu.price}
              description={menu.description || undefined}
              category={menu.category}
            />
          </motion.div>
        ))}
      </div>

      {/* 메뉴가 없을 때 */}
      {filteredMenus.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          해당 카테고리의 메뉴가 없습니다.
        </div>
      )}
    </div>
  );
} 