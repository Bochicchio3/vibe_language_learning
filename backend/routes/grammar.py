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


from models.grammar import (
    ConceptCard, ConceptCardRequest,
    ExercisePack, ExerciseRequest,
    ContextCard, ContextCardRequest
)

from services.queue import (
    generate_concept_card_task,
    generate_exercises_task,
    generate_context_card_task,
    get_task_status
)

class JobResponse(BaseModel):
    job_id: str
    status: str

@router.post("/concept", response_model=JobResponse)
async def generate_concept_card(request: ConceptCardRequest):
    """
    Generate a grammar concept card (Async)
    """
    task = generate_concept_card_task.delay(
        topic=request.topic,
        level=request.level,
        model=request.model,
        target_language=request.target_language
    )
    return {"job_id": task.id, "status": "pending"}

@router.post("/exercises", response_model=JobResponse)
async def generate_exercises(request: ExerciseRequest):
    """
    Generate grammar exercises (Async)
    """
    task = generate_exercises_task.delay(
        topic=request.topic,
        level=request.level,
        model=request.model,
        target_language=request.target_language
    )
    return {"job_id": task.id, "status": "pending"}

@router.post("/context", response_model=JobResponse)
async def generate_context_card(request: ContextCardRequest):
    """
    Generate a context card (Async)
    """
    task = generate_context_card_task.delay(
        topic=request.topic,
        level=request.level,
        model=request.model,
        target_language=request.target_language
    )
    return {"job_id": task.id, "status": "pending"}

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    """
    Get status of a background job
    """
    return get_task_status(job_id)


