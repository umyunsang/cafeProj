import openai
from openai import OpenAI
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

# OpenAI 클라이언트 초기화
client = None
if settings.OPENAI_API_KEY:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

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

def classify_message_fast(user_message: str) -> int:
    """키워드 기반으로 빠르게 메시지 유형을 분류합니다."""
    message_lower = user_message.lower()
    
    # 메뉴 추천 키워드
    menu_keywords = ['추천', '메뉴', '음료', '커피', '라떼', '아메리카노', '디저트', '케이크', '달달한', '시원한', '따뜻한', '맛있는']
    
    # 매장 정보 키워드  
    store_keywords = ['영업시간', '위치', '주소', '전화번호', '주차', '와이파이', '비밀번호', '화장실', '반려동물']
    
    # 주문 관련 키워드
    order_keywords = ['주문', '포장', '배달', '결제', '카드', '현금', '카카오페이', '네이버페이', '픽업', '테이크아웃']
    
    # 키워드 매칭 점수 계산
    menu_score = sum(1 for keyword in menu_keywords if keyword in message_lower)
    store_score = sum(1 for keyword in store_keywords if keyword in message_lower)
    order_score = sum(1 for keyword in order_keywords if keyword in message_lower)
    
    # 가장 높은 점수의 카테고리 반환
    if menu_score >= store_score and menu_score >= order_score:
        return 1  # 메뉴 추천
    elif store_score >= order_score:
        return 2  # 매장 정보
    else:
        return 3  # 주문 정보

