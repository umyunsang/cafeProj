import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 날짜를 한국어 형식으로 포맷팅
 */
export function formatDateToKorean(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error);
    return date.toLocaleString('ko-KR');
  }
}

/**
 * 날짜를 포맷팅하는 유틸리티 함수
 * @param date 날짜 객체 또는 날짜 문자열
 * @param locale 로케일 (기본값: 'ko-KR')
 * @param format 출력 형식 (기본값: 'full' - 전체 날짜와 시간)
 */
export function formatDate(date: Date | string, locale = 'ko-KR', format = 'full'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (format === 'date-only') {
      // 날짜만 출력: 2023-01-01 형식
      return dateObj.toLocaleDateString(locale);
    } else if (format === 'time-only') {
      // 시간만 출력: 12:34 형식
      return dateObj.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } else {
      // 전체 날짜와 시간 출력: 2023년 1월 1일 12시 34분 형식
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale.startsWith('en')
      });
    }
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error);
    return typeof date === 'string' ? date : date.toLocaleString(locale);
  }
}

/**
 * clsx 및 tailwind-merge를 결합한 유틸리티 함수
 * 충돌하는 클래스를 안전하게 병합합니다.
 * @param inputs 병합할 클래스 이름
 */
export function cn(...inputs: ClassValue[]): string {
  if (!inputs || inputs.length === 0) return '';
  try {
    return twMerge(clsx(inputs));
  } catch (error) {
    console.error('클래스 병합 오류:', error);
    return inputs.join(' ');
  }
}

/**
 * 헥스 색상 코드를 RGB 값으로 변환
 * @param hex 헥스 색상 코드 (#RRGGBB 형식)
 * @returns RGB 값을 담은 객체 {r, g, b}
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * 두 색상 간의 대비율 계산 (WCAG 2.0 기준)
 * @param color1 첫 번째 색상 (헥스 코드 #RRGGBB 형식)
 * @param color2 두 번째 색상 (헥스 코드 #RRGGBB 형식)
 * @returns 대비율 (1:1 ~ 21:1 사이의 값, 높을수록 대비가 강함)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    console.error('유효하지 않은 색상 코드:', color1, color2);
    return 1;
  }
  
  // 상대적 휘도 계산
  const luminance1 = calculateRelativeLuminance(rgb1);
  const luminance2 = calculateRelativeLuminance(rgb2);
  
  // 대비율 계산 (밝은 색 / 어두운 색)
  const contrast = luminance1 > luminance2
    ? (luminance1 + 0.05) / (luminance2 + 0.05)
    : (luminance2 + 0.05) / (luminance1 + 0.05);
    
  return Number(contrast.toFixed(2));
}

/**
 * 상대적 휘도 계산 (WCAG 2.0 기준)
 * @param rgb RGB 값 객체 {r, g, b}
 * @returns 상대적 휘도 (0~1 사이 값)
 */
function calculateRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  
  // sRGB 색 공간에서 상대적 휘도 계산을 위한 변환
  const srgbR = r / 255;
  const srgbG = g / 255;
  const srgbB = b / 255;
  
  // 감마 보정
  const R = srgbR <= 0.03928 ? srgbR / 12.92 : Math.pow((srgbR + 0.055) / 1.055, 2.4);
  const G = srgbG <= 0.03928 ? srgbG / 12.92 : Math.pow((srgbG + 0.055) / 1.055, 2.4);
  const B = srgbB <= 0.03928 ? srgbB / 12.92 : Math.pow((srgbB + 0.055) / 1.055, 2.4);
  
  // 가중치를 적용한 상대적 휘도
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * 접근성 표준(WCAG 2.1)에 따른 색상 대비 검사
 * @param foreground 전경색 (텍스트 색)
 * @param background 배경색
 * @returns 접근성 평가 객체 {ratio, passAANormal, passAALarge, passAAA}
 */
export function checkColorContrast(foreground: string, background: string): {
  ratio: number;
  passAANormal: boolean;
  passAALarge: boolean;
  passAAANormal: boolean;
  passAAALarge: boolean;
} {
  const ratio = calculateContrastRatio(foreground, background);
  
  // WCAG 2.1 기준
  // AA 수준: 일반 텍스트 4.5:1, 큰 텍스트 3:1
  // AAA 수준: 일반 텍스트 7:1, 큰 텍스트 4.5:1
  return {
    ratio,
    passAANormal: ratio >= 4.5,
    passAALarge: ratio >= 3,
    passAAANormal: ratio >= 7,
    passAAALarge: ratio >= 4.5
  };
}

