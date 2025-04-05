# 장바구니 기능 상세 설계

## 1. 개요
장바구니 기능은 사용자가 주문하기 전에 선택한 카페 메뉴 항목들을 관리할 수 있는 기능입니다. 모달 형태의 UI를 통해 직관적인 사용자 경험을 제공하며, 세션 기반의 상태 관리를 통해 안전하고 효율적인 데이터 처리를 구현했습니다.

## 2. 데이터 모델

### 2.1 SQL 테이블 구조
```sql
CREATE TABLE carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
);
```

### 2.2 FastAPI 모델
```python
class CartItem(BaseModel):
    id: int
    menu: Menu
    quantity: int
    created_at: datetime
    updated_at: datetime

class Cart(BaseModel):
    id: int
    session_id: str
    items: List[CartItem]
    created_at: datetime
    updated_at: datetime
```

## 3. API 엔드포인트

### 3.1 장바구니 조회
- **GET** `/api/cart`
- 세션 ID를 기반으로 현재 장바구니 정보 조회
- 응답: 장바구니 항목 목록 (메뉴 정보 포함)

### 3.2 항목 추가
- **POST** `/api/cart/items`
- 장바구니에 새로운 메뉴 항목 추가
- 요청 본문: 메뉴 ID, 수량

### 3.3 수량 수정
- **PUT** `/api/cart/items/{item_id}`
- 장바구니 항목의 수량 수정
- 요청 본문: 새로운 수량

### 3.4 항목 삭제
- **DELETE** `/api/cart/items/{item_id}`
- 장바구니에서 특정 항목 삭제

## 4. 프론트엔드 구현

### 4.1 컴포넌트 구조
```
src/
  components/
    cart/
      CartContext.tsx    # 장바구니 상태 관리
      CartItem.tsx       # 개별 항목 컴포넌트
      CartModal.tsx      # 장바구니 모달 UI
      CartSummary.tsx    # 총액 및 주문 버튼
```

### 4.2 UI/UX 기능
- 모달 형태의 장바구니 인터페이스
- 메뉴 카드 클릭으로 간편한 추가
- 수량 조절 버튼 (+/-)
- 개별 항목 삭제 기능
- 총액 자동 계산
- 주문하기 버튼

### 4.3 상태 관리
- React Context API 활용
- 세션 기반 장바구니 상태 유지
- API 요청 상태 처리 (로딩/에러)
- 낙관적 UI 업데이트

## 5. 보안 기능
- 세션 기반 장바구니 관리
- httpOnly 쿠키 사용
- CSRF 토큰 검증
- SameSite 쿠키 설정
- API 요청 인증 처리

## 6. 추가 개선사항
- [ ] 주문 기능 연동
- [ ] 결제 시스템 통합
- [ ] 주문 내역 조회
- [ ] 주문 상태 추적

## 7. 테스트 현황
- ✅ CRUD 작업 테스트 완료
- ✅ 세션 관리 테스트 완료
- ✅ UI/UX 테스트 완료
- ✅ 반응형 디자인 테스트 완료
- [ ] 결제 프로세스 테스트 (진행 중)
- [ ] 주문 처리 테스트 (진행 중) 