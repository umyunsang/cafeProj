from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.menu import Menu
from app.schemas.chat import ChatRequest, ChatResponse
from .openai_client import generate_chat_response_optimized, generate_chat_stream

router = APIRouter()

@router.post("/")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """AI 챗봇과 대화합니다. (최적화 버전)"""
    try:
        # 메뉴 목록 가져오기 (활성화된 메뉴만)
        menus = db.query(Menu).filter(Menu.is_available == True).limit(15).all()  # 메뉴 수 제한
        
        # 최적화된 AI 응답 생성
        chat_response = await generate_chat_response_optimized(
            user_message=request.message,
            session_id=request.session_id,
            menus=menus
        )
        
        # 추천된 메뉴 상세 정보 가져오기
        recommendations = []
        if chat_response["recommended_ids"]:
            recommended_menus = db.query(Menu).filter(
                Menu.id.in_(chat_response["recommended_ids"])
            ).all()
            
            recommendations = [
                {
                    "id": menu.id,
                    "name": menu.name,
                    "price": menu.price,
                    "description": menu.description,
                    "category": menu.category,
                    "image_url": menu.image_url
                }
                for menu in recommended_menus
            ]
        
        return ChatResponse(
            response_sentences=chat_response["response_sentences"],
            session_id=chat_response["session_id"],
            recommendations=recommendations,
            message_type=chat_response["message_type"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"챗봇 대화 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 응답을 생성하는 중 오류가 발생했습니다."
        )

@router.post("/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    """스트리밍 방식으로 AI 챗봇과 대화합니다."""
    try:
        # 메뉴 목록 가져오기
        menus = db.query(Menu).filter(Menu.is_available == True).all()
        
        # 스트리밍 응답 생성
        return StreamingResponse(
            generate_chat_stream(
                user_message=request.message,
                session_id=request.session_id,
                menus=menus
            ),
            media_type="text/plain; charset=utf-8",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logging.exception(f"스트리밍 챗봇 대화 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 응답을 생성하는 중 오류가 발생했습니다."
        ) 