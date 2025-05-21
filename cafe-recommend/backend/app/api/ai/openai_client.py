import openai
import uuid
import json
import os
import re # 정규식 모듈 임포트
from typing import Dict, List, Optional, Any, Tuple
import asyncio
from fastapi import HTTPException  # HTTPException import 추가
# 마크다운 제거를 위한 정규식 라이브러리 (방법 A 선택 시 필요)
# import re 
from ...core.config import settings
from ...models.menu import Menu

# OpenAI API 키 설정 (settings 객체에서 가져오도록 수정)
# os.environ["OPENAI_API_KEY"] = "sk-proj---"
# openai.api_key = os.environ["OPENAI_API_KEY"]

# settings에서 로드된 API 키 사용
if settings.OPENAI_API_KEY:
    openai.api_key = settings.OPENAI_API_KEY
else:
    # OPENAI_API_KEY가 .env에 없거나 비어있는 경우, 로깅 또는 기본 동작 처리
    # 예: print("Warning: OPENAI_API_KEY is not set in .env file. OpenAI related features will not work.")
    # 또는 이 파일 로드 시점에 에러를 발생시켜 문제를 즉시 알릴 수도 있음
    # 여기서는 openai.api_key가 None으로 유지되어 이후 API 호출 시 에러가 발생하도록 둠.
    # generate_chat_response 함수에서 이미 키 존재 여부를 확인하고 있음.
    pass

# 세션 메모리 (실제 서비스에서는 Redis 등의 외부 저장소 사용 권장)
SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}

# 시스템 프롬프트 설정 (개선된 메뉴 추천 프롬프트)
SYSTEM_PROMPT = """
당신은 카페의 AI 바리스타입니다. 고객에게 친절하게 응대하고 메뉴를 추천해주세요.

메뉴 추천 시 다음 지침을 따라주세요:
1. 고객의 취향, 선호도, 기분, 날씨 등 상황을 고려하여 맞춤형 추천을 제공하세요.
2. 제공된 메뉴 목록에서만 추천해야 합니다.
3. 고객의 요청에 따라 최대 3개의 메뉴를 추천해주세요.
4. 추천 이유와 함께 메뉴의 특징(풍미, 맛, 향 등)을 구체적으로 설명해주세요.
5. 메뉴 이름을 언급하고, 가격도 함께 안내해주세요. (예: "따뜻한 바닐라 라떼 (5500원)는 어떠세요?")
6. 추천 메뉴와 어울리는 디저트나 사이드 메뉴를 함께 추천하면 좋습니다.
7. 아래 상황별 추천 가이드를 참고하세요:
   - 피로/에너지 필요: 강한 카페인 함량의 음료 (아메리카노, 에스프레소) 추천
   - 달콤한 맛 선호: 카라멜 마키아토, 초콜릿 음료, 바닐라 라떼 등 추천
   - 부드러운 맛 선호: 라떼 종류, 연한 커피, 밀크티 계열 추천
   - 더운 날씨: 아이스 음료, 블렌디드 음료, 과일 티 추천
   - 추운 날씨: 따뜻한 음료, 진한 초콜릿, 계피/시나몬 향 음료 추천
   - 건강 고려: 저당/저칼로리 옵션, 디카페인, 과일 티 추천

답변은 항상 한국어로 해주시고, 친절하고 전문적인 어조를 유지하세요. 답변 시 절대 마크다운 서식(**, *, #, 리스트 등)을 사용하지 마세요. 각 문장은 마침표로 끝맺어 주세요.
"""

