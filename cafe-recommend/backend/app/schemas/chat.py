from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    content: str

class ChatRequest(BaseModel):
    message: str

class ConversationMessage(BaseModel):
    role: str  # "user" 또는 "assistant"
    content: str

class RecommendationRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ConversationMessage]] = []

class ChatResponse(BaseModel):
    response: str
    recommendations: Optional[List[Dict[str, Any]]] = None
    actions: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "response": "안녕하세요! 무엇을 도와드릴까요?",
                "recommendations": [
                    {"menu_id": 1, "name": "아메리카노", "reason": "오늘의 추천 메뉴입니다."}
                ],
                "actions": ["주문하기", "메뉴 더 보기"]
            }
        } 