logger.info(f"메뉴 '{menu_item.name}'에 대한 AI 이미지 생성 요청 중...")

# API 키 설정 (환경 변수 또는 설정 파일에서 가져오기)
# api_key = os.environ.get("OPENAI_API_KEY") or settings.OPENAI_API_KEY
api_key = settings.OPENAI_API_KEY

if not api_key: 