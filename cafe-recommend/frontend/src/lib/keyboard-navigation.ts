// 키보드 네비게이션 유틸리티 함수들
import { useEffect, useRef } from 'react'

/**
 * 키보드 이벤트 키 상수
 */
export const Keys = {
  Enter: 'Enter',
  Space: ' ',
  Tab: 'Tab',
  Escape: 'Escape',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Backspace: 'Backspace',
  Delete: 'Delete'
} as const

/**
 * 포커스 가능한 요소들의 셀렉터
 */
export const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary'
].join(', ')

/**
 * 요소가 포커스 가능한지 확인
 */
export function isFocusable(element: Element): boolean {
  if (element.matches(FOCUSABLE_ELEMENTS)) {
    return isVisible(element)
  }
  return false
}

/**
 * 요소가 보이는지 확인
 */
export function isVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement
  return !!(
    htmlElement.offsetWidth ||
    htmlElement.offsetHeight ||
    htmlElement.getClientRects().length
  )
}

/**
 * 컨테이너 내의 모든 포커스 가능한 요소들 가져오기
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS)
  return Array.from(focusableElements).filter(isFocusable) as HTMLElement[]
}

/**
 * 첫 번째 포커스 가능한 요소 가져오기
 */
export function getFirstFocusableElement(container: Element): HTMLElement | null {
  const focusableElements = getFocusableElements(container)
  return focusableElements[0] || null
}

/**
 * 마지막 포커스 가능한 요소 가져오기
 */
export function getLastFocusableElement(container: Element): HTMLElement | null {
  const focusableElements = getFocusableElements(container)
  return focusableElements[focusableElements.length - 1] || null
}

/**
 * 포커스 트랩 생성
 */
export function createFocusTrap(container: Element): () => void {
  const firstFocusable = getFirstFocusableElement(container)
  const lastFocusable = getLastFocusableElement(container)

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== Keys.Tab) return

    if (event.shiftKey) {
      // Shift + Tab (역방향)
      if (document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      // Tab (정방향)
      if (document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // 초기 포커스 설정
  if (firstFocusable) {
    firstFocusable.focus()
  }

  // cleanup 함수 반환
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * 포커스 복원 유틸리티
 */
export class FocusManager {
  private previousActiveElement: Element | null = null

  /**
   * 현재 포커스된 요소 저장
   */
  saveFocus(): void {
    this.previousActiveElement = document.activeElement
  }

  /**
   * 이전에 저장된 요소로 포커스 복원
   */
  restoreFocus(): void {
    if (this.previousActiveElement && this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus()
    }
    this.previousActiveElement = null
  }

  /**
   * 특정 요소로 포커스 설정
   */
  setFocus(element: HTMLElement): void {
    if (element && isFocusable(element)) {
      element.focus()
    }
  }
}

/**
 * 키보드 네비게이션 헬퍼 함수들
 */
export const KeyboardNavigation = {
  /**
   * 방향키로 리스트 네비게이션
   */
  handleListNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void,
    options: { loop?: boolean } = {}
  ): void {
    const { loop = true } = options
    let newIndex = currentIndex

    switch (event.key) {
      case Keys.ArrowDown:
        event.preventDefault()
        newIndex = currentIndex + 1
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1
        }
        break

      case Keys.ArrowUp:
        event.preventDefault()
        newIndex = currentIndex - 1
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0
        }
        break

      case Keys.Home:
        event.preventDefault()
        newIndex = 0
        break

      case Keys.End:
        event.preventDefault()
        newIndex = items.length - 1
        break

      default:
        return
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      onIndexChange(newIndex)
      items[newIndex].focus()
    }
  },

  /**
   * 메뉴 네비게이션 (가로/세로)
   */
  handleMenuNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ): void {
    const isVertical = orientation === 'vertical'
    let newIndex = currentIndex

    switch (event.key) {
      case isVertical ? Keys.ArrowDown : Keys.ArrowRight:
        event.preventDefault()
        newIndex = (currentIndex + 1) % items.length
        break

      case isVertical ? Keys.ArrowUp : Keys.ArrowLeft:
        event.preventDefault()
        newIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1
        break

      case Keys.Home:
        event.preventDefault()
        newIndex = 0
        break

      case Keys.End:
        event.preventDefault()
        newIndex = items.length - 1
        break

      default:
        return
    }

    if (items[newIndex]) {
      onIndexChange(newIndex)
      items[newIndex].focus()
    }
  },

  /**
   * 탭 패널 네비게이션
   */
  handleTabNavigation(
    event: KeyboardEvent,
    tabs: HTMLElement[],
    currentIndex: number,
    onTabChange: (index: number) => void
  ): void {
    let newIndex = currentIndex

    switch (event.key) {
      case Keys.ArrowLeft:
        event.preventDefault()
        newIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1
        break

      case Keys.ArrowRight:
        event.preventDefault()
        newIndex = (currentIndex + 1) % tabs.length
        break

      case Keys.Home:
        event.preventDefault()
        newIndex = 0
        break

      case Keys.End:
        event.preventDefault()
        newIndex = tabs.length - 1
        break

      default:
        return
    }

    if (tabs[newIndex]) {
      onTabChange(newIndex)
      tabs[newIndex].focus()
    }
  }
}