# 고객 문의 응대용 프롬프트
CUSTOMER_SERVICE_PROMPT = """
당신은 카페의 AI 고객 서비스 담당자입니다. 다음 규칙을 따라 고객에게 친절하게 응대해주세요:

1. 고객의 요청이나 불만 사항에 공감하고 경청하는 자세를 보여주세요.
2. 영업 시간, 위치, 매장 정책 등에 관한 정보를 정확하게 안내해주세요.
3. 다음 정보를 참고하여 질문에 답변하세요:
   - 영업시간: 평일 7:00-22:00, 주말 9:00-21:00
   - 주소: 서울시 강남구 테헤란로 123
   - 전화번호: 02-1234-5678
   - 주차: 2시간 무료 주차 가능
   - 와이파이: 무료 제공 (비밀번호: cafe1234)
   - 반려동물: 소형 반려동물 동반 가능
   - 포장/배달: 가능 (배달앱을 통해 주문 가능)
4. 답변을 모를 경우, 정직하게 답변하고 매장 방문 시 문의를 권유해주세요.

답변은 항상 친절하고 정중하게 한국어로 작성해주세요. 답변 시 절대 마크다운 서식(**, *, #, 리스트 등)을 사용하지 마세요. 각 문장은 마침표로 끝맺어 주세요.
"""

# 주문 관련 정보 제공 프롬프트
ORDER_INFO_PROMPT = """
당신은 카페의 AI 주문 도우미입니다. 주문 과정과 관련된 문의에 다음 지침에 따라 응대해주세요:

1. 주문 프로세스에 대한 안내:
   - 메뉴 선택 → 장바구니 담기 → 결제 과정에 대해 명확하게 설명
   - 온라인 주문 시 필요한 정보(핸드폰 번호, 선호 픽업 시간 등) 안내
   - 매장 내 주문, 테이크아웃, 배달 옵션에 대한 정보 제공

2. 결제 방법 안내:
   - 지원되는 결제 수단: 신용카드, 카카오페이, 네이버페이, 현금
   - 포인트 적립 및 사용 방법 설명
   - 영수증 발급 방법 안내

3. 주문 상태 확인 방법:
   - 주문 번호로 상태 확인 방법
   - 예상 준비 시간 안내
   - 주문 변경/취소 정책 및 방법 설명

4. 픽업 및 배달 정보:
   - 포장 주문 시 픽업 방법
   - 배달 가능 지역 및 최소 주문 금액
   - 배달 소요 시간 및 배달료 안내

5. 단체 주문 및 케이터링:
   - 10인 이상 단체 주문 시 사전 예약 필요
   - 케이터링 서비스 가능 여부 및 문의 방법

답변은 항상 정확하고 이해하기 쉽게 한국어로 작성해주세요. 고객이 주문 과정에서 혼란을 겪지 않도록 단계별로 명확하게 안내해주세요. 답변 시 절대 마크다운 서식(**, *, #, 리스트 등)을 사용하지 마세요. 각 문장은 마침표로 끝맺어 주세요.
"""

# 질문 유형 분류 프롬프트
CLASSIFY_PROMPT = """
다음 사용자 메시지가 어떤 유형의 질문인지 분류해주세요:
1. 메뉴 추천 요청: 메뉴, 음료, 디저트 등에 대한 추천 요청
2. 매장 정보 질문: 영업시간, 위치, 주차, 와이파이 등에 대한 질문
3. 주문 관련 질문: 주문 방법, 포장, 배달, 결제 등에 대한 질문
4. 불만 사항: 서비스, 품질 등에 대한 불만
5. 기타: 위의 카테고리에 속하지 않는 질문

형식은 숫자로만 답변해주세요(1, 2, 3, 4, 5 중 하나).
"""

