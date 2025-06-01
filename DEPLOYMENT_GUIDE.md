# Railway 배포 가이드 (Dockerfile 방식)

## 1. Railway 준비사항

### 1.1 Railway 계정 및 프로젝트 생성
1. [Railway](https://railway.app) 계정 생성
2. GitHub 계정 연동
3. 새 프로젝트 생성하여 이 저장소 연결

### 1.2 필수 환경 변수 설정
Railway 대시보드에서 다음 환경 변수들을 설정하세요:

```bash
# 서버 설정 (Railway에서 PORT는 자동 할당됨)
ENVIRONMENT=production
HOST=0.0.0.0

# JWT 보안 설정 (필수)
SECRET_KEY=cc0b57a5b7a4f9f1a6e9d8c7e5a0a3b8a2f0c7d8e1a9b6c5d4e3f2a1b0c9d8e7

# 데이터베이스 설정
DATABASE_URL=sqlite:///./cafe_app.db

# CORS 설정 (Railway URL로 변경 필요)
BACKEND_CORS_ORIGINS=["https://your-app-name.up.railway.app"]

# 프론트엔드 URL (Railway URL로 변경 필요)
NEXT_PUBLIC_FRONTEND_URL=https://your-app-name.up.railway.app

# 관리자 계정
FIRST_SUPERUSER=admin@test.com
FIRST_SUPERUSER_PASSWORD=admin1234

# OpenAI API (실제 키로 교체 필요)
OPENAI_API_KEY=your-openai-api-key-here-replace-with-real-key
OPENAI_MODEL=gpt-4-turbo-preview

# 카카오페이 설정
KAKAO_SECRET_KEY_DEV=DEV880C0DBCE207B93C70140634D8226E62DFBD5
KAKAO_PAY_API_URL=https://open-api.kakaopay.com
KAKAO_CID=TC0ONETIME

# 네이버페이 설정
NAVER_PAY_API_URL=https://dev-pub.apis.naver.com
NAVER_PAY_PARTNER_ID=np_pbyrr410908
NAVER_PAY_CLIENT_ID=HN3GGCMDdTgGUfl0kFCo
NAVER_PAY_CLIENT_SECRET=ftZjkkRNMR
NAVER_PAY_CHAIN_ID=c1l0UTFCMlNwNjY
```

## 2. 배포 순서

### 2.1 GitHub에 푸시 (이미 완료됨)
```bash
git add .
git commit -m "Add Dockerfile-based Railway deployment"
git push origin deployment-setup
```

### 2.2 Railway에서 배포
1. Railway 대시보드에서 프로젝트 선택
2. **Settings → Connect Repo** → GitHub 저장소 연결
3. **Branch 설정**: `deployment-setup` 브랜치 선택
4. **Build 방식**: Docker (자동 감지됨)
5. **Environment Variables** → 위의 환경 변수들 입력
6. **Deploy** 버튼 클릭

### 2.3 배포 후 URL 업데이트
배포 완료 후 Railway에서 생성된 URL을 확인하고 다음 환경 변수들을 업데이트:
```bash
BACKEND_CORS_ORIGINS=["https://실제생성된-URL.up.railway.app"]
NEXT_PUBLIC_FRONTEND_URL=https://실제생성된-URL.up.railway.app
```

### 2.4 배포 후 확인사항
- [ ] 백엔드 API 응답 확인: `https://your-app.up.railway.app/health`
- [ ] 프론트엔드 로딩 확인: `https://your-app.up.railway.app`
- [ ] 관리자 로그인 테스트: `admin@test.com` / `admin1234`
- [ ] AI 추천 기능 테스트

## 3. 문제 해결

### 3.1 Nixpacks 빌드 실패 해결
이제 **Dockerfile**을 사용하므로 Nixpacks 문제가 해결됩니다:
- Docker 기반 빌드는 더 안정적이고 예측 가능합니다
- 모든 의존성이 명시적으로 관리됩니다

### 3.2 자주 발생하는 문제들
1. **빌드 실패**: Dockerfile 문법 확인
2. **CORS 오류**: BACKEND_CORS_ORIGINS에 정확한 URL 설정
3. **API 연결 실패**: Railway 생성 URL 확인
4. **포트 문제**: Railway가 PORT 환경 변수를 자동 설정

### 3.3 Railway 로그 확인
Railway 대시보드 → 프로젝트 → Deployments → 로그 확인

## 4. 로컬 Docker 테스트

배포 전 로컬에서 Docker 테스트:
```bash
# 1. Docker 이미지 빌드
docker build -t cafe-app .

# 2. 컨테이너 실행 (환경 변수 파일 필요)
docker run -p 8000:8000 --env-file .env cafe-app

# 3. 브라우저에서 확인
# http://localhost:8000/health
``` 