# 카페 추천 시스템 개발 체크리스트

## 체크리스트 사용 가이드

이 체크리스트는 카페 추천 시스템 개발 진행 상황을 추적하기 위한 문서입니다. 개발 시 다음과 같이 활용하세요:

### 진행 상태 표시 방법
- [ ] 미완료 항목
- [x] 완료된 항목
- [~] 진행 중인 항목
- [!] 문제가 있는 항목

### 우선순위 표시
- 🔴 **최우선** - 필수 기능, 최우선 개발
- 🟠 **높음** - 중요한 기능, 초기 릴리스에 포함
- 🟡 **중간** - 중요하지만 초기 릴리스 후 추가 가능
- 🟢 **낮음** - 추가적인 개선사항

### 코드 참조
- 각 항목에는 작업이 필요한 파일 경로가 `코드블록` 형태로 표시됨
- 📄 **URL 매핑**: 해당 기능과 관련된 URL 정보 제공

---

## 서비스 흐름도

애플리케이션의 전체 사용자 흐름은 다음과 같습니다(실제 라우터 푸시 기반):

### 1. 메인 페이지 진입점
- **홈(/)**: 
  - → AI 상담사와 대화하기(/chat)
  - → 전체 메뉴 보기(/menu)
  - → 관리자 페이지(/admin)

### 2. 메뉴 탐색 흐름
- **메뉴 목록(/menu)**: 
  - → 메뉴 상세(/menu/[id]): 
    - → 뒤로 가기(/menu)
    - → 장바구니(/cart)

### 3. AI 추천 흐름
- **AI 채팅(/chat)**: 
  - → 추천 메뉴 표시 (같은 페이지 내)
  - → 메뉴 선택 → 메뉴 상세(/menu/[id])

### 4. 장바구니 및 주문 흐름
- **장바구니(/cart)**: 
  - → 결제하기(/checkout)
  - → 계속 쇼핑하기(/menu)

- **체크아웃(/checkout)**: 
  - → 결제 진행
  - → 결제 콜백(/payments/callback):
    - → 결제 성공(/payments/success)
    - → 결제 실패(/payments/fail)

- **결제 실패(/payments/fail)**:
  - → 다시 결제하기(/checkout)
  - → 메뉴로 돌아가기(/menu)

- **결제 성공(/payments/success)**:
  - → 주문 목록(/orders)
  - → 메뉴로 돌아가기(/menu)

### 5. 주문 관리 흐름
- **주문 목록(/orders)**: 
  - → 주문 상세(/orders/[id]):
    - → 주문 목록으로 돌아가기(/orders)
    - → 메뉴로 돌아가기(/menu)
    - → 홈으로 돌아가기(/)

### 6. 관리자 흐름
- **관리자 페이지(/admin)**: 
  - → 메뉴 관리(/admin/menus)

### 7. 페이지별 주요 기능 및 연결
| 페이지 | 기능 | 가능한 이동 경로 |
|--------|------|-----------------|
| / (홈) | 시스템 소개, AI 챗봇 및 메뉴 접근 | /chat, /menu, /admin |
| /chat | AI와 대화, 메뉴 추천 받기 | /menu/[id] |
| /menu | 전체 메뉴 조회 | /menu/[id], /cart | 
| /menu/[id] | 메뉴 상세 정보, 장바구니 담기 | /menu, /cart |
| /cart | 장바구니 관리, 수량 조절 | /checkout, /menu |
| /checkout | 주문 정보 입력, 결제 진행 | /payments/callback |
| /payments/callback | 결제 처리 | /payments/success, /payments/fail |
| /payments/fail | 결제 실패 처리 | /checkout, /menu |
| /payments/success | 결제 완료 화면 | /orders, /menu |
| /orders | 주문 내역 조회 | /orders/[id], /menu, / |
| /orders/[id] | 주문 상세 정보 | /orders, /menu, / |
| /admin | 관리자 대시보드 | /admin/menus |
| /admin/menus | 메뉴 관리 | /admin |

