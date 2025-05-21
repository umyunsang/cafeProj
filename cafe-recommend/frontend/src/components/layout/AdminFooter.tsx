'use client';

import Link from 'next/link';
import { CONFIG } from '@/config';

export function AdminFooter() {
  return (
    <footer className="bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>© 2025 SipSmart Admin. Designed by AI with Gemini.</p>
        <p>All rights reserved to Git: @umyunsang, Insta: @um_yun3.</p>
      </div>
    </footer>
  );
} 