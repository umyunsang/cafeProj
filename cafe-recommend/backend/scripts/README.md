# 🍽️ 카페 추천 시스템 - 백엔드 스크립트 모음

이 폴더에는 카페 추천 시스템의 데이터베이스 관리, 메뉴 이미지 생성, 관리자 계정 관리 등을 위한 다양한 스크립트들이 포함되어 있습니다.

## 📁 스크립트 분류

### 🗄️ **데이터베이스 관리**

#### `create_database.py` ⭐ **핵심**
- **목적**: 전체 데이터베이스 스키마 생성 및 초기 데이터 설정
- **기능**: 
  - 16개 테이블 생성 (users, menus, carts, orders, reviews 등)
  - 샘플 메뉴 데이터 추가 (28개 메뉴)
  - 관리자 계정 생성
- **사용법**: 
  ```bash
  python scripts/create_database.py
  ```
- **주의사항**: 기존 데이터베이스를 완전히 재생성합니다

#### `check_db_schema.py`
- **목적**: 데이터베이스 스키마 및 데이터 확인
- **기능**:
  - 모든 테이블 구조 출력
  - 각 테이블의 데이터 개수 표시
  - 데이터베이스 상태 진단
- **사용법**:
  ```bash
  python scripts/check_db_schema.py
  ```

#### `create_tables.py`
- **목적**: 테이블만 생성 (데이터 없이)
- **기능**: 기본 테이블 구조만 생성
- **사용법**:
  ```bash
  python scripts/create_tables.py
  ```

#### `init_db.py`
- **목적**: 간단한 DB 초기화
- **기능**: 기본적인 데이터베이스 설정
- **사용법**:
  ```bash
  python scripts/init_db.py
  ```

---

### 🎨 **이미지 생성 및 관리**

#### `generate_all_menu_images.py` ⭐ **핵심**
- **목적**: DALL-E API를 사용한 모든 메뉴 이미지 생성
- **기능**:
  - 시그니처 메뉴: 환상적이고 창의적인 이미지
  - 일반 메뉴: 전문적이고 깔끔한 이미지
  - 백엔드/프론트엔드 모두에 저장
  - 데이터베이스 URL 자동 업데이트
- **사용법**:
  ```bash
  python scripts/generate_all_menu_images.py
  ```
- **요구사항**: OpenAI API 키 필요

#### `generate_menu_images.py`
- **목적**: 기본 메뉴 이미지 생성 (구버전)
- **기능**: 단순한 이미지 생성 로직
- **사용법**:
  ```bash
  python scripts/generate_menu_images.py
  ```

#### `update_menu_images_with_ai.py`
- **목적**: 기존 메뉴 이미지 업데이트
- **기능**: AI 생성 이미지로 교체
- **사용법**:
  ```bash
  python scripts/update_menu_images_with_ai.py
  ```

#### `check_menu_images.py`
- **목적**: 메뉴 이미지 상태 확인
- **기능**: 이미지 파일 존재 여부 검사
- **사용법**:
  ```bash
  python scripts/check_menu_images.py
  ```

#### `test_image_urls.py`
- **목적**: 이미지 URL 유효성 테스트
- **기능**: 외부 이미지 링크 상태 확인
- **사용법**:
  ```bash
  python scripts/test_image_urls.py
  ```

---

### 👥 **관리자 계정 관리**

#### `create_admin_account.py` ⭐ **중요**
- **목적**: 새로운 관리자 계정 생성
- **기능**:
  - 안전한 비밀번호 해싱
  - 이메일 중복 확인
  - 관리자 권한 설정
- **사용법**:
  ```bash
  python scripts/create_admin_account.py
  ```
- **입력 요구**: 이메일, 이름, 비밀번호

#### `get_admin_accounts.py`
- **목적**: 기존 관리자 계정 조회
- **기능**:
  - 모든 관리자 계정 목록 출력
  - 계정 상태 확인
- **사용법**:
  ```bash
  python scripts/get_admin_accounts.py
  ```

#### `create_admin.py`
- **목적**: 관리자 생성 (구버전)
- **기능**: 기본적인 관리자 계정 생성
- **사용법**:
  ```bash
  python scripts/create_admin.py
  ```

