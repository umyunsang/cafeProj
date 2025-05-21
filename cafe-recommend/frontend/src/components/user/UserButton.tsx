'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPreferencesDialog } from '@/components/user/UserPreferencesDialog';
import { useUser } from '@/contexts/UserContext';

export function UserButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isReturningUser } = useUser();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDialogOpen(true)}
        className="relative"
        aria-label="사용자 설정"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-user"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        
        {/* 재방문 사용자 표시 */}
        {isReturningUser && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </Button>
      
      <UserPreferencesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
} 