def remove_markdown(text: str) -> str:
    """마크다운 서식을 제거합니다."""
    # **bold** 또는 __bold__ -> bold (내용 앞/뒤 공백 허용)
    text = re.sub(r'\*{2}\s*(.*?)\s*\*{2}|_{2}\s*(.*?)\s*_{2}', r'\1\2', text)

    # # Header, ## Header 등 -> Header (라인 시작 부분 + 앞쪽 공백 허용)
    text = re.sub(r'^\s*#+\s+', '', text, flags=re.MULTILINE)

    # 숫자 리스트 (예: 1. item 또는 1.item) 앞의 숫자와 점, 선택적 공백 제거
    # (주의: "버전 1.0"과 같은 소수점과 구분하기 위해 패턴을 신중하게 조정)
    # 여기서는 "1." 과 같은 명확한 리스트 마커를 대상으로 합니다.
    text = re.sub(r'^\s*\d+\.\s*?', '', text, flags=re.MULTILINE) # 점 뒤 공백을 선택적으로 변경

    # -, *, + 로 시작하는 리스트 마커 제거 (앞쪽 공백 허용)
    text = re.sub(r'^\s*[-\*\+]\s+', '', text, flags=re.MULTILINE)
    
    # 인용구 마커 '>' 제거
    text = re.sub(r'^\s*>\s?', '', text, flags=re.MULTILINE)

    # 간단한 HTML 태그 제거
    text = re.sub(r'<[^>]+>', '', text)
    
    # 그 외 혹시 모를 Markdown 링크 형식 [text](url) 에서 [text] 만 남기기 (url 제거)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

    # 연속된 공백을 하나로 줄이고 양 끝 공백 제거
    text = re.sub(r'\s+', ' ', text).strip()
    return text

async def classify_user_message(user_message: str) -> int:
    """
    사용자 메시지를 분석하여 질문 유형을 분류합니다.
    """
    if not settings.OPENAI_API_KEY:
        return 1  # 기본값: 메뉴 추천 요청
        
    try:
        messages = [
            {"role": "system", "content": CLASSIFY_PROMPT},
            {"role": "user", "content": user_message}
        ]
        
        response = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=10 # 분류 작업이므로 max_tokens는 짧게 유지
        )
        
        classification = response.choices[0].message["content"].strip()
        
        # 숫자만 추출
        try:
            result = int(classification[0])
            if 1 <= result <= 5:
                return result
            return 1
        except ValueError:
            return 1
            
    except Exception as e:
        print(f"분류 중 오류 발생: {str(e)}")
        return 1  # 오류 발생 시 기본값

