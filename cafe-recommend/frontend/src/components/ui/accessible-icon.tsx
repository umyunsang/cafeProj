import * as React from "react";

interface AccessibleIconProps {
  label: string;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * 접근성이 향상된 아이콘 컴포넌트
 * 
 * 아이콘에 스크린 리더가 읽을 수 있는 레이블(대체 텍스트)을 제공합니다.
 * 시각적으로 아이콘을 보여주지만, 스크린 리더에는 의미있는 레이블을 제공합니다.
 * 
 * @param label 스크린 리더가 읽을 레이블
 * @param children 아이콘 컴포넌트 (일반적으로 SVG)
 * @param as 렌더링할 요소 타입 (기본값: span)
 */
export function AccessibleIcon({
  label,
  children,
  as: Comp = "span",
}: AccessibleIconProps) {
  return (
    <Comp
      className="inline-flex"
      role="img"
      aria-label={label}
      aria-hidden="false"
    >
      {React.cloneElement(children as React.ReactElement, {
        "aria-hidden": "true",
        focusable: "false",
      })}
    </Comp>
  );
}

/**
 * 스크린 리더에서만 읽을 수 있는 텍스트 컴포넌트
 * 
 * 시각적으로는 보이지 않지만 스크린 리더는 읽을 수 있는 텍스트를 제공합니다.
 * 아이콘이나 시각적 요소만 있는 버튼에 추가 컨텍스트를 제공할 때 유용합니다.
 * 
 * @param children 스크린 리더가 읽을 텍스트 내용
 * @param as 렌더링할 요소 타입 (기본값: span)
 */
export function VisuallyHidden({
  children,
  as: Comp = "span",
  ...props
}: {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className="sr-only"
      {...props}
    >
      {children}
    </Comp>
  );
} 