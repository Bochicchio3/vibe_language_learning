from pydantic import BaseModel
from typing import List, Optional, Union

class TableRow(BaseModel):
    headers: List[str]
    rows: List[List[str]]

class Example(BaseModel):
    german: str
    english: str
    note: Optional[str] = None

class Mistake(BaseModel):
    mistake: str
    correction: str
    explanation: str

class QuizItem(BaseModel):
    question: str
    options: List[str]
    correct: int

class ConceptCard(BaseModel):
    meta: dict
    overview: str
    form: Optional[dict] = None # Can be a table or other structure
    usage: List[str]
    examples: List[Example]
    common_mistakes: List[Mistake]
    mini_quiz: List[QuizItem]

class ConceptCardRequest(BaseModel):
    topic: str
    level: str
    model: Optional[str] = None
    target_language: str = "German"

class BaseExercise(BaseModel):
    type: str
    explanation: Optional[str] = None

class MultipleChoiceExercise(BaseExercise):
    type: str = "multiple_choice"
    question: str
    options: List[str]
    correct: int

class GapFillExercise(BaseExercise):
    type: str = "gap_fill"
    question: str
    answer: str
    hint: Optional[str] = None

class ReorderExercise(BaseExercise):
    type: str = "reorder"
    segments: List[str]
    correct_order: List[int]

class ExercisePack(BaseModel):
    exercises: List[Union[MultipleChoiceExercise, GapFillExercise, ReorderExercise]]

class ExerciseRequest(BaseModel):
    topic: str
    level: str
    model: Optional[str] = None
    target_language: str = "German"

class GlossaryItem(BaseModel):
    word: str
    definition: str

class GrammarSpot(BaseModel):
    phrase: str
    rule: str

class ContextCard(BaseModel):
    title: str
    text: str
    glossary: List[GlossaryItem]
    grammar_spotting: List[GrammarSpot]

class ContextCardRequest(BaseModel):
    topic: str
    level: str
    model: Optional[str] = None
    target_language: str = "German"

class GrammarLesson(BaseModel):
    id: str
    topic: str
    level: str
    concept: ConceptCard
    context: Optional[ContextCard] = None
    exercises: Optional[List[Union[MultipleChoiceExercise, GapFillExercise, ReorderExercise]]] = None
    created_at: Optional[str] = None # ISO format
    updated_at: Optional[str] = None

class GrammarProgress(BaseModel):
    id: str
    is_completed: bool = False
    score: int = 0
    exercises_completed: int = 0
    total_exercises: int = 0
    last_attempt_at: Optional[str] = None
    history: List[int] = []



