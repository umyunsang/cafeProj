"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const token = localStorage.getItem("adminToken");
      // 로그인된 상태에서 /admin 접속 시 메뉴 관리 페이지로 이동
      if (token && pathname === "/admin") {
        router.push("/admin/menus");
      }
    } catch (error) {
      console.error("localStorage access error:", error);
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
} 