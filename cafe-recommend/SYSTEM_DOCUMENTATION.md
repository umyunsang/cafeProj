# 카페 추천 시스템 구조 문서

## 1. 시스템 개요

이 시스템은 카페 메뉴 추천, 주문 및 결제 기능을 제공하는 웹 애플리케이션입니다. AI를 활용한 메뉴 추천 기능이 포함되어 있으며, 프론트엔드와 백엔드로 구성되어 있습니다.

## 2. 시스템 구조

### 2.1 디렉토리 구조

```
cafe-recommend/
├── backend/              # 백엔드 서버 코드
│   ├── app/              # FastAPI 애플리케이션
│   │   ├── api/          # API 엔드포인트
│   │   │   └── admin/    # 관리자 관련 API
│   │   ├── core/         # 핵심 설정 및 유틸리티
│   │   ├── crud/         # 데이터베이스 CRUD 로직
│   │   ├── db/           # 데이터베이스 연결 및 모델
│   │   ├── models/       # SQLAlchemy 모델
│   │   ├── routers/      # API 라우터
│   │   ├── schemas/      # Pydantic 스키마
│   │   └── main.py       # 애플리케이션 진입점
│   ├── venv/             # Python 가상환경
│   └── scripts/          # 유틸리티 스크립트
├── frontend/             # 프론트엔드 코드 (Next.js)
│   ├── public/           # 정적 파일
│   ├── src/              # 소스 코드
│   │   ├── app/          # Next.js 페이지 및 라우트
│   │   ├── components/   # 재사용 가능한 컴포넌트
│   │   ├── contexts/     # React Context API
│   │   ├── lib/          # 유틸리티 함수
│   │   ├── config/       # 설정 파일
│   │   └── types/        # TypeScript 타입 정의
│   └── node_modules/     # Node.js 패키지
└── scripts/              # 시스템 관리 스크립트
```

### 2.2 기술 스택

- **프론트엔드**: Next.js, React, TypeScript, Tailwind CSS
- **백엔드**: FastAPI, SQLAlchemy, Pydantic
- **데이터베이스**: SQLite
- **배포**: 직접 호스팅 (포트 15030, 15049)
- **결제 통합**: 네이버페이, 카카오페이

## 3. 주요 기능

### 3.1 사용자 기능

- **메뉴 조회**: 카페에서 제공하는 메뉴 목록을 조회할 수 있습니다.
- **메뉴 추천**: AI를 활용하여 사용자 선호도에 맞는 메뉴를 추천받을 수 있습니다.
- **장바구니**: 메뉴를 장바구니에 추가하고 관리할 수 있습니다.
- **주문 및 결제**: 선택한 메뉴를 주문하고 결제를 진행할 수 있습니다.
- **채팅**: AI 어시스턴트와 채팅을 통해 메뉴 추천을 받을 수 있습니다.

### 3.2 관리자 기능

- **대시보드**: 매출 및 주문 현황을 확인할 수 있습니다.
- **메뉴 관리**: 메뉴 추가, 수정, 삭제 기능을 제공합니다.
- **주문 관리**: 접수된 주문을 확인하고 상태를 관리할 수 있습니다.
- **결제 관리**: 결제 내역을 확인하고 관리할 수 있습니다.

## 4. URL 구조

### 4.1 프론트엔드 URL (http://116.124.191.174:15030)

| 경로 | 설명 |
|------|------|
| `/` | 메인 페이지 |
| `/menu` | 메뉴 목록 페이지 |
| `/cart` | 장바구니 페이지 |
| `/checkout` | 결제 페이지 |
| `/chat` | AI 채팅 페이지 |
| `/recommend` | 메뉴 추천 페이지 |
| `/admin` | 관리자 대시보드 |
| `/admin/orders` | 주문 관리 페이지 |
| `/admin/menu` | 메뉴 관리 페이지 |
| `/payments/naver/callback` | 네이버페이 결제 콜백 페이지 |
| `/payments/kakao/callback` | 카카오페이 결제 콜백 페이지 |

### 4.2 백엔드 API URL (http://116.124.191.174:15049)

| 경로 | 메소드 | 설명 |
|------|--------|------|
| `/api/menus` | GET | 메뉴 목록 조회 |
| `/api/cart` | GET, POST, DELETE | 장바구니 조회, 생성, 비우기 |
| `/api/cart/items` | POST | 장바구니에 항목 추가 |
| `/api/cart/items/{item_id}` | PUT, DELETE | 장바구니 항목 수정, 삭제 |
| `/api/order` | POST | 주문 생성 |
| `/api/payment/naver/prepare` | POST | 네이버페이 결제 준비 |
| `/api/payment/naver/callback` | GET | 네이버페이 결제 완료 콜백 |
| `/api/payment/kakao` | POST | 카카오페이 결제 준비 |
| `/api/payment/kakao/success` | GET | 카카오페이 결제 성공 콜백 |
| `/api/payment/kakao/cancel` | GET | 카카오페이 결제 취소 콜백 |
| `/api/payment/kakao/fail` | GET | 카카오페이 결제 실패 콜백 |
| `/api/admin/auth/login` | POST | 관리자 로그인 |
| `/api/admin/dashboard` | GET | 관리자 대시보드 데이터 |
| `/api/admin/menu` | GET, POST | 메뉴 조회, 추가 |
| `/api/admin/menu/{menu_id}` | PUT, DELETE | 메뉴 수정, 삭제 |
| `/api/admin/orders` | GET | 주문 목록 조회 |
| `/api/admin/orders/{order_id}` | PUT | 주문 상태 업데이트 |
| `/health` | GET | 서버 상태 확인 |

## 5. 데이터 모델

### 5.1 주요 데이터 모델

- **Menu**: 메뉴 정보 (이름, 설명, 가격, 카테고리 등)
- **Cart**: 장바구니 정보 (세션 ID, 총 금액)
- **CartItem**: 장바구니 항목 (메뉴 ID, 수량, 특별 요청)
- **Order**: 주문 정보 (사용자 ID, 총 금액, 상태, 결제 방법 등)
- **User**: 사용자 정보 (관리자용)

## 6. 배포 정보

- **프론트엔드 서버**: http://116.124.191.174:15030
- **백엔드 서버**: http://116.124.191.174:15049
- **데이터베이스**: SQLite (파일 기반)

## 7. 시작 방법

### 7.1 백엔드 서버 시작

```bash
cd /home/student_15030/cafeProj
./cafe-recommend/scripts/start-backend.sh
```

### 7.2 프론트엔드 서버 시작

```bash
cd /home/student_15030/cafeProj
./cafe-recommend/scripts/start-frontend.sh
```

## 8. 문제 해결

- 포트 충돌 발생 시 `start-backend.sh` 및 `start-frontend.sh` 스크립트는 자동으로 기존 프로세스를 종료하고 서버를 재시작합니다.
- 데이터베이스 문제 발생 시 `check-db.sh` 스크립트를 실행하여 데이터베이스 스키마를 확인하고 필요한 테이블을 생성할 수 있습니다. 