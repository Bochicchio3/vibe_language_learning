"""
Grammar API routes
Handles grammar explanations and exercises
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.llm import LLMService

router = APIRouter()


class ExplainTextRequest(BaseModel):
    text: str
    template: str = "sentence"  # grammar, sentence, word
    context: str = ""
    model: Optional[str] = None
    target_language: str = "German"


@router.post("/explain")
async def explain_text(request: ExplainTextRequest):
    """
    Explain grammar, sentence, or word
    
    Templates:
    - grammar: Analyze grammatical structures
    - sentence: Translate and break down sentence
    - word: Explain word with examples
    """
    try:
        result = await LLMService.explain_text(
            text=request.text,
            template=request.template,
            context=request.context,
            model=request.model,
            target_language=request.target_language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Note: Grammar exercise generation can be added here
# For now, the frontend uses grammarGenerator.js
# This can be migrated to the backend in a future update
