# 카페 추천 시스템 - 주문 시스템 설계

## 1. 개요

주문 시스템은 카페 추천 시스템의 핵심 기능 중 하나로, 사용자의 장바구니 관리부터 결제까지의 전체 프로세스를 처리합니다. 이 문서는 주문 시스템 구현에 필요한 기술 스택과 설계도를 제공합니다.

## 2. 기술 스택

### 백엔드
- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM(Object-Relational Mapping) 라이브러리
- **Pydantic**: 데이터 검증 및 설정 관리
- **Redis**: 세션 관리 및 캐싱
- **Celery**: 비동기 작업 처리
- **네이버페이 API**: 네이버페이 결제 처리
- **카카오페이 API**: 카카오페이 결제 처리
- **Pytest**: 테스트 프레임워크

### 프론트엔드
- **Next.js**: React 기반 프레임워크
- **React**: UI 라이브러리
- **TypeScript**: 정적 타입 지원
- **Tailwind CSS**: 스타일링
- **ShadcnUI**: UI 컴포넌트 (New York 스타일)
- **React Query**: 서버 상태 관리
- **Zustand**: 클라이언트 상태 관리
- **React Hook Form**: 폼 관리
- **Zod**: 스키마 검증
- **Stripe Elements**: 결제 UI 컴포넌트
- **Framer Motion**: 애니메이션 효과
- **Lucide Icons**: 아이콘 라이브러리
- **Sonner**: 토스트 알림

### 데이터베이스
- **PostgreSQL**: 주문 및 결제 데이터 저장
- **Redis**: 세션 및 캐시 데이터 저장

## 3. 시스템 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  클라이언트      │────▶  API 서버        │────▶  데이터베이스    │
│  (Next.js)      │     │  (FastAPI)      │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  결제 UI        │     │  결제 처리      │     │  Redis 캐시     │
│  (네이버페이/    │     │  (네이버페이/    │     │                 │
│   카카오페이)    │     │   카카오페이)   │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 4. 데이터 모델