/**
 * 주어진 배경색에 대해 가독성 높은 텍스트 색상 반환
 * @param backgroundColor 배경색 (헥스 코드)
 * @param lightColor 밝은 색상 옵션 (기본값: 흰색)
 * @param darkColor 어두운 색상 옵션 (기본값: 검정색)
 * @returns 가독성 높은 텍스트 색상
 */
export function getAccessibleTextColor(
  backgroundColor: string, 
  lightColor: string = '#FFFFFF', 
  darkColor: string = '#121212'
): string {
  const rgb = hexToRgb(backgroundColor);
  
  if (!rgb) {
    console.error('유효하지 않은 배경색 코드:', backgroundColor);
    return darkColor;
  }
  
  // 휘도 기반으로 텍스트 색상 결정
  const luminance = calculateRelativeLuminance(rgb);
  
  // 휘도가 0.5보다 크면 어두운 텍스트, 아니면 밝은 텍스트 사용
  return luminance > 0.5 ? darkColor : lightColor;
}

/**
 * 간단한 문자열 암호화 함수 (클라이언트 사이드)
 * 보안이 중요한 데이터에는 사용하지 말고, 서버 측 암호화를 이용하세요.
 */
export function encrypt(text: string, key: string = 'cafe-recommend'): string {
  // 간단한 XOR 암호화 (클라이언트 사이드에서만 사용)
  const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
  const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
  const applySaltToChar = (code: number, i: number, key: string) => textToChars(key)[Math.floor(i % key.length)] ^ code;

  try {
    return text.split('')
      .map(textToChars)
      .map((char, i) => applySaltToChar(char[0], i, key))
      .map(byteHex)
      .join('');
  } catch (e) {
    console.error('암호화 오류:', e);
    return text; // 오류 시 원본 문자열 반환
  }
}

/**
 * 암호화된 문자열 복호화 함수 (클라이언트 사이드)
 */
export function decrypt(encoded: string, key: string = 'cafe-recommend'): string {
  const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
  const applySaltToChar = (code: number, i: number, key: string) => textToChars(key)[Math.floor(i % key.length)] ^ code;
  
  try {
    return encoded.match(/.{1,2}/g)!
      .map(hex => parseInt(hex, 16))
      .map((charCode, i) => applySaltToChar(charCode, i, key))
      .map(charCode => String.fromCharCode(charCode))
      .join('');
  } catch (e) {
    console.error('복호화 오류:', e);
    return encoded; // 오류 시 입력 문자열 반환
  }
}

/**
 * 숫자를 통화 형식으로 변환
 * @param amount 금액
 * @param locale 로케일 (기본값: 'ko-KR')
 * @param currency 통화 (기본값: 'KRW')
 * @param options 추가 포맷팅 옵션
 */
export function formatCurrency(
  amount: number, 
  locale = 'ko-KR', 
  currency = 'KRW',
  options = { maximumFractionDigits: 0 }
): string {
  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency,
    ...options
  }).format(amount);
}

/**
 * 길이 제한이 있는 텍스트를 자르는 유틸리티 함수
 * @param text 원본 텍스트
 * @param maxLength 최대 길이
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 객체에서 null 또는 undefined 값을 제거하는 유틸리티 함수
 * @param obj 원본 객체
 */
export function removeNullUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

/**
 * 알림 등에서 사용될 상대 날짜 포맷팅 함수
 * 24시간 이내면 "x시간 전", 그 이전이면 "yyyy년 M월 d일 HH:mm" 형식으로 표시
 * @param dateString ISO 8601 형식의 날짜 문자열
 */
export function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    // 24시간 (밀리초 단위) = 24 * 60 * 60 * 1000
    if (now.getTime() - date.getTime() < 86400000) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }
    return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
  } catch (error) {
    console.error('날짜 포맷팅 오류 (formatRelativeDate):', error, dateString);
    return dateString; // 오류 발생 시 원본 문자열 반환
  }
} 

/**
 * 한글이나 특수문자가 포함된 이미지 URL을 안전하게 인코딩합니다.
 * @param imageUrl 원본 이미지 URL
 * @returns 인코딩된 안전한 URL
 */
export function safeImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return '/static/menu_images/default-menu.svg';
  }
  
  try {
    // URL이 이미 완전한 URL인지 확인
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // 상대 경로인 경우 파일명 부분만 인코딩
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const path = parts.slice(0, -1).join('/');
    
    // 파일명을 URI 인코딩하되, 이미 인코딩된 부분은 다시 인코딩하지 않음
    const encodedFilename = encodeURIComponent(decodeURIComponent(filename));
    
    return `${path}/${encodedFilename}`;
  } catch (error) {
    console.warn('이미지 URL 인코딩 실패:', error);
    return '/static/menu_images/default-menu.svg';
  }
} 