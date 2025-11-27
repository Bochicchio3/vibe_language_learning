"""
Chat API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from services.llm import LLMService

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    scenario: str = "general"
    model: Optional[str] = None
    target_language: str = "German"


class HintRequest(BaseModel):
    messages: List[Dict[str, str]]
    scenario: str
    model: Optional[str] = None
    target_language: str = "German"


class AnalyzeWritingRequest(BaseModel):
    text: str
    model: Optional[str] = None
    target_language: str = "German"


@router.post("/message")
async def send_message(request: ChatRequest):
    """Send a chat message and get response"""
    try:
        response = await LLMService.chat_response(
            messages=request.messages,
            scenario=request.scenario,
            model=request.model,
            target_language=request.target_language
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hint")
async def get_hint(request: HintRequest):
    """Get conversation hints"""
    try:
        hints = await LLMService.generate_hints(
            messages=request.messages,
            scenario=request.scenario,
            model=request.model,
            target_language=request.target_language
        )
        return {"hints": hints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-writing")
async def analyze_writing(request: AnalyzeWritingRequest):
    """Analyze and correct writing"""
    try:
        result = await LLMService.analyze_writing(
            text=request.text,
            model=request.model,
            target_language=request.target_language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def get_models():
    """Get available LLM models"""
    try:
        models = await LLMService.get_available_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
