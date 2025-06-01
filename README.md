# cafeProj

카페 메뉴 추천 및 주문 시스템

## 기술 스택
- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS
- **백엔드**: FastAPI + Python + SQLite
- **배포**: Railway

## 배포 방법

### Railway 배포
1. Railway 계정 생성 후 GitHub 연동
2. 이 저장소를 연결하여 자동 배포
3. 환경 변수 설정 필요

### 환경 변수
프로덕션 배포 시 다음 환경 변수를 설정하세요:
- `PORT`: 서버 포트 (Railway에서 자동 할당)
- `DATABASE_URL`: SQLite 데이터베이스 경로
- `JWT_SECRET_KEY`: JWT 토큰 시크릿 키
- `ALLOWED_ORIGINS`: CORS 허용 도메인

## 로컬 실행
```bash
# 백엔드 실행
cd cafe-recommend/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 15049

# 프론트엔드 실행
cd cafe-recommend/frontend
npm install
npm run dev
```
