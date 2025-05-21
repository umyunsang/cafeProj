# Admin 페이지 리팩토링 체크리스트

이 문서는 카페 추천 시스템의 Admin 관련 페이지 및 컴포넌트에 대한 리팩토링 작업을 추적하고 관리하기 위해 작성되었습니다.

## 공통 영역 (Admin 전반)

- [x] **UI 일관성 확보** (1차 완료 - notifications, inventory 페이지 중심):
    - [x] 버튼, 폼 요소, 테이블, 카드 등 공통 UI 컴포넌트 디자인 및 사용법 통일 (notifications 페이지 1차 진행)
    - [x] 색상 스킴, 타이포그래피, 아이콘 사용 등 전반적인 디자인 가이드라인 준수 (inventory/page.tsx Badge 개선)
    - [x] 라이트/다크 모드 스타일 일관성 있게 적용 및 누락된 부분 보완 (notifications/page.tsx 아이콘 색상 개선)
- [x] **코드 스타일 및 컨벤션** (주요 페이지 1차 검토 완료):
    - [x] 프로젝트 전반의 코딩 스타일 가이드 준수 (ESLint, Prettier 설정 기반) (주요 페이지 1차 검토 완료)
    - [x] 컴포넌트, 함수, 변수 등의 네이밍 컨벤션 통일 (주요 페이지 1차 검토 완료)
- [x] **상태 관리** (inventory 로컬 상태 개선, AuthContext 도입):
    - [x] 복잡한 로컬 상태 관리 시 `useReducer` 또는 컨텍스트 API 활용 고려 (과도한 `useState` 지양) (inventory/page.tsx useMemo 적용)
    - [x] 전역 상태 또는 여러 컴포넌트에서 공유되는 상태에 대한 명확한 관리 전략 수립 (Context API, Zustand, Recoil 등 고려) (AuthContext 생성 및 적용)
- [x] **API 연동**:
    - [x] `useApiGet`, `useApiPost` 등 커스텀 훅 사용 일관성 유지 (notifications 페이지에 useApiClient 적용)
    - [x] API 요청 시 로딩 상태, 에러 처리 로직 표준화 및 사용자 피드백 명확화 (notifications 페이지에 useApiClient 적용)
    - [x] 데이터 유효성 검사 (클라이언트/서버) 강화 (클라이언트 측 1차 검토 - inventory edit 페이지)
- [x] **공통 컴포넌트** (SummaryCard 추출 및 적용):
    - [x] Admin 페이지에서 반복적으로 사용되는 UI/로직은 재사용 가능한 공통 컴포넌트로 추출 (SummaryCard 공통 컴포넌트 생성 및 inventory 페이지 적용)
    - [x] 예: 데이터 테이블, 통계 카드, 입력 폼 래퍼, 모달 등 (SummaryCard 공통 컴포넌트 생성 및 inventory 페이지 적용)
- [x] **접근성 (Accessibility)** (notifications, inventory 페이지 1차 검토 및 개선):
    - [x] 키보드 네비게이션, 스크린 리더 지원 등 기본적인 웹 접근성 준수 (notifications, inventory 페이지 1차 검토 및 개선)
    - [x] `aria-*` 속성 적절히 사용 (notifications, inventory 페이지 1차 검토 및 개선)

## Admin 레이아웃 (`cafe-recommend/frontend/src/app/admin/layout.tsx`)

- [x] 현재 `AdminLayout` 컴포넌트 (`layout.tsx`) 구조 검토 (인증 로직 및 레이아웃 위임 방식 확인)
- [x] 사이드바 네비게이션 도입 여부 결정 (AdminSidebar 기본 구조 추가)
    - [x] 사이드바 도입 시, 반응형 디자인 고려 (모바일 하단 탭 바, 데스크탑 사이드바 형태로 구현)
- [x] 페이지 타이틀 동적 관리 방안 검토 (각 페이지별로 적절한 제목 표시)
- [x] 공통 로딩 인디케이터 또는 스켈레톤 UI 적용 고려 (`loading.tsx` 추가)

## 로그인 페이지 (`cafe-recommend/frontend/src/app/admin/page.tsx`)

- [x] UI/UX 개선 (metadata 추가, 개발정보 조건부 렌더링, 기존 UI 준수)
- [x] 입력 폼 유효성 검사 로직 검토 및 강화 (이메일 형식, 비밀번호 최소 길이 클라이언트 검사 추가)
- [x] 인증 에러 메시지 명확화 (네트워크 오류, API 응답 오류 메시지 개선)
- [ ] 보안 관련 잠재적 취약점 검토 (CSRF, XSS 등 - 현재 CSP 설정은 되어 있음) (사용자 요청으로 건너뜀)

## 대시보드 (`cafe-recommend/frontend/src/app/admin/dashboard/`)

