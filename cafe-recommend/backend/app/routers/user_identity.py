from fastapi import APIRouter, Depends, Request, Response, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid

from app.core.session import SessionData, get_session, session_manager

router = APIRouter(
    prefix="/user",
    tags=["user-identity"],
    responses={404: {"description": "Not found"}},
)

class UserIdentityResponse(BaseModel):
    user_id: str
    is_new: bool

class UserPreferences(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notification_enabled: Optional[bool] = None

@router.get("/identify", response_model=UserIdentityResponse)
async def identify_user(
    request: Request,
    response: Response,
    session: SessionData = Depends(get_session)
):
    """
    사용자 식별자 가져오기 또는 생성하기
    """
    is_new_user = False
    user_id = session.get("user_id")
    
    if not user_id:
        # 새 사용자 ID 생성
        user_id = str(uuid.uuid4())
        session["user_id"] = user_id
        is_new_user = True
    
    # 세션 저장
    session_manager.save_session(response, session)
    
    return UserIdentityResponse(
        user_id=user_id,
        is_new=is_new_user
    )

@router.get("/preferences", response_model=Dict[str, Any])
async def get_user_preferences(
    request: Request,
    session: SessionData = Depends(get_session)
):
    """
    사용자의 저장된 설정 가져오기
    """
    user_id = session.get("user_id")
    if not user_id:
        # 사용자 ID가 없는 경우에도 기본 설정 반환
        return {
            "theme": "light",
            "language": "ko",
            "notification_enabled": True
        }
    
    preferences = session.get("preferences", {})
    # 기본값이 없는 경우 기본 설정 추가
    if not preferences:
        preferences = {
            "theme": "light",
            "language": "ko",
            "notification_enabled": True
        }
    return preferences

@router.post("/preferences")
async def update_user_preferences(
    preferences: UserPreferences,
    request: Request,
    response: Response,
    session: SessionData = Depends(get_session)
):
    """
    사용자 설정 업데이트
    """
    user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 기존 설정 가져오기
    current_prefs = session.get("preferences", {})
    
    # 새 설정으로 업데이트
    updated_prefs = {**current_prefs}
    
    if preferences.theme is not None:
        updated_prefs["theme"] = preferences.theme
    
    if preferences.language is not None:
        updated_prefs["language"] = preferences.language
    
    if preferences.notification_enabled is not None:
        updated_prefs["notification_enabled"] = preferences.notification_enabled
    
    # 세션에 저장
    session["preferences"] = updated_prefs
    session_manager.save_session(response, session)
    
    return {"status": "success", "preferences": updated_prefs}

@router.post("/clear")
async def clear_user_session(
    request: Request,
    response: Response
):
    """
    사용자 세션 초기화
    """
    session_manager.clear_session(response)
    return {"status": "success", "message": "사용자 세션이 초기화되었습니다"} 