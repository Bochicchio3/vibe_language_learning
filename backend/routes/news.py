"""
News API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.news_parser import NewsParser
from services.llm import LLMService

router = APIRouter()


class AdaptNewsRequest(BaseModel):
    content: str
    level: str
    model: Optional[str] = None
    target_language: str = "German"


@router.get("/categories")
async def get_categories():
    """Get available news categories"""
    try:
        categories = NewsParser.get_categories()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category}")
async def get_news(category: str, limit: int = 10):
    """Get news articles for a category"""
    try:
        articles = NewsParser.fetch_news(category, limit)
        return {"articles": articles}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adapt")
async def adapt_news(request: AdaptNewsRequest):
    """Adapt a news article to a target level"""
    try:
        result = await LLMService.adapt_content(
            text=request.content,
            level=request.level,
            model=request.model,
            target_language=request.target_language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
