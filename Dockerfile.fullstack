# 멀티스테이지 빌드: Node.js와 Python 모두 포함
FROM node:18-alpine AS frontend-builder

# 프론트엔드 빌드
WORKDIR /app/frontend
COPY cafe-recommend/frontend/package*.json ./
RUN npm ci
COPY cafe-recommend/frontend ./
RUN npm run build

# Python 런타임
FROM python:3.11-slim

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# 백엔드 의존성 설치
COPY cafe-recommend/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 코드 복사
COPY cafe-recommend/backend ./

# 프론트엔드 빌드 결과물 복사
COPY --from=frontend-builder /app/frontend/out ./static/frontend/

# 필요한 디렉토리 생성
RUN mkdir -p static/menu_images uploads logs

# 포트 노출
EXPOSE 10000

# 환경변수 설정
ENV HOST=0.0.0.0
ENV PORT=10000

# 애플리케이션 실행
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"] 