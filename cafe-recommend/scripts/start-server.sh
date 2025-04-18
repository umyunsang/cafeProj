#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 프로젝트 루트 디렉토리 찾기
if [ -d "$HOME/aiProj/cafe-recommend" ]; then
    PROJECT_ROOT="$HOME/aiProj/cafe-recommend"
else
    echo -e "${RED}프로젝트 디렉토리를 찾을 수 없습니다.${NC}"
    exit 1
fi

# 로그 디렉토리 생성
mkdir -p "$PROJECT_ROOT/logs"

# 포트 사용 중인 프로세스 강제 종료 함수 (개선)
kill_port() {
    local port=$1
    local name=$2
    local pids

    echo -e "${YELLOW}포트 $port($name) 정리 시도...${NC}"
    
    # lsof 사용
    pids=$(lsof -ti :$port)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}lsof: 포트 $port 사용 중인 프로세스 발견 (PIDs: $pids). 강제 종료 시도...${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null
    fi

    # fuser 사용 (fuser가 설치되어 있을 경우)
    if command -v fuser &> /dev/null; then
        pids=$(fuser -n tcp $port 2>/dev/null | xargs)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}fuser: 포트 $port 사용 중인 프로세스 발견 (PIDs: $pids). 강제 종료 시도...${NC}"
            fuser -k -n tcp $port 2>/dev/null
        fi
    else
        echo -e "${YELLOW}fuser 명령어를 찾을 수 없습니다. lsof 결과만 사용합니다.${NC}"
    fi
    
    sleep 2 # 종료 시간 확보 (기존 1초에서 2초로 늘림)
    
    # 최종 확인
    if lsof -i :$port > /dev/null; then
        echo -e "${RED}오류: 포트 $port 프로세스 종료 실패. 스크립트를 중단합니다.${NC}"
        lsof -i :$port # 어떤 프로세스가 여전히 살아있는지 보여줌
        exit 1
    fi
    echo -e "${GREEN}포트 $port 정리 완료.${NC}"
}

# 프로세스 상태 확인
check_process() {
    local pid=$1
    local name=$2
    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo -e "${RED}오류: $name 프로세스(PID: $pid)가 이미 실행 중입니다.${NC}"
        return 1
    fi
    return 0
}

# 이전 PID 파일 확인
cleanup_old_pid() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file")
        if ! kill -0 $old_pid 2>/dev/null; then
            rm -f "$pid_file"
        else
            echo -e "${RED}오류: 이전 프로세스가 아직 실행 중입니다. 먼저 stop-server.sh를 실행해주세요.${NC}"
            exit 1
        fi
    fi
}

# 백엔드 포트 강제 정리
kill_port 15026 "백엔드"

# 프론트엔드 포트 강제 정리
kill_port 15022 "프론트엔드"

# 이전 PID 파일 정리
cleanup_old_pid "$PROJECT_ROOT/logs/backend.pid"
cleanup_old_pid "$PROJECT_ROOT/logs/frontend.pid"

# 백엔드 실행
echo -e "${GREEN}백엔드 서버 시작 중...${NC}"
cd "$PROJECT_ROOT/backend"

# 가상환경 확인 및 활성화
if [ ! -d "venv" ]; then
    echo -e "${RED}가상환경을 찾을 수 없습니다.${NC}"
    exit 1
fi

# 가상환경 활성화
source venv/bin/activate

# 백엔드 서버 실행 (백그라운드)
nohup uvicorn app.main:app --host 0.0.0.0 --port 15026 > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/backend.pid"

# 백엔드 서버 시작 확인
sleep 2
if ! curl -s http://localhost:15026/health > /dev/null; then
    echo -e "${RED}백엔드 서버 시작 실패${NC}"
    exit 1
fi

# 프론트엔드 실행
echo -e "${GREEN}프론트엔드 서버 시작 중...${NC}"
cd "$PROJECT_ROOT/frontend"

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules가 없습니다. 패키지 설치 중...${NC}"
    npm install
fi

# 시작 전 관련 node 프로세스 추가 종료 시도
echo -e "${YELLOW}기존 프론트엔드 관련 node 프로세스 종료 시도 (pkill)...${NC}"
pkill -f "node.*next dev.*15022" 2>/dev/null
pkill -f "npm run dev.*15022" 2>/dev/null
sleep 1

# 프론트엔드 포트 최종 확인 및 정리 (한번 더)
kill_port 15022 "프론트엔드 (시작 직전)"

# 프론트엔드 서버 실행 (백그라운드)
echo -e "${YELLOW}nohup npm run dev 실행...${NC}"
nohup npm run dev -- -p 15022 > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/frontend.pid"

# 프론트엔드 서버 시작 확인
sleep 5
if ! curl -s http://localhost:15022 > /dev/null; then
    echo -e "${RED}프론트엔드 서버 시작 실패${NC}"
    exit 1
fi

echo -e "${GREEN}서버가 성공적으로 시작되었습니다.${NC}"
echo -e "${GREEN}백엔드: http://0.0.0.0:15026${NC}"
echo -e "${GREEN}프론트엔드: http://0.0.0.0:15022${NC}"
echo -e "${GREEN}로그 파일: $PROJECT_ROOT/logs/${NC}" 