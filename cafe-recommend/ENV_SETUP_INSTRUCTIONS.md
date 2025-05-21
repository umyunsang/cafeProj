# 환경 변수 설정 안내서

새 작업공간에서 프로젝트가 정상적으로 실행되려면 다음과 같이 환경 변수 파일을 설정해야 합니다.

## 백엔드 환경 변수 (.env)

백엔드 디렉토리(cafe-recommend/backend/)에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```
# 서버 설정
PORT=15049
HOST=0.0.0.0
ENVIRONMENT=development

# 데이터베이스 설정
DATABASE_URL=sqlite:///./cafe.db

# JWT 설정
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 설정
ALLOWED_ORIGINS=http://localhost:15030

# 로깅 설정
LOG_LEVEL=INFO
LOG_FILE=logs/backend.log

# API 설정
API_PREFIX=/api/v1

# 네이버페이 설정 (샌드박스) 
NAVER_PAY_API_URL="https://dev-pub.apis.naver.com"
NAVER_PAY_PARTNER_ID="np_pbyrr410908"
NAVER_PAY_CLIENT_ID="HN3GGCMDdTgGUfl0kFCo"
NAVER_PAY_CHAIN_ID="c1l0UTFCMlNwNjY"
```

## 프론트엔드 환경 변수 (.env.local)

프론트엔드 디렉토리(cafe-recommend/frontend/)에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```
NEXT_PUBLIC_API_URL=http://116.124.191.174:15049
NEXT_PUBLIC_SITE_URL=http://116.124.191.174:15030
```

## 환경 변수 파일 생성 방법

터미널에서 다음 명령을 실행하여 파일을 생성할 수 있습니다:

```bash
# 백엔드 환경 변수 설정
cd ~/cafeProj/cafe-recommend/backend
cat > .env << 'EOL'
# 서버 설정
PORT=15049
HOST=0.0.0.0
ENVIRONMENT=development

# 데이터베이스 설정
DATABASE_URL=sqlite:///./cafe.db

# JWT 설정
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 설정
ALLOWED_ORIGINS=http://localhost:15030

# 로깅 설정
LOG_LEVEL=INFO
LOG_FILE=logs/backend.log

# API 설정
API_PREFIX=/api/v1

# 네이버페이 설정 (샌드박스) 
NAVER_PAY_API_URL="https://dev-pub.apis.naver.com"
NAVER_PAY_PARTNER_ID="np_pbyrr410908"
NAVER_PAY_CLIENT_ID="HN3GGCMDdTgGUfl0kFCo"
NAVER_PAY_CHAIN_ID="c1l0UTFCMlNwNjY"
EOL

# 프론트엔드 환경 변수 설정
cd ~/cafeProj/cafe-recommend/frontend
cat > .env.local << 'EOL'
NEXT_PUBLIC_API_URL=http://116.124.191.174:15049
NEXT_PUBLIC_SITE_URL=http://116.124.191.174:15030
EOL
```

위 명령어를 실행하면 필요한 환경 변수 파일이 자동으로 생성됩니다. 