## 목차
1. [사용자 경험 (UX/UI)](#1-사용자-경험-uxui)
2. [핵심 기능 강화](#2-핵심-기능-강화)
3. [신규 기능 추가](#3-신규-기능-추가)
4. [AI 챗봇 및 자동화 시스템](#4-ai-챗봇-및-자동화-시스템)
5. [관리자 기능 확장](#5-관리자-기능-확장)
6. [기술적 개선](#6-기술적-개선)
7. [사용하지 않는 리소스 정리](#7-사용하지-않는-리소스-정리-신규)
8. [문서화 및 지원](#8-문서화-및-지원)
9. [프론트엔드 리팩토링](#9-프론트엔드-리팩토링)
10. [국제화 및 현지화](#10-국제화-및-현지화-선택적)
11. [모바일 최적화 강화](#11-모바일-최적화-강화)
12. [성능 최적화 강화](#12-성능-최적화-강화)
13. [사용자 경험 개선](#13-사용자-경험-개선)
14. [데이터 관리 및 분석](#14-데이터-관리-및-분석)
15. [보안 강화](#15-보안-강화)
16. [메뉴 추천 시스템 고도화](#16-메뉴-추천-시스템-고도화)
17. [결제 시스템 강화](#17-결제-시스템-강화)
18. [접근성 표준 준수](#18-접근성-표준-준수)
19. [관리자 경험 개선](#19-관리자-경험-개선)
20. [테스트 및 품질 관리](#20-테스트-및-품질-관리)

---

## 1. 사용자 경험 (UX/UI)

- [x] 🔴 **반응형 디자인 최적화**
  - [x] 모바일 기기에서 테스트 및 최적화 `frontend/src/app/globals.css`, `frontend/tailwind.config.js`
  - [x] 태블릿 기기에서 테스트 및 최적화 `frontend/src/app/globals.css`, `frontend/tailwind.config.js`
  - [x] 다양한 화면 크기에 대응하는 레이아웃 개선 `frontend/src/app/layout.tsx`
  - 📄 **URL 매핑**: `/`, `/menu`, `/cart`, `/checkout` 등 모든 페이지

- [x] 🟠 **접근성 향상**
  - [x] WCAG 2.1 가이드라인 준수 `frontend/src/components/`
  - [x] 키보드 접근성 개선 `frontend/src/components/`
  - [x] 화면 읽기 프로그램 지원 `frontend/src/lib/`
  - 📄 **URL 매핑**: 전체 애플리케이션 `/`, `/menu`, `/cart`, `/checkout`, `/admin/*`

- [ ] 🔴 **성능 최적화**
  - [x] 번들 크기 최적화 `frontend/next.config.js`
  - [x] API 요청 최적화 및 캐싱 전략 구현 `frontend/src/lib/api-cache.ts`, `frontend/src/lib/api-client.ts`, `frontend/src/lib/api-hooks.ts`
  - 📄 **URL 매핑**: 전체 애플리케이션, 특히 이미지가 많은 `/menu`, `/menu/[id]` 페이지

## 2. 핵심 기능 강화

- [ ] 🔴 **주문 프로세스**
  - [x] 주문 상태 실시간 업데이트 `backend/app/routers/order.py`, `frontend/src/app/cart/`, `frontend/src/app/checkout/`
  - [x] 예상 준비 시간 표시 `backend/app/routers/order.py`, `frontend/src/app/checkout/`
  - [x] 주문 수정 기능 추가 `backend/app/routers/order.py`, `frontend/src/app/cart/`
  - [x] 쿠키 기반 주문 히스토리 관리 `backend/app/routers/order.py`, `frontend/src/lib/cookies.ts`, `frontend/src/app/orders/`
  - 📄 **URL 매핑**: `/cart` → `/checkout` → `/payments/callback` → `/payments/success` → `/orders` → `/orders/[id]`

- [ ] 🔴 **결제 시스템**
  - [x] 로그인 없는 간편 결제 프로세스 `frontend/src/app/payments/`, `backend/app/routers/payment.py`
  - [x] 결제 실패 처리 개선 `frontend/src/app/payments/fail/`, `backend/app/routers/payment.py`
  - [x] 환불 프로세스 자동화 `backend/app/routers/payment.py`, `frontend/src/app/payments/`
  - 📄 **URL 매핑**: `/checkout` → `/payments/callback` → `/payments/success|fail` → `/orders` 또는 `/menu`

## 3. 신규 기능 추가

- [x] 🟠 **세션/쿠키 기반 사용자 식별 시스템** 
  - [x] 로그인 없는 사용자 식별 구현 `backend/app/core/session.py`, `frontend/src/lib/user-identity.ts`
  - [x] 쿠키 기반 주문 기록 관리 `backend/app/routers/user_identity.py`, `frontend/src/lib/cookies.ts`
  - [x] 세션 데이터 최적화 및 보안 강화 `backend/app/core/session.py`
  - [x] 사용자 기기별 설정 저장 `frontend/src/contexts/user-context.tsx`
  - 📄 **URL 매핑**: 전체 애플리케이션에 적용, 특히 `/settings`, `/cart`, `/chat` 페이지

- [x] 🟡 **리뷰 및 평점 시스템**
  - [x] 익명 리뷰 작성 기능 `backend/app/routers/reviews.py`, `frontend/src/app/menu/[id]/review/`
  - [x] 사진 첨부 기능 `backend/app/models/review.py`, `frontend/src/components/review/`
  - [x] 리뷰 관리 및 모더레이션 도구 `backend/app/routers/reviews.py`, `frontend/src/components/review/`
  - 📄 **URL 매핑**: `/menu/[id]/review` 

## 4. AI 챗봇 및 자동화 시스템 
(현재 ai 챗봇과 메뉴추천은 `backend/app/routers/chat.py`에 구현되어있음)

- [x] 🟠 **OpenAI API 통합 및 설정**
  - [x] OpenAI API 키 관리 및 보안 설정 `backend/app/core/config.py`, `backend/.env`
  - [x] 적절한 모델 선택 및 비용 최적화 전략 `backend/app/api/ai/openai_client.py`
  - [x] API 호출 캐싱 및 최적화 `backend/app/api/ai/openai_client.py`
  - 📄 **URL 매핑**: 서버 측 구성, 직접적인 URL 없음

- [x] 🔴 **AI 카페 운영 보조 챗봇**
  - [x] OpenAI API 기반 고객 문의 응대 기능 `backend/app/api/ai/openai_client.py`, `frontend/src/app/chat/`
  - [x] 메뉴 추천 및 안내를 위한 프롬프트 엔지니어링 `backend/app/api/ai/openai_client.py`
  - [x] 주문 관련 정보 제공 `backend/app/routers/chat.py`, `frontend/src/app/chat/`
  - 📄 **URL 매핑**: `/chat` → 추천 메뉴 표시 → `/menu/[id]` → `/cart`

## 5. 관리자 기능 확장

- [x] 🟠 **대시보드 개선**
  - [x] 실시간 매출 통계 강화 `backend/app/api/admin/realtime.py`, `frontend/src/app/admin/dashboard/`
  - [x] 데이터 시각화 개선 `frontend/src/app/admin/dashboard/`
  - 📄 **URL 매핑**: `/admin/dashboard`

- [x] 🔴 **결제 API 설정 관리** *(신규 개발 완료)*
  - [x] 네이버페이 API 키 관리 기능 `backend/app/api/admin/settings.py`, `frontend/src/app/admin/settings/`
  - [x] 카카오페이 API 키 관리 기능 `backend/app/api/admin/settings.py`, `frontend/src/app/admin/settings/`
  - [x] API 키 보안 저장 및 관리 `backend/app/core/security.py`
  - [x] 결제 설정 백업 및 복원 기능 `backend/app/api/admin/settings.py`
  - 📄 **URL 매핑**: `/admin/settings/payment`

- [ ] 🟡 **재고 관리** *(신규 개발 필요)*
  - [x] 재료 및 재고 추적 시스템 `backend/app/api/admin/inventory/`, `frontend/src/app/admin/inventory/`
  - [x] 재고 기반 메뉴 가용성 표시 `backend/app/api/menu/availability.py`, `frontend/src/app/menu/`
  - 📄 **URL 매핑**: `/admin/inventory` (개발 완료)

- [x] 🔴 **메뉴 관리**
  - [x] 메뉴 CRUD 기능 개선 `backend/app/api/admin/menu.py`, `frontend/src/app/admin/menus/`
  - [x] 메뉴 이미지 관리 개선 `backend/app/api/admin/menu.py`, `frontend/src/app/admin/menus/`
  - 📄 **URL 매핑**: `/admin/menus`

- [ ] 🔴 **주문 관리**
  - [x] 주문 상태 관리 개선 `backend/app/api/admin/orders.py`, `frontend/src/app/admin/orders/`
  - [x] 주문 통계 및 분석 `backend/app/api/admin/dashboard.py`
  - 📄 **URL 매핑**: `/admin/orders`

## 6. 기술적 개선

- [ ] 🟡 **테스트 자동화**
  - [ ] 단위 테스트 구현 `backend/app/tests/`, `frontend/src/tests/unit/`
  - [ ] 통합 테스트 구현 `backend/app/tests/integration/`, `frontend/src/tests/integration/`
  - [ ] E2E 테스트 구현 `frontend/src/tests/e2e/`, `backend/app/tests/e2e/`
  - [ ] 성능 테스트 추가 `backend/app/tests/performance/`, `frontend/src/tests/performance/`
  - 📄 **URL 매핑**: 테스트 환경 구성, 직접적인 URL 없음

- [ ] 🟢 **CI/CD 파이프라인 구축** *(신규 개발 필요)*
  - [ ] 자동 빌드 및 배포 설정 `scripts/`, `.github/workflows/`
  - [ ] 테스트 자동화 연동 `scripts/run-tests.sh`
  - 📄 **URL 매핑**: 개발 인프라 구성, 직접적인 URL 없음

- [ ] 🔴 **보안 강화**
  - [ ] 세션/쿠키 보안 최적화 `backend/app/core/`, `frontend/src/lib/cookies.ts`
  - [ ] HTTPS 최적화 `backend/app/main.py`, `frontend/next.config.js`
  - [ ] API 보안 개선 `backend/app/core/`, `backend/app/dependencies.py`
  - 📄 **URL 매핑**: 전체 애플리케이션, 특히 `/api/*`, `/checkout`, `/payments`

- [ ] 🟠 **데이터베이스 최적화**
  - [ ] 쿼리 최적화 `backend/app/crud/`
  - [ ] 데이터 모델 개선 `backend/app/models/`, `backend/app/schemas/`
  - 📄 **URL 매핑**: 서버 측 구성, 직접적인 URL 없음

## 7. 사용하지 않는 리소스 정리 (신규)

- [~] 🟠 **불필요한 코드 제거**
  - [ ] 사용하지 않는 컴포넌트 제거 `frontend/src/components/`
  - [x] 사용하지 않는 API 엔드포인트 정리 - 제거된 파일: `backend/app/api/order.py`, `backend/app/api/cart.py`, `backend/app/api/payment.py`
  - [ ] 미사용 페이지 제거 - 삭제된 파일들 확인: `frontend/src/app/order/[id]/page.tsx`, `frontend/src/app/payment/callback/page.tsx`
  - 📄 **영향 범위**: 전체 프로젝트

- [ ] 🟠 **의존성 정리**
  - [ ] `package.json`에서 사용하지 않는 패키지 제거 `frontend/package.json`
  - [ ] `requirements.txt`에서 사용하지 않는 패키지 제거 `backend/requirements.txt`
  - 📄 **영향 범위**: 전체 프로젝트

- [ ] 🟡 **파일 구조 간소화**
  - [ ] 중복 파일 제거 및 병합
  - [ ] 논리적 디렉토리 구조 재조직
  - 📄 **영향 범위**: 전체 프로젝트

## 8. 문서화 및 지원

- [ ] 🟡 **사용자 매뉴얼**
  - [ ] 일반 사용자용 가이드 `docs/user-guide.md`
  - [ ] 카페 운영자용 가이드 `docs/operator-guide.md`
  - [ ] AI 챗봇 활용 가이드 `docs/chatbot-guide.md`
  - 📄 **URL 매핑**: `/help` (개발 필요)

- [ ] 🟡 **개발자 문서**
  - [ ] API 문서 자동화 `backend/app/main.py`
  - [ ] 코드 주석 개선 전체 코드베이스
  - [ ] 아키텍처 다이어그램 업데이트 `docs/architecture/`
  - 📄 **URL 매핑**: `/api/docs` (개발 필요)

## 9. 프론트엔드 리팩토링

- [ ] 🟠 **페이지 구조 개선**
  - [ ] 모든 page.tsx 파일 리팩토링 `frontend/src/app/**/page.tsx`
  - [ ] 컴포넌트 분리 및 재사용성 향상 `frontend/src/components/`
  - [ ] 페이지 로딩 최적화 `frontend/src/app/layout.tsx`, `frontend/next.config.js`
  - [x] 세션/쿠키 기반 상태 관리 아키텍처 `frontend/src/contexts/user-context.tsx`, `frontend/src/lib/cookies.ts`
  - 📄 **URL 매핑**: 실제 라우터 흐름(홈 → 메뉴 → 상세 → 장바구니 → 체크아웃 → 결제 → 주문)의 모든 페이지

- [ ] 🟡 **레이아웃 시스템 재구성**
  - [ ] RootLayout 구조 최적화 `frontend/src/app/layout.tsx`
  - [ ] 공통 레이아웃 컴포넌트 추출 `frontend/src/components/layouts/`
  - [ ] 레이아웃 중첩 구조 단순화 `frontend/src/app/**/layout.tsx`
  - 📄 **URL 매핑**: 전체 애플리케이션의 레이아웃 구성

- [ ] 🟡 **디자인 시스템 구축**
  - [ ] 디자인 토큰 시스템 도입 `frontend/src/lib/design-tokens.ts`, `frontend/src/app/globals.css`
  - [ ] 일관된 UI 컴포넌트 라이브러리 개발 `frontend/src/components/ui/`
  - [ ] 테마 시스템 (다크/라이트 모드) 구현 `frontend/src/contexts/theme-context.tsx`
  - 📄 **URL 매핑**: 전체 애플리케이션에 적용

- [ ] 🟠 **Next.js 기능 최적화**
  - [ ] Server Components와 Client Components 분리 최적화 `frontend/src/components/`
  - [ ] 정적 생성과 동적 렌더링 전략 재검토 `frontend/src/app/**/page.tsx`
  - [ ] Image 컴포넌트 최적화 `frontend/src/components/ui/`, `frontend/next.config.js`
  - 📄 **URL 매핑**: 전체 프론트엔드 애플리케이션

- [ ] 🟠 **코드 품질 향상**
  - [x] TypeScript 타입 정의 개선 `frontend/src/types/`
  - [ ] 불필요한 렌더링 최소화 `frontend/src/components/`
  - [ ] 코드 중복 제거 전체 코드베이스
  - 📄 **URL 매핑**: 전체 프론트엔드 코드베이스

## 10. 국제화 및 현지화 (선택적)

- [ ] 🟢 **다국어 지원**
  - [ ] 다국어 지원 프레임워크 구현 `frontend/src/lib/i18n/`, `backend/app/core/i18n/`
  - [ ] 언어 전환 UI 개발 `frontend/src/components/language-switcher.tsx`
  - [ ] 지역별 콘텐츠 맞춤화 `frontend/src/lib/i18n/locales/`, `backend/app/core/i18n/locales/`
  - 📄 **URL 매핑**: 전체 애플리케이션, 특히 `/menu`, `/help` 등 콘텐츠가 많은 페이지

## 11. 모바일 최적화 강화

- [ ] 🟡 **PWA(Progressive Web App) 구현**
  - [ ] 서비스 워커 설정 `frontend/src/service-worker.js`
  - [ ] 오프라인 작동 지원 `frontend/src/lib/offline-support.ts`
  - [ ] 홈 화면 추가 기능 구현 `frontend/public/manifest.json`
  - 📄 **URL 매핑**: 전체 애플리케이션

- [ ] 🟠 **모바일 터치 인터페이스 최적화**
  - [ ] 터치 제스처 지원 `frontend/src/lib/gestures.ts`
  - [ ] 모바일 폼 요소 사용성 개선 `frontend/src/components/ui/form/`
  - 📄 **URL 매핑**: `/cart`, `/checkout`, `/menu` 등 사용자 상호작용이 많은 페이지

## 12. 성능 최적화 강화

- [ ] 🟠 **번들 분석 및 최적화**
  - [x] 코드 분할(Code Splitting) 구현 `frontend/next.config.js`
  - [ ] 중복 의존성 분석 및 제거 `frontend/package.json`
  - 📄 **URL 매핑**: 전체 애플리케이션

- [x] 🟠 **API 응답 최적화**
  - [x] 데이터 페이징 구현 `backend/app/routers/menus.py`
  - [x] 응답 압축 설정 `backend/app/main.py`
  - [x] API 캐싱 레이어 추가 `backend/app/core/cache.py`
  - 📄 **URL 매핑**: `/api/*` 엔드포인트

## 13. 사용자 경험 개선

- [x] 🟡 **온보딩 프로세스 개발**
  - [x] 첫 방문 사용자 가이드 `frontend/src/components/onboarding/`
  - [x] 기능 소개 툴팁 `frontend/src/components/ui/tooltip.tsx`
  - 📄 **URL 매핑**: `/`, `/menu` 등 주요 페이지

- [x] 🟠 **오류 처리 UX 개선**
  - [x] 사용자 친화적 오류 메시지 `frontend/src/components/ui/error.tsx`
  - [x] 오프라인 상태 처리 개선 `frontend/src/lib/network.ts`
  - [x] 자동 복구 메커니즘 구현 `frontend/src/lib/error-recovery.ts`
  - 📄 **URL 매핑**: 전체 애플리케이션

- [x] 🔴 **랜딩 페이지 개선**
  - [x] 직관적인 UI/UX 디자인으로 메인 페이지 리뉴얼 `frontend/src/app/page.tsx`
  - [x] 페이지 로딩 속도 최적화 `frontend/src/app/page.tsx`
  - [x] 관리자 접근 경로 추가 및 보안 강화 `frontend/src/app/page.tsx`
  - [x] 반응형 디자인 강화 `frontend/src/app/globals.css`
  - 📄 **URL 매핑**: `/` → `/chat`, `/menu`, `/admin`

## 14. 데이터 관리 및 분석

- [ ] 🟡 **사용자 행동 분석 시스템**
  - [ ] 익명 사용 패턴 추적 `frontend/src/lib/analytics.ts`
  - [ ] 히트맵 및 사용자 여정 분석 `backend/app/routers/analytics.py`
  - 📄 **URL 매핑**: `/admin/analytics`

- [ ] 🟠 **데이터 백업 및 복구 전략**
  - [ ] 자동 데이터베이스 백업 구현 `scripts/backup-db.sh`
  - [ ] 장애 복구 프로세스 문서화 `docs/disaster-recovery.md`
  - 📄 **URL 매핑**: 서버 측 구성

## 15. 보안 강화

- [ ] 🔴 **CSRF 및 XSS 방어 강화**
  - [ ] CSRF 토큰 구현 `backend/app/core/security.py`
  - [ ] Content Security Policy 설정 `frontend/next.config.js`
  - 📄 **URL 매핑**: 전체 애플리케이션

- [ ] 🟠 **API 레이트 리미팅**
  - [ ] 요청 제한 구현 `backend/app/dependencies.py`
  - [ ] 비정상 트래픽 탐지 `backend/app/core/security.py`
  - 📄 **URL 매핑**: `/api/*` 엔드포인트

## 16. 메뉴 추천 시스템 고도화

- [ ] 🟡 **AI 추천 설명 기능**
  - [ ] 추천 근거 표시 기능 `frontend/src/app/chat/components/recommendation.tsx`
  - [ ] 메뉴 특성 시각화 `frontend/src/components/menu/flavor-profile.tsx`
  - 📄 **URL 매핑**: `/chat`

## 17. 결제 시스템 강화

- [ ] 🔴 **결제 프로세스 간소화**
  - [ ] 원클릭 결제 구현 `frontend/src/app/checkout/`
  - [ ] 결제 정보 저장 시스템 (쿠키 기반) `frontend/src/lib/payment-storage.ts`
  - 📄 **URL 매핑**: `/checkout` → `/payments/callback` → `/payments/success`

- [ ] 🔴 **결제 API 연동 개선**
  - [ ] 카카오페이 연동 강화 및 관리자 설정 연결 `backend/app/routers/payment.py`
  - [ ] 네이버페이 연동 강화 및 관리자 설정 연결 `backend/app/routers/payment.py`
  - [ ] 무중단 결제 API 키 업데이트 시스템 `backend/app/core/config.py`
  - [ ] 결제 API 오류 모니터링 및 알림 `backend/app/api/admin/alerts.py`
  - 📄 **URL 매핑**: `/api/payment/*`, `/admin/settings/payment`, `/payments/callback`, `/payments/success`, `/payments/fail`

- [ ] 🟠 **영수증 및 주문 확인 개선**
  - [ ] 디지털 영수증 전송 기능 `backend/app/routers/order.py`
  - [ ] 주문 추적 페이지 개선 `frontend/src/app/orders/[id]/page.tsx`
  - 📄 **URL 매핑**: `/orders` → `/orders/[id]`

## 18. 접근성 표준 준수

- [x] 🟠 **WCAG 2.1 AA 수준 준수**
  - [x] 스크린 리더 호환성 검증 `frontend/src/components/ui/`
  - [x] 키보드 네비게이션 개선 `frontend/src/lib/keyboard-navigation.ts`
  - [x] 색상 대비 최적화 `frontend/src/app/globals.css`
  - 📄 **URL 매핑**: 전체 애플리케이션

- [ ] 🟡 **접근성 테스트 자동화**
  - [ ] 접근성 테스트 스크립트 구현 `frontend/src/tests/accessibility/`
  - [ ] CI/CD 파이프라인에 접근성 검사 통합 `.github/workflows/accessibility.yml`
  - 📄 **URL 매핑**: 개발 인프라

## 19. 관리자 경험 개선

- [x] 🟡 **실시간 알림 시스템**
  - [x] 재고 부족 알림 `backend/app/routers/admin/notifications.py`
  - [x] 주문량 급증 알림 `backend/app/routers/admin/alerts.py`
  - 📄 **URL 매핑**: `/api/admin/notifications`, `/api/admin/alerts`

- [ ] 🟡 **대시보드 사용자 정의 기능**
  - [ ] 커스텀 위젯 구성 `frontend/src/app/admin/dashboard/components/widgets/`
  - [ ] 데이터 시각화 옵션 확장 `frontend/src/app/admin/dashboard/components/charts/`
  - 📄 **URL 매핑**: `/admin/dashboard`

## 20. 테스트 및 품질 관리

- [ ] 🟠 **테스트 커버리지 향상**
  - [ ] 핵심 비즈니스 로직 단위 테스트 `backend/app/tests/unit/`
  - [ ] 주요 사용자 흐름 E2E 테스트 `frontend/src/tests/e2e/`
  - 📄 **URL 매핑**: 테스트 환경

- [ ] 🟡 **코드 품질 모니터링**
  - [ ] 정적 코드 분석 도구 통합 `.github/workflows/code-quality.yml`
  - [ ] 코드 복잡도 분석 및 리팩토링 지침 `docs/code-quality-guidelines.md`
  - 📄 **URL 매핑**: 개발 인프라