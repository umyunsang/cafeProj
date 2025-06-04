# cafeProj

카페 메뉴 추천, AI 챗봇, 주문, 결제, 관리자 기능까지 통합 제공하는 **현대적 웹 서비스**입니다.  
Next.js(프론트엔드)와 FastAPI(백엔드) 기반으로, 실서비스 수준의 기능과 구조를 갖추고 있습니다.

---

## 목차

1. 프로젝트 개요
2. 주요 URL 및 서비스 흐름 (프론트엔드)
3. 백엔드 API 및 기능 상세
4. 시스템 아키텍처
5. 환경설정, 실행법
6. 기여/문의

---

## 1. 프로젝트 개요

- **AI 기반 카페 메뉴 추천**: AI 챗봇과 대화하며 취향에 맞는 메뉴 추천
- **메뉴 조회/주문/결제**: 메뉴 탐색, 장바구니, 주문, 네이버페이 등 결제 지원
- **실시간 채팅/상담**: AI 챗봇 및 고객 상담 기능
- **관리자 시스템**: 메뉴/주문/결제/알림/대시보드 등 관리자 기능 제공
- **현대적 웹 스택**: Next.js(React, TypeScript, Tailwind), FastAPI, SQLite, Docker 등

---

## 2. 주요 URL 및 서비스 흐름 (프론트엔드)

### 메인 페이지
- `/`  
  - 서비스 소개, 인기 메뉴, 주요 기능(상담→메뉴선택→장바구니→결제) 안내

### 추천/상담
- `/recommend`  
  - AI 챗봇과 대화하며 맞춤 메뉴 추천
- `/chat`  
  - 실시간 채팅/상담 기능

### 메뉴/주문/결제
- `/menu`  
  - 전체 메뉴 리스트, 카테고리별 탐색
- `/menu/[id]`  
  - 개별 메뉴 상세 정보
- `/cart`  
  - 장바구니, 담은 메뉴 확인/수정/삭제
- `/orders`  
  - 내 주문 내역 리스트
- `/orders/[id]`  
  - 개별 주문 상세 정보
- `/checkout`  
  - 결제 진행(네이버페이 등)
- `/payments/success`, `/payments/fail`, `/payments/naver/callback`  
  - 결제 결과 및 콜백 처리

### 인증/설정
- `/auth/login`, `/auth/register`  
  - 회원가입, 로그인
- `/settings`  
  - 사용자 설정

### 관리자(Admin)
- `/admin`  
  - 관리자 대시보드
- `/admin/menus`  
  - 메뉴 관리(등록/수정/삭제)
- `/admin/orders`  
  - 주문 관리
- `/admin/notifications`, `/admin/alerts`  
  - 알림/이벤트 관리
- `/admin/settings`  
  - 시스템 설정

---

## 3. 백엔드 API 및 기능 상세

### 주요 API 엔드포인트

- `/api/menus`  
  - 메뉴 전체/카테고리별 조회, 인기 메뉴, 상세 정보
- `/api/cart`  
  - 장바구니 생성/조회/수정/삭제, 아이템 추가/수정/삭제
- `/api/order`  
  - 주문 생성, 주문 내역/상세/상태별 조회
- `/api/payments`  
  - 결제 요청, 콜백, 결제 상태 관리
- `/api/chat`  
  - AI 챗봇 대화, 메뉴 추천, 세션 관리, 스트리밍 응답
- `/api/user-identity`  
  - 사용자 세션/식별 관리

#### 관리자 전용 API
- `/api/admin/auth`  
  - 관리자 인증(JWT)
- `/api/admin/menus`, `/api/admin/orders`, `/api/admin/payments`  
  - 관리자용 메뉴/주문/결제 관리
- `/api/admin/dashboard`  
  - 통계/대시보드
- `/api/admin/notifications`, `/api/admin/alerts`  
  - 실시간 알림/이벤트/분석
- `/api/admin/settings`  
  - 시스템 설정

#### 기타
- `/api/csrf-token`, `/api/csrf-test`  
  - 보안/CSRF 토큰 관리
- `/api/docs`, `/api/redoc`  
  - API 문서

### 인증/보안
- 일반 사용자: 세션 기반 인증
- 관리자: JWT 토큰 인증
- 레이트 리미팅, CORS, GZIP, CSRF 등 보안/성능 미들웨어 적용

---

## 4. 시스템 아키텍처

- **프론트엔드**: Next.js, TypeScript, Tailwind CSS, REST API 연동
- **백엔드**: FastAPI, SQLAlchemy, SQLite, JWT, RESTful 구조
- **AI 챗봇**: OpenAI API 등 연동, 메뉴 추천/상담/대화
- **결제**: 네이버페이 샌드박스 연동
- **관리자**: 별도 관리자 페이지 및 API
- **자동화/배포**: Docker, Shell Script, 환경 변수 기반 설정

---

## 5. 환경 변수 및 실행 방법

### 백엔드(.env)
- cafe-recommend/backend/.env  
  (예시: DB, JWT, CORS, 네이버페이 등)

### 프론트엔드(.env.local)
- cafe-recommend/frontend/.env.local  
  (예시: API URL, SITE URL 등)

#### 환경 변수 자동 생성 예시
```bash
cd cafeProj/cafe-recommend/backend
cat > .env << 'EOL'
# ... (환경 변수 내용)
EOL

cd ../frontend
cat > .env.local << 'EOL'
# ... (환경 변수 내용)
EOL
```

### 실행
```bash
# 백엔드
cd cafeProj/cafe-recommend/backend
# 가상환경/의존성 설치 후
uvicorn app.main:app --reload

# 프론트엔드
cd cafeProj/cafe-recommend/frontend
npm install
npm run dev
```

---

## 6. 기여/문의

- Pull Request, Issue 환영
- 문의: 프로젝트 관리자 또는 README 상단 연락처

---

### (참고)
- 상세한 API 문서, 관리자 기능, AI 챗봇 연동 등은 각 디렉토리의 문서 및 코드 참고
- 실서비스 배포 시 Docker, CI/CD, 보안 설정 등 추가 필요
