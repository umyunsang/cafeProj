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

LOGS_DIR="$PROJECT_ROOT/logs"

echo -e "${YELLOW}서버 종료 중...${NC}"

# 포트 사용 중인 프로세스 확인 및 종료
kill_port() {
    local port=$1
    local name=$2
    if lsof -i :$port > /dev/null; then
        echo -e "${YELLOW}포트 $port($name)를 사용 중인 프로세스를 종료합니다...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null
        echo -e "${GREEN}포트 $port의 프로세스가 종료되었습니다.${NC}"
    fi
}

# 프로세스 종료
kill_process() {
    local pid=$1
    local name=$2
    if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo -e "${YELLOW}$name 프로세스(PID: $pid) 종료 중...${NC}"
        kill -9 $pid 2>/dev/null
        echo -e "${GREEN}$name 프로세스가 종료되었습니다.${NC}"
    fi
}

# Next.js 개발 서버 프로세스 찾기 및 종료
kill_next_dev() {
    local next_pid=$(ps aux | grep "next dev.*15022" | grep -v grep | awk '{print $2}')
    if [ -n "$next_pid" ]; then
        echo -e "${YELLOW}Next.js 개발 서버 종료 중...${NC}"
        kill -9 $next_pid 2>/dev/null
        echo -e "${GREEN}Next.js 개발 서버가 종료되었습니다.${NC}"
    fi
}

# 백엔드 종료
if [ -f "$LOGS_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$LOGS_DIR/backend.pid")
    kill_process $BACKEND_PID "백엔드"
    rm -f "$LOGS_DIR/backend.pid"
fi
kill_port 15026 "백엔드"

# 프론트엔드 종료
if [ -f "$LOGS_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$LOGS_DIR/frontend.pid")
    kill_process $FRONTEND_PID "프론트엔드"
    rm -f "$LOGS_DIR/frontend.pid"
fi
kill_port 15022 "프론트엔드"

# Next.js 개발 서버 종료
kill_next_dev

# 가상환경 비활성화
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

# PID 파일 정리
rm -f "$LOGS_DIR"/*.pid

echo -e "${GREEN}모든 서버가 성공적으로 종료되었습니다.${NC}" 