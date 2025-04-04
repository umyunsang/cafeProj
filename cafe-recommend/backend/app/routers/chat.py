from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI
from typing import List, Optional, Dict
import os
import json
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from ..crud.menu import menu as menu_crud
from ..schemas import menu as menu_schemas
from ..db.session import get_db
from ..models.menu import Menu
import uuid

# 환경 변수 로드
load_dotenv()

router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

# OpenAI 클라이언트 초기화
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")

client = OpenAI(api_key=api_key)

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

# 대화 기록을 저장할 딕셔너리
chat_histories = {}

CHAT_SYSTEM_PROMPT = """당신은 카페의 AI 바리스타입니다. 고객과 짧고 자연스러운 대화를 통해 음료를 추천해주세요.

다음은 당신이 추천할 수 있는 메뉴 목록입니다:
{menu_list}

다음 지침을 반드시 지켜주세요:
1. 친절하고 전문적으로 응대하세요.
2. 답변은 반드시 25자 이내로 작성하세요.
3. 한 번에 하나의 메뉴만 언급하세요.
4. 한 번에 하나의 질문만 하세요.
5. 가격 문의 시 정확한 가격만 답하세요.
6. 메뉴 설명은 맛이나 특징 중 하나만 언급하세요.

예시 응답:
- "어떤 음료를 찾으시나요?"
- "달콤한 음료 어떠세요?"
- "바닐라라떼 추천드려요!"
- "부드럽고 달콤한 맛이에요."
- "5,500원입니다."

응답은 반드시 한국어로 작성하세요."""

RECOMMENDATION_SYSTEM_PROMPT = """당신은 카페 메뉴 추천 시스템입니다. 사용자의 가장 최근 대화를 기반으로 메뉴를 추천해주세요.

다음은 추천 가능한 메뉴 목록입니다:
{menu_list}

다음은 현재까지의 대화 기록입니다:
{chat_history}

위 대화에서 특히 마지막 대화 내용을 중점적으로 분석하여, 사용자가 관심을 보인 메뉴나 선호도를 파악하세요.
사용자가 특정 메뉴에 긍정적인 반응을 보였다면 해당 메뉴를 우선적으로 추천하세요.

응답은 다음과 같은 형식으로 제공해주세요:
[RECOMMEND_MENU_IDS: id1,id2,id3]

추천 시 고려할 사항:
1. 사용자가 마지막으로 언급하거나 관심을 보인 메뉴를 우선 추천
2. 사용자의 최근 선호도 (뜨거운/차가운, 단맛, 쓴맛 등)
3. 현재 대화의 문맥에 맞는 메뉴
4. 가격대나 카페인 함량 등 구체적으로 언급된 조건

응답에는 추천 이유를 포함하지 말고, 오직 메뉴 ID만 포함해주세요."""

def format_menu_for_prompt(menus: List[Menu]) -> str:
    menu_text = "메뉴 목록:\n"
    for item in menus:
        menu_text += f"- ID:{item.id}, {item.name}: {item.description} ({item.price}원)\n"
    return menu_text

def format_chat_history(history: List[Dict]) -> str:
    return "\n".join([f"{'사용자' if msg['role'] == 'user' else 'AI'}: {msg['content']}" for msg in history])

def get_recommendations(chat_history: List[Dict], menus: List[Menu]) -> List[int]:
    try:
        # 최근 3개의 대화만 포함하여 분석
        recent_history = chat_history[-3:]
        chat_completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": RECOMMENDATION_SYSTEM_PROMPT.format(
                    menu_list=format_menu_for_prompt(menus),
                    chat_history=format_chat_history(recent_history)
                )},
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        response = chat_completion.choices[0].message.content
        start_index = response.find("[RECOMMEND_MENU_IDS:")
        if start_index == -1:
            return []
        
        end_index = response.find("]", start_index)
        if end_index == -1:
            return []
        
        menu_ids_str = response[start_index + len("[RECOMMEND_MENU_IDS:"):end_index].strip()
        return [int(id.strip()) for id in menu_ids_str.split(",")]
    except:
        return []

@router.post("/")
def chat(message: ChatMessage, db: Session = Depends(get_db)):
    try:
        # 세션 ID가 없는 경우 새로 생성
        if not message.session_id:
            message.session_id = str(uuid.uuid4())
        
        # 세션 ID에 해당하는 대화 기록 가져오기
        if message.session_id not in chat_histories:
            chat_histories[message.session_id] = []
        
        # 사용자 메시지 저장
        chat_histories[message.session_id].append({"role": "user", "content": message.message})
        
        # 데이터베이스에서 메뉴 목록 가져오기
        menus = menu_crud.get_multi(db=db)
        menus_dict = {menu.id: menu for menu in menus}
        
        if not menus:
            # 메뉴가 없는 경우 기본 메뉴 목록 사용
            default_menus = [
                {
                    "id": 1,
                    "name": "아메리카노",
                    "description": "깊고 진한 에스프레소의 맛과 향",
                    "price": 4500,
                    "category": "커피"
                },
                {
                    "id": 2,
                    "name": "카페라떼",
                    "description": "부드러운 우유와 에스프레소의 조화",
                    "price": 5000,
                    "category": "커피"
                }
            ]
            menus = [Menu(**menu) for menu in default_menus]
            menus_dict = {menu.id: menu for menu in menus}
        
        try:
            # ChatGPT API 호출 (대화용)
            chat_completion = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": CHAT_SYSTEM_PROMPT.format(
                        menu_list=format_menu_for_prompt(menus)
                    )},
                    *chat_histories[message.session_id][-5:]  # 최근 5개의 대화만 포함
                ],
                temperature=0.7,
                max_tokens=50,
                presence_penalty=0.6,
                frequency_penalty=0.3
            )
            
            # AI 응답 추출 및 저장
            ai_response = chat_completion.choices[0].message.content
            chat_histories[message.session_id].append({"role": "assistant", "content": ai_response})
            
            # 별도의 추천 시스템을 통해 메뉴 추천 받기
            recommended_ids = get_recommendations(chat_histories[message.session_id], menus)
            
            # 추천된 메뉴 정보 생성
            recommended_items = [
                {
                    "id": menu_id,
                    "name": menus_dict[menu_id].name,
                    "description": menus_dict[menu_id].description,
                    "price": menus_dict[menu_id].price
                }
                for menu_id in recommended_ids
                if menu_id in menus_dict
            ]
            
            # 추천 메뉴가 없는 경우 인기 메뉴 추천
            if not recommended_items:
                popular_menus = menu_crud.get_popular(db=db, limit=3)
                recommended_items = [
                    {
                        "id": menu.id,
                        "name": menu.name,
                        "description": menu.description,
                        "price": menu.price
                    }
                    for menu in popular_menus
                ]
            
            return {
                "response": ai_response,
                "recommendations": recommended_items,
                "session_id": message.session_id  # 세션 ID 반환
            }
            
        except Exception as e:
            print(f"OpenAI API 오류: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="AI 응답을 생성하는 중 오류가 발생했습니다."
            )
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="채팅 처리 중 오류가 발생했습니다."
        ) 