async def generate_chat_response_optimized(
    user_message: str, 
    session_id: Optional[str] = None,
    menus: List[Menu] = None
) -> Dict[str, Any]:
    """최적화된 챗봇 응답 생성"""
    if not client:
        return {
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
    
    # 빠른 메시지 유형 분류 (API 호출 없음)
    message_type = classify_message_fast(user_message)
    
    # 간소화된 메뉴 정보 생성 (최대 10개 메뉴만)
    if menus and message_type == 1:
        # 인기 메뉴 우선으로 최대 10개만 선택
        limited_menus = menus[:10]
        menu_info = "주요 메뉴:\n"
        for menu_item in limited_menus:
            menu_info += f"{menu_item.name} ({menu_item.price}원)\n"
    else:
        menu_info = ""
    
    # 시스템 프롬프트 간소화
    if message_type == 1:
        system_prompt = """카페 AI 바리스타입니다. 친절하고 따뜻하게 고객님께 메뉴를 추천해드립니다.

추천 시 반드시 포함할 내용:
1. 고객님의 요청에 맞는 이유 설명
2. 메뉴의 특징과 맛 설명  
3. 가격 정보
4. 왜 이 메뉴가 좋은지 구체적인 이유

친절하고 전문적인 어조로 응답하되, 마크다운은 사용하지 마세요."""
    elif message_type == 2:
        system_prompt = "카페 고객서비스 담당입니다. 매장 정보를 친절하고 정확하게 안내해드립니다. 마크다운 사용 금지."
    else:
        system_prompt = "카페 주문 도우미입니다. 주문 관련 정보를 친절하고 명확하게 안내해드립니다. 마크다운 사용 금지."
    
    # 메시지 구성 (간소화)
    messages = [
        {"role": "system", "content": system_prompt + (f"\n{menu_info}" if menu_info else "")}
    ]
    
    # 최근 2개 대화만 포함 (컨텍스트 축소)
    recent_history = SESSION_MEMORY[session_id][-4:] if len(SESSION_MEMORY[session_id]) > 4 else SESSION_MEMORY[session_id]
    messages.extend(recent_history)
    messages.append({"role": "user", "content": user_message})
    
    try:
        # 최적화된 API 호출
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.5,  # 친근함과 품질을 위해 조금 높임
            max_tokens=768,   # 상세한 추천 이유를 위해 증가
            top_p=0.9        # 응답 품질 유지하면서 속도 향상
        )
        
        # 응답 처리
        raw_assistant_message = response.choices[0].message.content.strip()
        cleaned_assistant_message = remove_markdown(raw_assistant_message)
        
        # 개선된 문장 분리 (가격 정보 분리 방지)
        # 마침표 기준 분리하되, 괄호 안의 내용이나 가격은 분리하지 않음
        sentences = []
        current_sentence = ""
        paren_count = 0
        
        for char in cleaned_assistant_message:
            current_sentence += char
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
            elif char in '.!?' and paren_count == 0:
                # 괄호 밖에서 문장 끝나는 경우만 분리
                if current_sentence.strip():
                    sentences.append(current_sentence.strip())
                current_sentence = ""
        
        # 남은 내용이 있으면 추가
        if current_sentence.strip():
            sentences.append(current_sentence.strip())
        
        # 최대 3문장으로 제한하되, 너무 짧으면 합치기
        response_sentences = []
        for sentence in sentences[:3]:
            if sentence:
                response_sentences.append(sentence)
        
        if not response_sentences and cleaned_assistant_message:
            response_sentences = [cleaned_assistant_message]
        
        # 대화 기록 저장
        SESSION_MEMORY[session_id].append({"role": "user", "content": user_message})
        SESSION_MEMORY[session_id].append({"role": "assistant", "content": cleaned_assistant_message})
        
        # 세션 기록 제한 (최근 6개 메시지만 유지)
        if len(SESSION_MEMORY[session_id]) > 6:
            SESSION_MEMORY[session_id] = SESSION_MEMORY[session_id][-6:]
        
        # 응답 타입 설정
        response_type = ["menu_recommendation", "customer_service", "order_info"][message_type - 1]
        
        # 정확한 메뉴 ID 추출 (AI 응답과 일치하도록 개선)
        recommended_ids = []
        if menus and message_type == 1:
            response_text = cleaned_assistant_message.lower()
            
            # 1단계: 정확한 메뉴 이름 매칭 (우선순위)
            for menu_item in menus:
                menu_name_lower = menu_item.name.lower()
                # 정확한 메뉴 이름이 응답에 포함되어 있는지 확인
                if menu_name_lower in response_text:
                    if menu_item.id not in recommended_ids:
                        recommended_ids.append(menu_item.id)
                        
            # 2단계: 부분 매칭 (정확한 매칭이 없을 경우에만)
            if not recommended_ids:
                for menu_item in menus[:5]:  # 상위 5개 메뉴만 검사
                    menu_words = menu_item.name.lower().split()
                    # 메뉴 이름의 주요 단어들이 응답에 포함되어 있는지 확인
                    if any(word in response_text for word in menu_words if len(word) > 1):
                        if menu_item.id not in recommended_ids:
                            recommended_ids.append(menu_item.id)
                            if len(recommended_ids) >= 3:
                                break
            
            # 3단계: 응답에 언급된 메뉴가 없으면 빈 리스트 반환 (랜덤 추천 방지)
            # recommended_ids = recommended_ids[:3]  # 최대 3개로 제한
        
        return {
            "response_sentences": response_sentences if response_sentences else ["죄송합니다, 답변을 이해하지 못했어요."],
            "session_id": session_id,
            "recommended_ids": recommended_ids,
            "message_type": response_type
        }

    except Exception as e:
        print(f"OpenAI API 응답 생성 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="AI 응답을 생성하는 중 오류가 발생했습니다."
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

async def generate_chat_stream(
    user_message: str,
    session_id: Optional[str] = None,
    menus: List[Menu] = None
):
    """
    OpenAI API를 사용하여 스트리밍 방식으로 응답을 생성합니다.
    """
    import json
    
    if not client:
        error_response = {
            "type": "error",
            "content": "OpenAI API 키가 설정되지 않았습니다.",
            "finished": True
        }
        yield f"data: {json.dumps(error_response, ensure_ascii=False)}\n\n"
        return

    # 세션 ID가 없으면 새로 생성
    if not session_id:
        session_id = str(uuid.uuid4())

    # 세션 기록이 없으면 초기화
    if session_id not in SESSION_MEMORY:
        SESSION_MEMORY[session_id] = []

    try:
        # 메시지 유형 분류
        message_type = classify_message_fast(user_message)
        
        # 메뉴 정보 생성
        if menus:
            categories = {}
            for menu_item in menus:
                category = getattr(menu_item, 'category', '기타')
                if category not in categories:
                    categories[category] = []
                categories[category].append(menu_item)
            
            menu_info_parts = []
            for category, category_menus in categories.items():
                category_info = f"[{category}]\n"
                for menu_item_detail in category_menus:
                    category_info += f"ID: {menu_item_detail.id}, 이름: {menu_item_detail.name}, 설명: {menu_item_detail.description}, 가격: {menu_item_detail.price}원\n"
                menu_info_parts.append(category_info)
            
            menu_info = "\n".join(menu_info_parts)
        else:
            menu_info = "사용 가능한 메뉴가 없습니다."

        # 시스템 프롬프트 설정
        system_prompt = SYSTEM_PROMPT
        if message_type == 2:
            system_prompt = CUSTOMER_SERVICE_PROMPT
        elif message_type == 3:
            system_prompt = ORDER_INFO_PROMPT

        # 메시지 구성
        messages = [
            {"role": "system", "content": system_prompt + (f"\n\n사용 가능한 메뉴 목록:\n{menu_info}" if message_type == 1 else "")}
        ]
        
        messages.extend(SESSION_MEMORY[session_id])
        messages.append({"role": "user", "content": user_message})

        # OpenAI 스트리밍 응답 생성
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            stream=True
        )

        accumulated_content = ""
        
        # 스트리밍 응답 처리
        for chunk in response:
            if chunk.choices[0].delta.content:
                content_chunk = chunk.choices[0].delta.content
                accumulated_content += content_chunk
                
                # 청크 전송
                response_chunk = {
                    "type": "content",
                    "content": content_chunk,
                    "finished": False
                }
                yield f"data: {json.dumps(response_chunk, ensure_ascii=False)}\n\n"

        # 마크다운 제거
        cleaned_content = remove_markdown(accumulated_content)
        
        # 대화 기록 저장
        SESSION_MEMORY[session_id].append({"role": "user", "content": user_message})
        SESSION_MEMORY[session_id].append({"role": "assistant", "content": cleaned_content})
        
        # 대화 기록 길이 제한
        if len(SESSION_MEMORY[session_id]) > 10:
            SESSION_MEMORY[session_id] = SESSION_MEMORY[session_id][-10:]

        # 추천 메뉴 ID 추출
        recommended_ids = []
        if menus and message_type == 1:
            menu_mentions = {}
            for menu_item in menus:
                mentions = cleaned_content.lower().count(menu_item.name.lower())
                if mentions > 0:
                    menu_mentions[menu_item.id] = mentions
            
            sorted_menus = sorted(menu_mentions.items(), key=lambda x: x[1], reverse=True)
            recommended_ids = [menu_id for menu_id, _ in sorted_menus[:3]]

        # 최종 응답
        final_response = {
            "type": "complete",
            "content": cleaned_content,
            "session_id": session_id,
            "recommended_ids": recommended_ids,
            "message_type": "menu_recommendation" if message_type == 1 else "customer_service" if message_type == 2 else "order_info",
            "finished": True
        }
        yield f"data: {json.dumps(final_response, ensure_ascii=False)}\n\n"

    except Exception as e:
        error_response = {
            "type": "error",
            "content": f"스트리밍 응답 생성 중 오류가 발생했습니다: {str(e)}",
            "finished": True
        }
        yield f"data: {json.dumps(error_response, ensure_ascii=False)}\n\n" 