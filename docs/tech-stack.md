# 카페 추천 시스템 기술 스택

## 백엔드 기술 스택

### 1. Python
- **버전**: 3.11
- **사용 위치**: 
  - `cafe-recommend/backend/app/main.py`: FastAPI 애플리케이션 진입점
  - `cafe-recommend/backend/app/api/`: API 엔드포인트 정의
  - `cafe-recommend/backend/app/core/`: 핵심 설정 및 유틸리티
  - `cafe-recommend/backend/app/db/`: 데이터베이스 관련 코드
  - `cafe-recommend/backend/app/models/`: 데이터 모델 정의
  - `cafe-recommend/backend/app/services/`: 비즈니스 로직
- **사용 이유**: 
  - AI/ML 라이브러리들의 우수한 지원
  - 간결하고 읽기 쉬운 문법
  - 풍부한 패키지 생태계
  - 데이터 처리와 API 개발에 적합한 언어

### 2. FastAPI
- **버전**: 0.109.0
- **사용 위치**:
  - `cafe-recommend/backend/app/main.py`: FastAPI 앱 설정
  - `cafe-recommend/backend/app/api/`: API 라우터 정의
  - `cafe-recommend/backend/app/core/config.py`: FastAPI 설정
- **사용 이유**:
  - 비동기 처리 지원으로 높은 성능
  - 자동 API 문서 생성 (Swagger/OpenAPI)
  - 타입 힌팅을 통한 강력한 타입 체크
  - 현대적이고 빠른 웹 프레임워크
  - Pydantic을 통한 데이터 검증

### 3. SQLAlchemy
- **버전**: 2.0.25
- **사용 위치**:
  - `cafe-recommend/backend/app/db/base.py`: 데이터베이스 설정
  - `cafe-recommend/backend/app/models/`: SQLAlchemy 모델 정의
  - `cafe-recommend/backend/app/db/session.py`: 데이터베이스 세션 관리
- **사용 이유**:
  - Python의 대표적인 ORM
  - 데이터베이스 스키마 관리 용이
  - 타입 안전성 보장
  - 복잡한 쿼리 작성 지원

### 4. SQLite
- **버전**: 3.x
- **사용 위치**: 
  - `cafe-recommend/backend/.env.local`: `DATABASE_URL=sqlite:///./cafe.db`
  - `cafe-recommend/backend/alembic.ini`: `sqlalchemy.url = sqlite:///./cafe_recommend.db`
- **선택 이유**:
  - 개발 환경에서 간단한 설정으로 사용 가능
  - 파일 기반 데이터베이스로 별도의 서버 설정 불필요
  - SQLAlchemy와 완벽한 호환성
  - 트랜잭션 지원 및 ACID 준수
  - 가벼운 리소스 사용으로 개발 환경에 적합

### 5. LangChain
- **버전**: 0.1.0
- **사용 위치**:
  - `cafe-recommend/backend/app/services/chat_service.py`: AI 채팅 서비스
  - `cafe-recommend/backend/app/services/recommendation_service.py`: 메뉴 추천 서비스
- **사용 이유**:
  - LLM 기반 애플리케이션 개발 프레임워크
  - 체이닝과 프롬프트 관리 용이
  - 다양한 LLM 모델 통합
  - 메모리 관리와 컨텍스트 처리

### 6. OpenAI API
- **사용 위치**:
  - `cafe-recommend/backend/app/services/chat_service.py`: GPT 모델 사용
  - `cafe-recommend/backend/app/services/recommendation_service.py`: 메뉴 추천 로직
- **사용 이유**:
  - 최신 GPT 모델 사용 가능
  - 안정적인 API 서비스
  - 높은 성능의 자연어 처리
  - 다양한 모델 옵션 제공

## 프론트엔드 기술 스택

### 1. Next.js
- **버전**: 14.1.0
- **사용 위치**:
  - `cafe-recommend/frontend/src/app/`: 페이지 및 라우팅
  - `cafe-recommend/frontend/src/components/`: 재사용 가능한 컴포넌트
  - `cafe-recommend/frontend/src/lib/`: 유틸리티 함수
- **사용 이유**:
  - React 기반의 풀스택 프레임워크
  - 서버 사이드 렌더링(SSR) 지원
  - 파일 기반 라우팅
  - 자동 코드 분할
  - 최적화된 이미지 처리

### 2. TypeScript
- **버전**: 5.3.3
- **사용 위치**:
  - `cafe-recommend/frontend/src/`: 모든 TypeScript 소스 파일
  - `cafe-recommend/frontend/src/types/`: 타입 정의
- **사용 이유**:
  - 정적 타입 체크
  - 향상된 개발자 경험
  - 코드 안정성 향상
  - 더 나은 IDE 지원
  - 유지보수성 향상

### 3. Tailwind CSS
- **버전**: 3.4.1
- **사용 위치**:
  - `cafe-recommend/frontend/src/app/globals.css`: 전역 스타일
  - `cafe-recommend/frontend/src/components/`: 컴포넌트 스타일링
  - `cafe-recommend/frontend/tailwind.config.js`: Tailwind 설정
- **사용 이유**:
  - 유틸리티 우선 CSS 프레임워크
  - 빠른 UI 개발
  - 일관된 디자인 시스템
  - 커스터마이징 용이
  - 번들 크기 최적화

### 4. Shadcn/ui
- **사용 위치**:
  - `cafe-recommend/frontend/src/components/ui/`: UI 컴포넌트
  - `cafe-recommend/frontend/src/components/menu/`: 메뉴 관련 컴포넌트
- **사용 이유**:
  - 재사용 가능한 UI 컴포넌트
  - 접근성(a11y) 지원
  - 커스터마이징 가능한 디자인
  - Tailwind CSS와 통합
  - 현대적인 디자인 시스템

## 개발 도구 및 환경

### 1. Git
- **사용 위치**:
  - `cafe-recommend/.gitignore`: Git 제외 파일 설정
  - `docs/`: 프로젝트 문서
- **사용 이유**:
  - 버전 관리
  - 협업 지원
  - 코드 히스토리 관리
  - 브랜치 전략
  - 코드 리뷰

## 보안

### 1. CORS (Cross-Origin Resource Sharing)
- **사용 위치**:
  - `cafe-recommend/backend/app/main.py`: CORS 미들웨어 설정
- **사용 이유**:
  - 안전한 크로스 도메인 요청
  - API 접근 제어
  - 보안 정책 적용
  - 리소스 공유 제한
  - 브라우저 보안

## 배포 환경

### 1. Linux 서버
- **사용 위치**:
  - 프로덕션 서버 환경
  - `cafe-recommend/backend/`: 백엔드 서비스 배포
  - `cafe-recommend/frontend/`: 프론트엔드 서비스 배포
- **사용 이유**:
  - 안정적인 서버 운영 환경
  - 높은 성능과 보안성
  - 다양한 서버 관리 도구 지원
  - 확장성과 유연성
  - 오픈소스 생태계 활용

### 2. Docker
- **사용 위치**:
  - `cafe-recommend/backend/Dockerfile`: 백엔드 컨테이너화
  - `cafe-recommend/frontend/Dockerfile`: 프론트엔드 컨테이너화
  - `cafe-recommend/docker-compose.yml`: 서비스 오케스트레이션
- **사용 이유**:
  - 일관된 배포 환경
  - 서비스 격리
  - 쉬운 스케일링
  - 버전 관리 용이
  - 리소스 효율적 사용 