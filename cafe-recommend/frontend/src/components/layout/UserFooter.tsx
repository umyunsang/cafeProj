'use client';

import Link from 'next/link';
import { CONFIG } from '@/config';

export function UserFooter() {
  return (
    <footer className="bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">SipSmart</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              AI와 함께 스마트한 커피 주문을 경험하세요.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-neutral-600 hover:text-primary-500 dark:text-neutral-400 dark:hover:text-primary-400">About Us</Link></li>
              <li><Link href="/contact" className="text-neutral-600 hover:text-primary-500 dark:text-neutral-400 dark:hover:text-primary-400">Contact</Link></li>
              <li><Link href="/terms" className="text-neutral-600 hover:text-primary-500 dark:text-neutral-400 dark:hover:text-primary-400">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-neutral-600 hover:text-primary-500 dark:text-neutral-400 dark:hover:text-primary-400">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Follow Us</h3>
            {/* 소셜 미디어 링크 추가 가능 */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Stay connected for updates and promotions.
            </p>
          </div>
        </div>
        <div className="border-t border-neutral-300 dark:border-neutral-600 pt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>© 2025 SipSmart. Designed by AI with Gemini.</p>
          <p>All rights reserved to Git: @umyunsang, Insta: @um_yun3.</p>
        </div>
      </div>
    </footer>
  );
} 