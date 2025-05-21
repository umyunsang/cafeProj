import { UserIdentityDisplay } from '@/components/user/UserIdentityDisplay';

export const metadata = {
  title: '사용자 설정 - 카페 추천 서비스',
  description: '사용자 식별 및 설정 관리 페이지',
};

export default function SettingsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">사용자 설정</h1>
      
      <div className="max-w-lg mx-auto">
        <UserIdentityDisplay className="mb-8" />
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">안내</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            이 페이지에서는 로그인 없이도 사용자를 식별하고 설정을 저장할 수 있습니다.
            사용자 설정은 쿠키에 안전하게 저장되며, 브라우저를 닫거나 세션이 만료되어도 유지됩니다.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            세션 초기화를 선택하면 새로운 사용자 ID가 생성되고 모든 설정이 기본값으로 되돌아갑니다.
          </p>
        </div>
      </div>
    </main>
  );
} 