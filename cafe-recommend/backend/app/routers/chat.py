from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from sqlalchemy.orm import Session
from ..crud.menu import menu as menu_crud
# from ..schemas import menu as menu_schemas # menu_schemas 사용되지 않으므로 주석 처리 또는 삭제 가능
from ..db.session import get_db
from ..models.menu import Menu
from ..api.ai.openai_client import generate_chat_response_optimized, get_session_history, clear_session, generate_chat_stream
from fastapi.responses import StreamingResponse
import json
import asyncio

router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    chat_type: Optional[str] = "general"  # general, customer_service

class ChatResponse(BaseModel):
    # response: str # 이전 필드
    response_sentences: List[str] # 문장 리스트로 변경
    session_id: str
    recommendations: List[Dict] = []
    message_type: str = "menu_recommendation"  # menu_recommendation, customer_service, order_info, error

@router.post("/", response_model=ChatResponse)
async def chat(message: ChatMessage, db: Session = Depends(get_db)):
    try:
        # 데이터베이스에서 메뉴 목록 가져오기
        menus = menu_crud.get_multi(db=db)
        menus_dict = {menu.id: menu for menu in menus}
        
        if not menus:
            # 메뉴가 없는 경우 기본 메뉴 목록 사용 (실제 운영 시에는 DB에 메뉴가 있도록 관리 필요)
            default_menus_data = [
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
            menus = [Menu(**m_data) for m_data in default_menus_data] # 변수명 변경 menu -> m_data
            menus_dict = {menu.id: menu for menu in menus}
        
        # AI 응답 생성 (최적화된 함수 사용)
        response_data = await generate_chat_response_optimized(
            user_message=message.message,
            session_id=message.session_id,
            menus=menus
        )
        
        session_id = response_data.get("session_id", message.session_id or str(uuid.uuid4()))
        message_type = response_data.get("message_type", "menu_recommendation")
        response_sentences = response_data.get("response_sentences", ["죄송합니다, 응답을 생성할 수 없습니다."]) # 기본값 설정
        
        recommended_items = []
        if message_type == "menu_recommendation":
            recommended_ids = response_data.get("recommended_ids", [])
            recommended_items = [
                {
                    "id": menu_id,
                    "name": menus_dict[menu_id].name,
                    "description": menus_dict[menu_id].description,
                    "price": menus_dict[menu_id].price,
                    "image_url": menus_dict[menu_id].image_url
                }
                for menu_id in recommended_ids
                if menu_id in menus_dict
            ]
            
            # AI가 실제로 추천하지 않은 메뉴는 표시하지 않음 (인기 메뉴 추천 제거)
            # if not recommended_items and menus: # 추천 메뉴 없고 DB 메뉴 있을 때 인기 메뉴 추천
            #     popular_menus = menu_crud.get_popular(db=db, limit=3)
            #     recommended_items = [
            #         {
            #             "id": menu.id,
            #             "name": menu.name,
            #             "description": menu.description,
            #             "price": menu.price,
            #             "image_url": menu.image_url
            #         }
            #         for menu in popular_menus
            #     ]
        
        return ChatResponse(
            response_sentences=response_sentences,
            recommendations=recommended_items,
            session_id=session_id,
            message_type=message_type
        )
            
    except HTTPException as e: # 이미 HTTPException인 경우 그대로 raise
        raise e
    except Exception as e:
        print(f"Error in chat endpoint: {type(e).__name__} - {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="채팅 처리 중 오류가 발생했습니다. 서버 로그를 확인해주세요."
        )

@router.get("/history/{session_id}")
def get_chat_history(session_id: str):
    """
    특정 세션의 채팅 기록을 가져옵니다.
    """
    history = get_session_history(session_id)
    if not history:
        raise HTTPException(
            status_code=404,
            detail="세션을 찾을 수 없습니다."
        )
    
    return {"history": history, "session_id": session_id}

@router.delete("/history/{session_id}")
def delete_chat_history(session_id: str):
    """
    특정 세션의 채팅 기록을 삭제합니다.
    """
    success = clear_session(session_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="세션을 찾을 수 없습니다."
        )
    
    return {"message": "채팅 기록이 삭제되었습니다.", "session_id": session_id} 

@router.post("/stream")
async def chat_stream_endpoint(
    request: ChatMessage,
    db: Session = Depends(get_db)
):
    """새로운 streaming chat API"""
    try:
        # 모든 메뉴 조회
        menus = db.query(Menu).all()
        
        # 스트리밍 응답 생성
        async def generate_stream():
            try:
                async for chunk in generate_chat_stream(
                    user_message=request.message,
                    session_id=request.session_id,
                    menus=menus
                ):
                    # chunk는 이미 SSE 형식이므로 그대로 yield
                    yield chunk
            except Exception as e:
                error_chunk = {
                    "type": "error",
                    "content": f"스트리밍 중 오류가 발생했습니다: {str(e)}",
                    "finished": True
                }
                yield f"data: {json.dumps(error_chunk, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            }
        )
    except Exception as e:
        print(f"Chat Stream API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 