async def generate_chat_response(
    user_message: str, 
    session_id: Optional[str] = None,
    menus: List[Menu] = None
) -> Dict[str, Any]:
    """
    OpenAI API를 사용하여 사용자 메시지에 대한 응답을 생성합니다.
    """
    if not settings.OPENAI_API_KEY:
        return {
            # "response": "OpenAI API 키가 설정되지 않았습니다.", # 이전 필드
            "response_sentences": ["OpenAI API 키가 설정되지 않았습니다."],
            "session_id": session_id or str(uuid.uuid4()),
            "recommended_ids": [],
            "message_type": "error"
        }
    
    # 세션 ID가 없으면 새로 생성
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # 세션 기록이 없으면 초기화
    if session_id not in SESSION_MEMORY:
        SESSION_MEMORY[session_id] = []
    
    # 메시지 유형 분류
    message_type = await classify_user_message(user_message)
    
    # 카테고리별 메뉴 정보 생성 - 메뉴 추천 프롬프트 개선
    if menus:
        categories = {}
        for menu_item in menus:
            category = getattr(menu_item, 'category', '기타')
            if category not in categories:
                categories[category] = []
            categories[category].append(menu_item)
        
        # 카테고리별로 구분된 메뉴 정보 생성
        menu_info_parts = []
        for category, category_menus in categories.items():
            category_info = f"[{category}]\n"
            for menu_item_detail in category_menus: # 내부 루프 변수명 변경
                category_info += f"ID: {menu_item_detail.id}, 이름: {menu_item_detail.name}, 설명: {menu_item_detail.description}, 가격: {menu_item_detail.price}원\n"
            menu_info_parts.append(category_info)
        
        menu_info = "\n".join(menu_info_parts)
    else:
        menu_info = "사용 가능한 메뉴가 없습니다."
    
    # 시스템 메시지 설정 - 메시지 유형에 따라 다른 프롬프트 사용
    system_prompt = SYSTEM_PROMPT
    if message_type == 2:  # 매장 정보 질문
        system_prompt = CUSTOMER_SERVICE_PROMPT
    elif message_type == 3:  # 주문 관련 질문
        system_prompt = ORDER_INFO_PROMPT
    
    # 시스템 메시지 및 메뉴 정보 추가
    messages = [
        {"role": "system", "content": system_prompt + (f"\n\n사용 가능한 메뉴 목록:\n{menu_info}" if message_type == 1 else "")}
    ]
    
    # 이전 대화 기록 추가
    messages.extend(SESSION_MEMORY[session_id])
    
    # 사용자 메시지 추가
    messages.append({"role": "user", "content": user_message})
    
    try:
        # API 호출
        response = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024 
        )
        
        # 응답 추출
        raw_assistant_message = response.choices[0].message["content"].strip()
        
        # 마크다운 제거 후처리
        cleaned_assistant_message = remove_markdown(raw_assistant_message)
        
        # 문장 분리 (마침표 + 공백 또는 마침표만 있는 경우 모두 처리)
        # 빈 문자열이 생성될 수 있으므로 필터링
        response_sentences = [sentence.strip() + '.' for sentence in cleaned_assistant_message.split('.') if sentence.strip()]
        if not response_sentences and cleaned_assistant_message: # 마침표가 아예 없는 짧은 응답 처리
            response_sentences = [cleaned_assistant_message]
        elif cleaned_assistant_message.endswith('.'): # 마지막 문장이 마침표로 끝나는 경우, 추가된 마침표 제거
            if response_sentences and response_sentences[-1].endswith('..'):
                 response_sentences[-1] = response_sentences[-1][:-1]


        # 대화 기록 저장 (원본 메시지 저장)
        SESSION_MEMORY[session_id].append({"role": "user", "content": user_message})
        SESSION_MEMORY[session_id].append({"role": "assistant", "content": cleaned_assistant_message}) # 분리 전 원본 저장
        
        # 대화 기록이 너무 길어지면 오래된 메시지 제거 (토큰 제한 고려)
        if len(SESSION_MEMORY[session_id]) > 10:
            SESSION_MEMORY[session_id] = SESSION_MEMORY[session_id][-10:]
        
        # 메시지 유형에 따른 응답 타입 설정
        response_type = "menu_recommendation"
        if message_type == 2:
            response_type = "customer_service"
        elif message_type == 3:
            response_type = "order_info"
        
        # 추천된 메뉴 ID 추출 (메시지 내용에서 추출) - 개선된 방식
        recommended_ids = []
        if menus and message_type == 1:  # 메뉴 추천 요청인 경우에만 수행
            menu_mentions = {}
            for menu_item_rec in menus: # 변수명 변경
                mentions = cleaned_assistant_message.lower().count(menu_item_rec.name.lower())
                if mentions > 0:
                    menu_mentions[menu_item_rec.id] = mentions
            
            sorted_menus = sorted(menu_mentions.items(), key=lambda x: x[1], reverse=True)
            recommended_ids = [menu_id for menu_id, _ in sorted_menus[:3]]
        
        return {
            # "response": assistant_message, # 이전 필드
            "response_sentences": response_sentences if response_sentences else ["죄송합니다, 답변을 이해하지 못했어요."], # 빈 리스트 방지
            "session_id": session_id,
            "recommended_ids": recommended_ids,
            "message_type": response_type
        }

    except Exception as e:
        print(f"OpenAI API 응답 생성 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="AI 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        )

def get_session_history(session_id: str) -> List[Dict[str, str]]:
    """세션 기록을 가져옵니다."""
    return SESSION_MEMORY.get(session_id, [])

def clear_session(session_id: str) -> bool:
    """세션 기록을 삭제합니다."""
    if session_id in SESSION_MEMORY:
        del SESSION_MEMORY[session_id]
        return True
    return False 