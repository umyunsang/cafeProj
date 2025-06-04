/**
 * 키보드 접근성 유틸리티
 * 
 * WCAG 2.1 AA 표준을 준수하기 위한 키보드 네비게이션 유틸리티 함수 모음
 * - 2.1.1: 키보드로 모든 기능에 접근 가능해야 함
 * - 2.1.2: 키보드 트랩이 없어야 함
 * - 2.4.3: 포커스 순서가 의미와 작동 순서를 유지해야 함
 * - 2.4.7: 포커스 표시가 시각적으로 명확해야 함
 */

import { useEffect, useRef, RefObject } from 'react';

type FocusableElement = HTMLElement & {
  focus: () => void;
}

/**
 * 포커스 가능한 요소 선택자
 */
export const FOCUSABLE_ELEMENTS = 
  'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';

/**
 * 특정 컨테이너 내에서 포커스 트랩을 생성하는 훅
 * 모달 다이얼로그 등에서 사용
 * 
 * @param containerRef 포커스를 가두려는 컨테이너 요소에 대한 ref
 * @param isActive 포커스 트랩이 활성화되어 있는지 여부
 * @param initialFocusRef 초기에 포커스를 맞출 요소 (옵션)
 * @param restoreFocusRef 포커스 트랩이 비활성화될 때 포커스를 복원할 요소 (옵션)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  initialFocusRef?: RefObject<FocusableElement>,
  restoreFocusRef?: RefObject<FocusableElement>
): void {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // 현재 활성화된 요소 저장
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // initialFocusRef가 있으면 해당 요소에 포커스, 없으면 첫 번째 포커스 가능 요소에 포커스
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        focusFirstElement(containerRef.current);
      }

      // 키보드 트랩 설정
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !containerRef.current) return;
        
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Shift+Tab을 누르고 첫 번째 요소에 있으면 마지막 요소로 이동
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } 
        // Tab을 누르고 마지막 요소에 있으면 첫 번째 요소로 이동
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // 포커스 트랩이 비활성화될 때 포커스 복원
      if (restoreFocusRef?.current) {
        restoreFocusRef.current.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isActive, containerRef, initialFocusRef, restoreFocusRef]);
}

/**
 * 컨테이너 내의 첫 번째 포커스 가능 요소에 포커스
 */
export function focusFirstElement(container: HTMLElement | null): void {
  if (!container) return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * 컨테이너 내의 마지막 포커스 가능 요소에 포커스
 */
export function focusLastElement(container: HTMLElement | null): void {
  if (!container) return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
  }
}

/**
 * 컨테이너 내의 모든 포커스 가능 요소 가져오기
 */
export function getFocusableElements(container: HTMLElement): FocusableElement[] {
  if (!container) return [];
  
  const elements = Array.from(
    container.querySelectorAll(FOCUSABLE_ELEMENTS)
  ) as FocusableElement[];
  
  // tabIndex가 있는 요소들은 tabIndex 값에 따라 정렬
  return elements.filter(el => {
    // 숨겨진 요소 필터링
    return window.getComputedStyle(el).display !== 'none' &&
           window.getComputedStyle(el).visibility !== 'hidden';
  });
}

/**
 * 키보드 단축키를 처리하는 훅
 * 
 * @param keyMap 키와 해당 처리 함수의 맵
 * @param isActive 단축키가 활성화되어 있는지 여부 (기본값: true)
 */
export function useKeyboardShortcuts(
  keyMap: Record<string, (e: KeyboardEvent) => void>,
  isActive: boolean = true
): void {
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 요소에서는 단축키 동작 방지 (사용자가 텍스트 입력 시 방해 방지)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Enter 또는 Escape 키는 예외적으로 처리할 수 있음
        if (e.key !== 'Enter' && e.key !== 'Escape') return;
      }
      
      // 단축키 처리
      const handler = keyMap[e.key];
      if (handler) {
        handler(e);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyMap, isActive]);
}

/**
 * 화살표 키를 사용하여 요소 간 이동을 처리하는 함수
 * 메뉴, 툴바, 라디오 그룹 등에서 사용
 * 
 * @param e 키보드 이벤트
 * @param elements 선택 가능한 요소 배열
 * @param currentIndex 현재 선택된 요소의 인덱스
 * @param callback 새 인덱스를 처리하는 콜백
 * @param isHorizontal 가로 방향 탐색 여부 (기본값: false)
 */
export function handleArrowKeyNavigation(
  e: React.KeyboardEvent,
  elements: HTMLElement[],
  currentIndex: number,
  callback: (newIndex: number) => void,
  isHorizontal: boolean = false
): void {
  // 방향에 따른 키 맵핑
  const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
  
  if (elements.length === 0) return;
  
  if (e.key === prevKey) {
    e.preventDefault();
    const newIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    callback(newIndex);
    elements[newIndex]?.focus();
  } else if (e.key === nextKey) {
    e.preventDefault();
    const newIndex = currentIndex >= elements.length - 1 ? 0 : currentIndex + 1;
    callback(newIndex);
    elements[newIndex]?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    callback(0);
    elements[0]?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    const lastIndex = elements.length - 1;
    callback(lastIndex);
    elements[lastIndex]?.focus();
  }
}

/**
 * 페이지 로드 시 접근성 알림을 스크린 리더에게 제공
 */
export function announcePageLoad(message: string): void {
  // 접근성 알림을 위한 요소 생성
  let announcer = document.getElementById('a11y-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }
  
  // 알림 텍스트 설정
  announcer.textContent = message;
  
  // 일정 시간 후 텍스트 제거 (스크린 리더가 동일 메시지를 여러 번 읽는 것 방지)
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = '';
    }
  }, 1000);
} 