- [x] **`page.tsx` 및 관련 컴포넌트** (세부 항목 모두 완료):
    - [x] 표시되는 통계 데이터의 종류 및 시각화 방법 적절성 검토 (현재 상태 양호)
    - [x] 차트 라이브러리 사용 시 최적화 및 일관성 유지 (Recharts 일관 사용, 예시로 PopularItemsChart 컴포넌트화 및 React.memo 적용. 추가 최적화는 필요시 진행)
    - [x] 데이터 로딩 및 필터링 기능 구현 검토 (주문분석 로딩/데이터없음 UI 개선, 필터 UI 명시)
    - [x] UI 컴포넌트 (카드, 그래프 등) 재사용성 및 가독성 개선

## 메뉴 관리 (`cafe-recommend/frontend/src/app/admin/menus/`)

- [x] **`page.tsx` (메뉴 목록)** (검색 기능 강화 등 완료):
    - [x] 메뉴 데이터 표시 테이블 UI/UX 개선 (정렬, 필터링, 페이지네이션 기능)
    - [x] 메뉴 검색 기능 강화 (UI, 디바운싱, 검색 대상 확장)
- [x] **`[id]/page.tsx` (메뉴 상세/수정)** 또는 **`add/page.tsx` (메뉴 추가)**:
    - [x] 메뉴 입력 폼 UI/UX 개선 및 유효성 검사 강화 (MenuForm 완료)
    - [x] 이미지 업로드 및 미리보기 기능 안정성 및 사용성 검토 (MenuForm 완료)
    - [x] 카테고리 관련 데이터 관리 UI 개선 (클라이언트 측 관리 기능 추가). 옵션 관리는 추후 진행 예정.
- [x] **관련 컴포넌트**:
    - [x] `MenuForm`, `MenuTable` 등 컴포넌트 분리 및 재사용성 증대

## 주문 관리 (`cafe-recommend/frontend/src/app/admin/orders/`)

- [x] **`page.tsx` (주문 목록)**:
    - [x] 주문 데이터 표시 테이블 UI/UX 개선 (정렬, 상태별 필터링, 검색, 페이지네이션)
    - [x] 실시간 주문 업데이트 반영 여부 (현재 `realtime` 라우터 존재)
- [x] **`[id]/page.tsx` (주문 상세)**:
    - [x] 주문 상세 정보(고객 정보, 주문 항목, 결제 내역 등) 표시 방식 개선 (UI 그룹화 및 가독성 향상)
    - [x] 주문 상태 변경, 환불 처리 등 관리 기능 UI/UX 개선 (상태 변경 기능 완료, 전체 환불 처리 UI 및 기본 로직 구현)
- [x] **관련 컴포넌트**:
    - [x] OrderTable 컴포넌트 분리 완료
    - [x] OrderDetailView 등 컴포넌트 모듈화 (OrderSummaryCard, OrderItemsTable, OrderStatusActions 컴포넌트 분리 적용)

## 재고 관리 (`cafe-recommend/frontend/src/app/admin/inventory/`)

- [x] **`page.tsx` 및 관련 컴포넌트**:
    - [x] 재고 항목 목록 UI (테이블 형식) 개선
    - [x] 재고 수량 변경, 입출고 기록 등 기능 UI/UX 검토 - *재고 기본 정보 및 수량 변경 기능 구현 (수정 페이지). 입출고 기록 UI/UX는 추후 검토*
    - [x] 부족 재고 알림 기능 연동

## 알림 관리 (`cafe-recommend/frontend/src/app/admin/notifications/`)

- **`page.tsx` 및 관련 컴포넌트**:
    - [x] 알림 목록 표시 UI 개선 (읽음/안읽음 구분 강화, 타임스탬프 포맷 개선, 메시지 확장, 링크/중요도 표시 개선)
    - [x] 알림 필터링 및 검색 기능 (읽음 상태 필터, 제목/내용 검색 및 디바운싱 적용)
    - [x] 알림 설정 기능 (어떤 종류의 알림을 받을지 등) (UI 및 기본 API 연동 골격 구현)

## 설정 (`cafe-recommend/frontend/src/app/admin/settings/`)

- [x] **`page.tsx` 및 관련 컴포넌트**:
    - [x] 매장 정보, 운영 시간 UI 개선 (컴포넌트 분리 및 기본 연동 완료). 결제 설정 등 기타 항목은 추후 필요시 진행.
    - [x] 각 설정 항목별 유효성 검사 및 저장 로직 검토
    - [x] 테마 변경 외 다른 사용자 인터페이스 설정 (예: 언어, 폰트 크기 등) 추가 고려

## 기타

- [x] **Admin 전용 유틸리티 함수 또는 훅**:
    - [x] Admin 기능 구현에 필요한 공통 로직 (예: 권한 체크, 데이터 포맷팅 등)들을 별도 유틸리티 또는 훅으로 분리
- [-] **테스트 코드**: (향후 고려 사항으로 남김)
    - [-] 주요 Admin 기능에 대한 단위 테스트 및 통합 테스트 코드 작성 고려 (현재 테스트 파일 일부 존재)

---

이 체크리스트는 초기 버전이며, 실제 리팩토링 진행 과정에서 각 항목을 더 세분화하거나 새로운 항목을 추가할 수 있습니다. 