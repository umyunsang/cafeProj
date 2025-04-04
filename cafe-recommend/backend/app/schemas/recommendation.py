from pydantic import BaseModel
from typing import List, Optional

class Recommendation(BaseModel):
    id: str
    name: str
    description: str
    image_url: Optional[str] = None

class MenuRecommendation(BaseModel):
    menu_id: str
    name: str
    description: str
    reason: str
    score: float

class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation]
    analysis: Optional[str] = None

    class Config:
        from_attributes = True 