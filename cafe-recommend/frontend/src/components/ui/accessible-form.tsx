"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldError } from "react-hook-form";

/**
 * FormGroup: 폼 요소와 레이블을 그룹화하는 컴포넌트
 * 
 * @param children FormLabel, FormField 등 폼 관련 컴포넌트
 * @param className 추가 클래스명
 * @param vertical 세로 배치 여부 (기본값: true)
 */
export function FormGroup({
  children,
  className,
  vertical = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-4",
        vertical ? "flex flex-col gap-1.5" : "flex flex-row items-center gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * FormLabel: 접근성이 향상된 폼 레이블 컴포넌트
 * 
 * @param htmlFor 관련 입력 요소의 ID
 * @param required 필수 필드 여부
 * @param children 레이블 내용
 * @param className 추가 클래스명
 */
export function FormLabel({
  htmlFor,
  required,
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium text-gray-900 dark:text-gray-100",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
      {required && (
        <span className="sr-only"> (필수 항목)</span>
      )}
    </label>
  );
}

/**
 * FormDescription: 입력 필드 설명 컴포넌트
 * 
 * @param id 관련 입력 요소의 ID + "-description"
 * @param children 설명 내용
 */
export function FormDescription({
  id,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  id?: string;
}) {
  return (
    <p
      id={id}
      className={cn("text-xs text-gray-500 dark:text-gray-400", className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * FormError: 폼 에러 메시지 컴포넌트
 * 
 * @param id 관련 입력 요소의 ID + "-error"
 * @param children 에러 메시지
 * @param error react-hook-form의 FieldError 객체
 */
export function FormError({
  id,
  children,
  error,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  id?: string;
  error?: FieldError;
}) {
  if (!error && !children) return null;

  return (
    <p
      id={id}
      className={cn("text-xs font-medium text-red-500", className)}
      aria-live="assertive"
      role="alert"
      {...props}
    >
      {children || error?.message}
    </p>
  );
}

/**
 * AccessibleInput: 접근성이 향상된 입력 컴포넌트
 * 
 * @param id 입력 요소의 고유 ID
 * @param label 입력 필드의 레이블
 * @param error 에러 메시지 또는 에러 객체
 * @param description 입력 필드에 대한 부가 설명
 * @param required 필수 입력 여부
 */
export function AccessibleInput({
  id,
  label,
  error,
  description,
  required = false,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string | FieldError;
  description?: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <FormGroup>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      
      <input
        id={id}
        className={cn(
          "w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100",
          "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500 focus:ring-red-500/50",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        required={required}
        {...props}
      />
      
      {description && (
        <FormDescription id={descriptionId}>{description}</FormDescription>
      )}
      
      {error && (
        <FormError id={errorId}>{errorMessage}</FormError>
      )}
    </FormGroup>
  );
}

/**
 * AccessibleTextarea: 접근성이 향상된 텍스트 영역 컴포넌트
 * 
 * @param id 텍스트 영역의 고유 ID
 * @param label 텍스트 영역의 레이블
 * @param error 에러 메시지 또는 에러 객체
 * @param description 텍스트 영역에 대한 부가 설명
 * @param required 필수 입력 여부
 */
export function AccessibleTextarea({
  id,
  label,
  error,
  description,
  required = false,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string | FieldError;
  description?: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <FormGroup>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      
      <textarea
        id={id}
        className={cn(
          "w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100",
          "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500 focus:ring-red-500/50",
          "min-h-[100px] resize-y",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        required={required}
        {...props}
      />
      
      {description && (
        <FormDescription id={descriptionId}>{description}</FormDescription>
      )}
      
      {error && (
        <FormError id={errorId}>{errorMessage}</FormError>
      )}
    </FormGroup>
  );
}

/**
 * AccessibleCheckbox: 접근성이 향상된 체크박스 컴포넌트
 * 
 * @param id 체크박스의 고유 ID
 * @param label 체크박스의 레이블
 * @param error 에러 메시지 또는 에러 객체
 * @param description 체크박스에 대한 부가 설명
 * @param required 필수 선택 여부
 */
export function AccessibleCheckbox({
  id,
  label,
  error,
  description,
  required = false,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string | FieldError;
  description?: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <FormGroup vertical={false}>
      <input
        id={id}
        type="checkbox"
        className={cn(
          "h-4 w-4 text-primary focus:ring-primary/50 rounded",
          "border-gray-300 dark:border-gray-700",
          "bg-white dark:bg-gray-800",
          error && "border-red-500 focus:ring-red-500/50",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        required={required}
        {...props}
      />
      
      <div className="flex flex-col">
        <FormLabel htmlFor={id} required={required}>
          {label}
        </FormLabel>
        
        {description && (
          <FormDescription id={descriptionId}>{description}</FormDescription>
        )}
      </div>
      
      {error && (
        <FormError id={errorId}>{errorMessage}</FormError>
      )}
    </FormGroup>
  );
}

/**
 * AccessibleSelect: 접근성이 향상된 선택 메뉴 컴포넌트
 * 
 * @param id 선택 메뉴의 고유 ID
 * @param label 선택 메뉴의 레이블
 * @param options 선택 옵션 배열 [{ value, label }]
 * @param error 에러 메시지 또는 에러 객체
 * @param description 선택 메뉴에 대한 부가 설명
 * @param required 필수 선택 여부
 */
export function AccessibleSelect({
  id,
  label,
  options = [],
  error,
  description,
  required = false,
  className,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
  error?: string | FieldError;
  description?: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <FormGroup>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      
      <select
        id={id}
        className={cn(
          "w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100",
          "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500 focus:ring-red-500/50",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={cn(descriptionId, errorId)}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {description && (
        <FormDescription id={descriptionId}>{description}</FormDescription>
      )}
      
      {error && (
        <FormError id={errorId}>{errorMessage}</FormError>
      )}
    </FormGroup>
  );
} 