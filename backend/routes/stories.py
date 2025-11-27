"""
Stories API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.llm import LLMService

router = APIRouter()


class GenerateStoryRequest(BaseModel):
    topic: str
    level: str
    length: str = "Medium"
    theme: str = ""
    model: Optional[str] = None
    target_language: str = "German"


class SimplifyStoryRequest(BaseModel):
    text: str
    level: str
    model: Optional[str] = None
    target_language: str = "German"


class GenerateQuestionsRequest(BaseModel):
    text: str
    count: int = 3
    model: Optional[str] = None
    target_language: str = "German"


@router.post("/generate")
async def generate_story(request: GenerateStoryRequest):
    """Generate a language learning story"""
    try:
        result = await LLMService.generate_story(
            topic=request.topic,
            level=request.level,
            length=request.length,
            theme=request.theme,
            model=request.model,
            target_language=request.target_language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simplify")
async def simplify_story(request: SimplifyStoryRequest):
    """Simplify a story to a target level"""
    try:
        result = await LLMService.simplify_text(
            text=request.text,
            level=request.level,
            model=request.model,
            target_language=request.target_language
        )
        return {"simplified_text": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questions")
async def generate_questions(request: GenerateQuestionsRequest):
    """Generate comprehension questions for a story"""
    try:
        result = await LLMService.generate_comprehension_questions(
            text=request.text,
            count=request.count,
            model=request.model,
            target_language=request.target_language
        )
        return {"questions": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
