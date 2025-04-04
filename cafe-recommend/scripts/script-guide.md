# 카페 추천 시스템 스크립트 사용 가이드

이 문서는 카페 추천 시스템의 실행 및 종료를 위한 스크립트 사용법을 설명합니다.

## 시스템 실행

### 실행 방법
```bash
$HOME/aiProj/cafe-recommend/scripts/start-server.sh
```

### 실행 시 동작
1. 백엔드 서버
   - 가상환경 활성화
   - FastAPI 서버 실행 (포트: 15026)
   - 로그 파일: `logs/backend.log`
   - PID 파일: `logs/backend.pid`

2. 프론트엔드 서버
   - Next.js 서버 실행 (포트: 15022)
   - 로그 파일: `logs/frontend.log`
   - PID 파일: `logs/frontend.pid`

### 접속 주소
- 백엔드: http://0.0.0.0:15026
- 프론트엔드: http://0.0.0.0:15022 또는 http://localhost:15022

## 시스템 종료

### 종료 방법
```bash
$HOME/aiProj/cafe-recommend/scripts/stop-server.sh
```

### 종료 시 동작
1. 백엔드 서버
   - PID 파일을 통해 프로세스 종료
   - 가상환경 비활성화

2. 프론트엔드 서버
   - PID 파일을 통해 프로세스 종료

## 로그 확인

### 실시간 로그 확인
```bash
# 백엔드 로그
tail -f $HOME/aiProj/cafe-recommend/logs/backend.log

# 프론트엔드 로그
tail -f $HOME/aiProj/cafe-recommend/logs/frontend.log
```

### 로그 파일 위치
- 백엔드: `logs/backend.log`
- 프론트엔드: `logs/frontend.log`

## 문제 해결

### 포트 충돌 발생 시
다음과 같은 에러 메시지가 나타날 경우:
```
ERROR: [Errno 98] error while attempting to bind on address ('0.0.0.0', 15026): address already in use
Error: listen EADDRINUSE: address already in use :::15022
```

해결 방법:
1. 실행 중인 프로세스 확인
   ```bash
   ps -ef | grep -E "uvicorn|next dev"
   ```

2. 프로세스 강제 종료
   ```bash
   pkill -f "uvicorn app.main:app"  # 백엔드 종료
   pkill -f "next dev"              # 프론트엔드 종료
   ```

3. 시스템 재시작
   ```bash
   $HOME/aiProj/cafe-recommend/scripts/start-server.sh
   ```

## 주의사항
1. 스크립트는 항상 프로젝트 루트 디렉토리(`$HOME/aiProj/cafe-recommend`)를 기준으로 동작합니다.
2. 로그 파일은 자동으로 생성되며, `logs` 디렉토리에 저장됩니다.
3. 시스템 종료 시 반드시 `stop-server.sh` 스크립트를 사용하여 프로세스를 정상적으로 종료해주세요. 