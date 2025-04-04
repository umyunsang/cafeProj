'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="container mx-auto p-4">
        <motion.div 
          className="max-w-4xl mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* 메인 섹션 */}
          <section className="mb-12 text-center">
            <motion.h1 
              className="text-6xl font-bold mb-4 gradient-text"
              variants={item}
            >
              AI 카페 도우미
            </motion.h1>
            <motion.p 
              className="text-xl text-text-light/80 dark:text-text-dark/80 mb-12"
              variants={item}
            >
              AI와 대화하면서 당신에게 딱 맞는 음료를 추천받아보세요
            </motion.p>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              variants={item}
            >
              <Link href="/chat" className="block">
                <Card className="glassmorphism p-8 hover:scale-105 transition-transform border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-primary/20">
                  <h2 className="text-2xl font-semibold mb-4 gradient-text">AI 상담사와 대화하기</h2>
                  <p className="text-text-light/70 dark:text-text-dark/70">
                    취향과 기분에 대해 이야기하고 맞춤 추천을 받아보세요
                  </p>
                </Card>
              </Link>
              <Link href="/menu" className="block">
                <Card className="glassmorphism p-8 hover:scale-105 transition-transform border-2 border-secondary/20 hover:border-secondary shadow-lg hover:shadow-secondary/20">
                  <h2 className="text-2xl font-semibold mb-4 gradient-text">전체 메뉴 보기</h2>
                  <p className="text-text-light/70 dark:text-text-dark/70">
                    다양한 음료와 디저트 메뉴를 둘러보세요
                  </p>
                </Card>
              </Link>
            </motion.div>
          </section>

          {/* 사용 방법 섹션 */}
          <motion.section variants={item}>
            <h2 className="text-3xl font-bold mb-6 text-center gradient-text">이용 방법</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism p-6 neon-glow border border-primary/10">
                <h3 className="text-xl font-semibold mb-3">1. AI와 대화하기</h3>
                <p className="text-text-light/70 dark:text-text-dark/70">
                  AI 상담사와 자연스러운 대화를 나누며 취향을 파악합니다
                </p>
              </Card>
              <Card className="glassmorphism p-6 neon-glow border border-primary/10">
                <h3 className="text-xl font-semibold mb-3">2. 맞춤 추천 받기</h3>
                <p className="text-text-light/70 dark:text-text-dark/70">
                  대화를 바탕으로 AI가 최적의 메뉴를 추천해드립니다
                </p>
              </Card>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
