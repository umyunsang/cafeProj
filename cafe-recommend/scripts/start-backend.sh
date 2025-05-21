#!/bin/bash

echo "Verifying DATABASE_URL at script start: [$DATABASE_URL]"

PORT=15049
PROJECT_ROOT="/home/student_15030/cafeProj/cafe-recommend"
BACKEND_DIR="${PROJECT_ROOT}/backend"
LOG_DIR="${PROJECT_ROOT}/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/backend-${TIMESTAMP}.log"
ERROR_LOG_FILE="${LOG_DIR}/backend-error-${TIMESTAMP}.log"

# 로그 디렉토리 생성 (없으면)
mkdir -p "${LOG_DIR}"

echo "포트 $PORT 사용 여부 확인 중..."

# 방법 1: lsof 사용 (시스템에 lsof가 설치되어 있는 경우)
if command -v lsof &> /dev/null; then
  PID=$(lsof -t -i:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "lsof로 포트 $PORT 사용 중인 프로세스 $PID를 종료합니다."
    kill -9 $PID 2>/dev/null
    sleep 2
  fi
fi

# 방법 2: netstat 사용 (시스템에 netstat가 설치되어 있는 경우)
if command -v netstat &> /dev/null; then
  PID=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
  if [ ! -z "$PID" ]; then
    echo "netstat으로 포트 $PORT 사용 중인 프로세스 $PID를 종료합니다."
    kill -9 $PID 2>/dev/null
    sleep 2
  fi
fi

# 방법 3: ss 사용 (최신 리눅스 시스템에서 netstat 대신 사용)
if command -v ss &> /dev/null; then
  PID=$(ss -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2)
  if [ ! -z "$PID" ]; then
    echo "ss로 포트 $PORT 사용 중인 프로세스 $PID를 종료합니다."
    kill -9 $PID 2>/dev/null
    sleep 2
  fi
fi

# 방법 4: fuser 사용 (포트를 사용하는 프로세스 강제 종료)
if command -v fuser &> /dev/null; then
  echo "fuser로 포트 $PORT 사용 중인 프로세스를 종료합니다."
  fuser -k $PORT/tcp 2>/dev/null
  sleep 2
fi

echo "모든 포트 확인 및 종료 프로세스 완료"

# Backend 디렉토리로 이동
cd "$BACKEND_DIR"

# 가상환경 활성화 (가상환경이 있는 경우)
if [ -d "venv" ]; then
  echo "가상환경 활성화..."
  source /home/student_15030/cafeProj/cafe-recommend/backend/venv/bin/activate
fi

# FastAPI 서버 시작
echo "포트 $PORT에서 Backend 서버를 시작합니다. 로그 파일: ${LOG_FILE}, 에러 로그: ${ERROR_LOG_FILE}"
cd "$BACKEND_DIR" # uvicorn 실행 전에 BACKEND_DIR로 이동
nohup uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level debug --reload > "${LOG_FILE}" 2> "${ERROR_LOG_FILE}" &

echo "백엔드 서버가 백그라운드에서 시작되었습니다. PID: $!" 