#### `check_admin_user.py`
- **목적**: 관리자 계정 상태 확인
- **기능**: 특정 관리자 정보 조회
- **사용법**:
  ```bash
  python scripts/check_admin_user.py
  ```

---

### ⚙️ **시스템 설정**

#### `init_payment_config.py`
- **목적**: 결제 시스템 초기 설정
- **기능**: 
  - 카카오페이 설정
  - 네이버페이 설정
  - 결제 환경 구성
- **사용법**:
  ```bash
  python scripts/init_payment_config.py
  ```

---

## 🚀 **빠른 시작 가이드**

### 1️⃣ **새로운 프로젝트 설정**
```bash
# 1. 데이터베이스 생성 및 초기화
python scripts/create_database.py

# 2. 관리자 계정 생성
python scripts/create_admin_account.py

# 3. 메뉴 이미지 생성 (선택사항)
python scripts/generate_all_menu_images.py
```

### 2️⃣ **데이터베이스 상태 확인**
```bash
# 스키마 및 데이터 확인
python scripts/check_db_schema.py

# 관리자 계정 확인
python scripts/get_admin_accounts.py

# 이미지 상태 확인
python scripts/check_menu_images.py
```

### 3️⃣ **이미지 관리**
```bash
# 모든 메뉴 이미지 생성 (DALL-E)
python scripts/generate_all_menu_images.py

# 이미지 URL 테스트
python scripts/test_image_urls.py
```

---

## 📊 **스크립트 우선순위**

### ⭐ **핵심 (반드시 사용)**
1. `create_database.py` - DB 초기화
2. `create_admin_account.py` - 관리자 생성
3. `generate_all_menu_images.py` - 이미지 생성

### 🔧 **유용함 (권장)**
4. `check_db_schema.py` - 상태 확인
5. `get_admin_accounts.py` - 계정 조회
6. `check_menu_images.py` - 이미지 확인

### 📝 **선택사항 (필요시)**
7. `init_payment_config.py` - 결제 설정
8. `test_image_urls.py` - URL 테스트
9. 기타 보조 스크립트들

---

## ⚠️ **주의사항**

### 🔑 **API 키 요구사항**
- `generate_all_menu_images.py`: OpenAI API 키 필요
- 코드 내 API 키는 보안을 위해 제거 후 사용

### 💾 **데이터베이스**
- `create_database.py` 실행 시 기존 데이터 완전 삭제
- 백업 후 실행 권장

### 📁 **파일 경로**
- 모든 스크립트는 `/backend` 디렉토리에서 실행
- 상대 경로 기준으로 설계됨

---

## 🔄 **실행 순서 예시**

```bash
# 프로젝트 폴더로 이동
cd /path/to/cafeProj/cafe-recommend/backend

# 1. 데이터베이스 초기화
python scripts/create_database.py

# 2. 상태 확인
python scripts/check_db_schema.py

# 3. 관리자 생성 (이미 있다면 건너뛰기)
python scripts/create_admin_account.py

# 4. 관리자 확인
python scripts/get_admin_accounts.py

# 5. 이미지 생성 (시간 소요: 약 1-2시간)
python scripts/generate_all_menu_images.py

# 6. 최종 확인
python scripts/check_menu_images.py
```

---

## 📞 **문제 해결**

### 🐛 **일반적인 문제들**

1. **데이터베이스 잠김 오류**
   - 다른 프로세스가 DB 사용 중
   - 잠시 대기 후 재시도

2. **API 키 오류**
   - OpenAI API 키 확인
   - 코드 내 키 설정 확인

3. **이미지 생성 실패**
   - 네트워크 연결 확인
   - API 할당량 확인

4. **권한 오류**
   - 파일/폴더 권한 확인
   - 관리자 권한으로 실행

---

## 📈 **성능 최적화**

- **이미지 생성**: 백그라운드 실행 권장
- **대용량 작업**: 충분한 디스크 공간 확보
- **API 제한**: 5초 간격으로 요청 제한됨

---

*최종 업데이트: 2025-06-02*  
*카페 추천 시스템 v1.0* 