/**
 * 접근성 속성 헬퍼
 */
export const A11yAttributes = {
  /**
   * 버튼에 대한 접근성 속성
   */
  button(options: {
    pressed?: boolean
    expanded?: boolean
    disabled?: boolean
    label?: string
    describedBy?: string
  }) {
    const attrs: Record<string, any> = {
      role: 'button',
      tabIndex: options.disabled ? -1 : 0
    }

    if (options.pressed !== undefined) {
      attrs['aria-pressed'] = options.pressed
    }

    if (options.expanded !== undefined) {
      attrs['aria-expanded'] = options.expanded
    }

    if (options.disabled) {
      attrs['aria-disabled'] = true
    }

    if (options.label) {
      attrs['aria-label'] = options.label
    }

    if (options.describedBy) {
      attrs['aria-describedby'] = options.describedBy
    }

    return attrs
  },

  /**
   * 리스트 아이템에 대한 접근성 속성
   */
  listItem(options: {
    selected?: boolean
    index?: number
    total?: number
    label?: string
  }) {
    const attrs: Record<string, any> = {
      role: 'option',
      tabIndex: -1
    }

    if (options.selected) {
      attrs['aria-selected'] = true
      attrs.tabIndex = 0
    }

    if (options.index !== undefined && options.total !== undefined) {
      attrs['aria-posinset'] = options.index + 1
      attrs['aria-setsize'] = options.total
    }

    if (options.label) {
      attrs['aria-label'] = options.label
    }

    return attrs
  },

  /**
   * 대화상자에 대한 접근성 속성
   */
  dialog(options: {
    modal?: boolean
    labelledBy?: string
    describedBy?: string
  }) {
    const attrs: Record<string, any> = {
      role: 'dialog',
      tabIndex: -1
    }

    if (options.modal) {
      attrs.role = 'alertdialog'
      attrs['aria-modal'] = true
    }

    if (options.labelledBy) {
      attrs['aria-labelledby'] = options.labelledBy
    }

    if (options.describedBy) {
      attrs['aria-describedby'] = options.describedBy
    }

    return attrs
  }
}

/**
 * 스크린 리더 전용 텍스트를 위한 CSS 클래스
 */
export const SR_ONLY_CLASS = 'sr-only'

/**
 * 키보드 단축키 매핑
 */
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  callback: (event: KeyboardEvent) => void
  description?: string
}

/**
 * 키보드 단축키 관리자
 */
export class KeyboardShortcutManager {
  private shortcuts: KeyboardShortcut[] = []
  private isActive = false

  /**
   * 단축키 등록
   */
  register(shortcut: KeyboardShortcut): () => void {
    this.shortcuts.push(shortcut)

    // 등록 해제 함수 반환
    return () => {
      const index = this.shortcuts.indexOf(shortcut)
      if (index > -1) {
        this.shortcuts.splice(index, 1)
      }
    }
  }

  /**
   * 키보드 이벤트 처리
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    for (const shortcut of this.shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault()
        shortcut.callback(event)
        break
      }
    }
  }

  /**
   * 단축키 매칭 확인
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.metaKey === !!shortcut.metaKey
    )
  }

  /**
   * 단축키 활성화
   */
  activate(): void {
    if (!this.isActive) {
      document.addEventListener('keydown', this.handleKeyDown)
      this.isActive = true
    }
  }

  /**
   * 단축키 비활성화
   */
  deactivate(): void {
    if (this.isActive) {
      document.removeEventListener('keydown', this.handleKeyDown)
      this.isActive = false
    }
  }

  /**
   * 모든 단축키 해제
   */
  clear(): void {
    this.shortcuts = []
  }
}

/**
 * 전역 키보드 단축키 관리자 인스턴스
 */
export const globalShortcuts = new KeyboardShortcutManager()

/**
 * 포커스 관리자 인스턴스
 */
export const focusManager = new FocusManager()

/**
 * React hook for focus trap
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean = true
): React.RefObject<T> {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const cleanup = createFocusTrap(containerRef.current)
    
    return cleanup
  }, [isActive])

  return containerRef
} 