### Order (주문)
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount FLOAT DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, paid, completed, cancelled
    payment_method VARCHAR(50),
    items JSON NOT NULL,  -- [{"menu_id": 1, "quantity": 2, "price": 5000}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### OrderItem (주문 항목)
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    menu_id INTEGER REFERENCES menus(id),
    quantity INTEGER,
    unit_price FLOAT,
    total_price FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cart (장바구니)
```sql
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### CartItem (장바구니 항목)
```sql
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) NOT NULL,
    menu_id INTEGER REFERENCES menus(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### User (사용자)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(100),
    hashed_password VARCHAR(100),
    is_active BOOLEAN,
    is_admin BOOLEAN,
    sweetness FLOAT,
    sourness FLOAT,
    bitterness FLOAT,
    taste_preference TEXT,
    preferences JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Menu (메뉴)
```sql
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    price FLOAT,
    category VARCHAR(50),
    image_url VARCHAR(200),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## 5. API 엔드포인트

### 장바구니 관련
- `GET /api/cart`: 장바구니 조회
- `POST /api/cart/items`: 장바구니 항목 추가
- `PUT /api/cart/items/{item_id}`: 장바구니 항목 수정
- `DELETE /api/cart/items/{item_id}`: 장바구니 항목 삭제
- `DELETE /api/cart`: 장바구니 비우기

### 주문 관련
- `POST /api/orders`: 주문 생성
- `GET /api/orders`: 주문 목록 조회
- `GET /api/orders/{order_id}`: 주문 상세 조회
- `PUT /api/orders/{order_id}/status`: 주문 상태 변경
- `POST /api/orders/{order_id}/cancel`: 주문 취소

### 결제 관련
- `POST /api/payments/naver/create`: 네이버페이 결제 요청 생성
- `POST /api/payments/naver/complete`: 네이버페이 결제 완료 처리
- `POST /api/payments/kakao/create`: 카카오페이 결제 요청 생성
- `POST /api/payments/kakao/complete`: 카카오페이 결제 완료 처리
- `GET /api/payments/{payment_id}`: 결제 상태 조회
- `POST /api/payments/{payment_id}/refund`: 결제 환불

## 6. 주문 프로세스

1. **장바구니 관리**
   - 사용자가 메뉴를 장바구니에 추가
   - 수량 조절 및 특별 요청사항 입력
   - 장바구니 금액 실시간 계산

2. **주문 생성**
   - 장바구니 항목 검증
   - 총 금액 계산
   - 주문 정보 저장
   - 장바구니 비우기

3. **결제 처리**
   - 결제 수단 선택 (네이버페이/카카오페이)
   - 선택된 결제 수단에 따른 결제 요청 생성
   - 결제 처리 및 검증
   - 결제 상태 업데이트

4. **주문 완료**
   - 주문 상태 업데이트
   - 영수증 발급
   - 주문 확인 이메일 발송

## 7. 보안 고려사항

1. **결제 보안**
   - 네이버페이/카카오페이 보안 가이드라인 준수
   - 결제 정보 암호화
   - 결제 검증 프로세스
   - 결제 취소 및 환불 처리

2. **데이터 보안**
   - 개인정보 암호화
   - 세션 관리
   - CSRF 보호

3. **에러 처리**
   - 결제 실패 처리
   - 네트워크 오류 처리
   - 트랜잭션 롤백

## 8. 모니터링 및 로깅

1. **주문 모니터링**
   - 실시간 주문 상태 추적
   - 결제 상태 모니터링
   - 에러 로깅

2. **성능 모니터링**
   - API 응답 시간
   - 데이터베이스 쿼리 성능
   - 캐시 히트율

3. **비즈니스 메트릭**
   - 일별/주별/월별 매출
   - 인기 메뉴 분석
   - 결제 수단별 통계

## 9. 테스트 전략

1. **단위 테스트**
   - 주문 생성 로직
   - 결제 처리 로직
   - 금액 계산 로직

2. **통합 테스트**
   - API 엔드포인트
   - 데이터베이스 연동
   - 결제 시스템 연동

3. **E2E 테스트**
   - 전체 주문 프로세스
   - 결제 프로세스
   - 에러 시나리오

## 10. 배포 전략

1. **인프라 구성**
   - Docker 컨테이너화
   - Kubernetes 오케스트레이션
   - CI/CD 파이프라인

2. **데이터베이스 마이그레이션**
   - Alembic 마이그레이션
   - 데이터 백업
   - 롤백 계획

3. **모니터링 설정**
   - Prometheus 메트릭 수집
   - Grafana 대시보드
   - 알림 설정

### 프론트엔드 디자인 가이드라인

1. **레이아웃 구조**
   - 기존 `/home`, `/menu`, `/chat` 페이지와 동일한 레이아웃 구조 유지
   - 반응형 디자인 (모바일, 태블릿, 데스크톱)
   - 네비게이션 바에 장바구니 아이콘 통합

2. **디자인 시스템**
   - ShadcnUI의 New York 스타일 컴포넌트 활용
   - 기존 색상 팔레트 및 그라데이션 유지
   - 일관된 타이포그래피 시스템
   - Glassmorphism 효과 적용

3. **주문 페이지 구성**
   - 장바구니 페이지: `/cart`
   - 결제 페이지: `/checkout`
   - 주문 내역 페이지: `/orders`
   - 주문 상세 페이지: `/orders/[id]`

4. **컴포넌트 구조**
   - `CartItem`: 장바구니 항목 컴포넌트
   - `OrderSummary`: 주문 요약 컴포넌트
   - `PaymentMethodSelector`: 결제 수단 선택 컴포넌트
   - `NaverPayButton`: 네이버페이 결제 버튼
   - `KakaoPayButton`: 카카오페이 결제 버튼
   - `OrderHistory`: 주문 내역 컴포넌트
   - `OrderStatus`: 주문 상태 표시 컴포넌트

5. **상태 관리**
   - 장바구니 상태: Zustand 스토어
   - 주문 상태: React Query
   - 결제 상태: 로컬 상태 + React Query

6. **애니메이션 및 전환 효과**
   - Framer Motion을 활용한 페이지 전환 애니메이션
   - 장바구니 항목 추가/제거 애니메이션
   - 결제 프로세스 진행 상태 표시

7. **접근성 및 사용성**
   - 키보드 네비게이션 지원
   - 스크린 리더 호환성
   - 로딩 상태 및 에러 처리
   - 모바일 최적화 터치 인터페이스

8. **통합 요소**
   - 네비게이션 바에 장바구니 아이콘 추가
   - 메뉴 카드에 장바구니 추가 버튼 통합
   - AI 추천 메뉴에서 직접 장바구니 추가 기능 