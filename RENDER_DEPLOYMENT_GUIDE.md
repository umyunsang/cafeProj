# 🚀 Render 무료 배포 가이드

## ✅ Render 선택 이유
- **완전 무료** (제한은 있지만 계속 사용 가능)
- **Python FastAPI 완벽 지원**
- **SQLite 데이터베이스 지원**
- **자동 HTTPS 제공**
- **GitHub 연동 자동 배포**

## 📋 배포 단계

### 1단계: Render 계정 생성
1. [Render.com](https://render.com) 방문
2. **"Get Started for Free"** 클릭
3. **GitHub 계정으로 가입** (추천)

### 2단계: GitHub 저장소 연결
1. Render 대시보드에서 **"New +"** → **"Web Service"** 클릭
2. **"Connect a repository"** → 본인의 cafeProj 저장소 선택
3. **Branch**: `main` 선택

### 3단계: 서비스 설정
다음과 같이 설정:

```
Name: cafe-app (또는 원하는 이름)
Environment: Python 3
Build Command: cd cafe-recommend/backend && pip install -r requirements.txt
Start Command: cd cafe-recommend/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4단계: 환경 변수 설정
**Environment Variables** 섹션에서 다음 변수들 추가:

```bash
# 🔑 필수 환경 변수
ENVIRONMENT=production
HOST=0.0.0.0
SECRET_KEY=cc0b57a5b7a4f9f1a6e9d8c7e5a0a3b8a2f0c7d8e1a9b6c5d4e3f2a1b0c9d8e7
DATABASE_URL=sqlite:///./cafe_app.db

# 👤 관리자 계정
FIRST_SUPERUSER=admin@test.com
FIRST_SUPERUSER_PASSWORD=admin1234

# 🤖 OpenAI API (실제 키로 교체)
OPENAI_API_KEY=실제-OpenAI-API-키-입력
OPENAI_MODEL=gpt-4-turbo-preview

# 💳 카카오페이 설정
KAKAO_SECRET_KEY_DEV=DEV880C0DBCE207B93C70140634D8226E62DFBD5
KAKAO_PAY_API_URL=https://open-api.kakaopay.com
KAKAO_CID=TC0ONETIME

# 💳 네이버페이 설정
NAVER_PAY_API_URL=https://dev-pub.apis.naver.com
NAVER_PAY_PARTNER_ID=np_pbyrr410908
NAVER_PAY_CLIENT_ID=HN3GGCMDdTgGUfl0kFCo
NAVER_PAY_CLIENT_SECRET=ftZjkkRNMR
NAVER_PAY_CHAIN_ID=c1l0UTFCMlNwNjY
```

### 5단계: 배포 시작
1. **"Create Web Service"** 클릭
2. 배포 진행 상황을 로그에서 확인
3. 완료되면 Render가 제공하는 URL 확인

### 6단계: CORS 설정 업데이트
배포 완료 후 생성된 URL을 사용해 CORS 설정 업데이트:

1. Render 대시보드에서 Environment Variables 추가:
```bash
BACKEND_CORS_ORIGINS=["https://your-app-name.onrender.com"]
NEXT_PUBLIC_FRONTEND_URL=https://your-app-name.onrender.com
```

2. 자동으로 재배포됩니다.

## 🔍 배포 후 확인사항

### ✅ 체크리스트
- [ ] 백엔드 API 테스트: `https://your-app.onrender.com/health`
- [ ] 프론트엔드 로딩 확인: `https://your-app.onrender.com`
- [ ] 관리자 로그인: `admin@test.com` / `admin1234`
- [ ] AI 추천 기능 테스트
- [ ] 결제 기능 테스트 (개발 모드)

## 📊 Render 무료 티어 제한사항

### ⚠️ 알아두세요
- **Sleep Mode**: 15분 비활성 시 앱이 잠자기 상태로 전환
- **Cold Start**: 잠자기 상태에서 깨어나는데 30초~1분 소요
- **Build Time**: 월 500분 빌드 시간 제한
- **Bandwidth**: 월 100GB 데이터 전송 제한

### 🎯 최적화 팁
- 첫 로딩이 느릴 수 있으니 기다려주세요
- 정기적으로 사이트를 방문해 Sleep 방지
- 불필요한 재배포 최소화

## 🚨 문제 해결

### 빌드 실패 시
1. Render 대시보드 → Logs 확인
2. Python 의존성 문제 → `requirements.txt` 확인
3. 경로 문제 → Build/Start Command 재확인

### CORS 오류 시
```bash
# Environment Variables에서 확인
BACKEND_CORS_ORIGINS=["https://정확한-render-url.onrender.com"]
```

### OpenAI API 오류 시
```bash
# 실제 OpenAI API 키로 교체
OPENAI_API_KEY=sk-proj-실제키-여기에-입력
```

## 🆚 다른 플랫폼 비교

| 플랫폼 | 무료 티어 | Python 지원 | 제한사항 |
|--------|-----------|-------------|----------|
| **Render** | ✅ 영구 무료 | ✅ 완벽 | Sleep Mode |
| Railway | ❌ 크레딧 소진 후 유료 | ✅ 완벽 | 비용 발생 |
| Vercel | ✅ 영구 무료 | ⚠️ Serverless만 | FastAPI 제한 |
| Netlify | ✅ 영구 무료 | ⚠️ Functions만 | 복잡한 설정 |
| GitHub Pages | ✅ 영구 무료 | ❌ 정적 사이트만 | 백엔드 불가 |

**결론**: Render가 가장 적합합니다! 🎉 