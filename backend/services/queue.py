"""
Celery Task Queue
Handles background processing for book imports, content adaptation, etc.
"""

from celery import Celery
from config import config

# Initialize Celery
celery_app = Celery(
    'vibe_language_learning',
    broker=config.CELERY_BROKER_URL,
    backend=config.CELERY_RESULT_BACKEND
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)


# Task definitions

@celery_app.task(name='process_book_upload')
def process_book_upload(user_id: str, book_id: str, file_path: str, level: str, should_adapt: bool):
    """
    Process uploaded book in background
    
    Args:
        user_id: User ID
        book_id: Book ID
        file_path: Path to uploaded file
        level: Target CEFR level
        should_adapt: Whether to adapt content
    """
    from services.document_processor import DocumentProcessor
    from services.llm import LLMService
    from services.firebase_service import get_firestore_client
    import asyncio
    
    try:
        # Process document
        processor = DocumentProcessor()
        result = processor.process_document(file_path)
        
        # Chunk text
        chunks = processor.chunk_text(result['text'])
        
        # Save to Firestore
        db = get_firestore_client()
        if db is None:
            raise Exception("Firestore not available")
        
        book_ref = db.collection('users').document(user_id).collection('books').document(book_id)
        
        # Update with chunks
        book_ref.update({
            'chapters': [{'title': c['title'], 'content': c['content'], 'isAdapted': False} for c in chunks],
            'totalChapters': len(chunks),
            'metadata': result['metadata'],
        })
        
        # Adapt chapters if requested
        if should_adapt:
            for i, chunk in enumerate(chunks):
                # Update processing status
                book_ref.update({'currentProcessingChapter': i + 1})
                
                # Adapt content
                adapted = asyncio.run(LLMService.adapt_content(
                    text=chunk['content'],
                    level=level,
                    target_language='German'
                ))
                
                # Update chapter
                chapters = book_ref.get().to_dict()['chapters']
                chapters[i]['content'] = adapted['content']
                chapters[i]['isAdapted'] = True
                book_ref.update({'chapters': chapters})
            
            # Mark as complete
            book_ref.update({'currentProcessingChapter': None})
        
        return {'status': 'success', 'book_id': book_id}
        
    except Exception as e:
        print(f"Book processing failed: {str(e)}")
        return {'status': 'error', 'error': str(e)}


@celery_app.task(name='adapt_chapter')
def adapt_chapter(user_id: str, book_id: str, chapter_index: int, content: str, level: str):
    """
    Adapt a single chapter
    
    Args:
        user_id: User ID
        book_id: Book ID
        chapter_index: Chapter index
        content: Chapter content
        level: Target CEFR level
    """
    from services.llm import LLMService
    from services.firebase_service import get_firestore_client
    import asyncio
    
    try:
        # Adapt content
        adapted = asyncio.run(LLMService.adapt_content(
            text=content,
            level=level,
            target_language='German'
        ))
        
        # Update in Firestore
        db = get_firestore_client()
        if db is None:
            raise Exception("Firestore not available")
        
        book_ref = db.collection('users').document(user_id).collection('books').document(book_id)
        chapters = book_ref.get().to_dict()['chapters']
        chapters[chapter_index]['content'] = adapted['content']
        chapters[chapter_index]['isAdapted'] = True
        book_ref.update({'chapters': chapters})
        
        return {'status': 'success', 'chapter_index': chapter_index}
        
    except Exception as e:
        print(f"Chapter adaptation failed: {str(e)}")
        return {'status': 'error', 'error': str(e)}


@celery_app.task(name='extract_vocabulary')
def extract_vocabulary(user_id: str, source_id: str, source_type: str, text: str):
    """
    Extract vocabulary from text
    
    Args:
        user_id: User ID
        source_id: Source ID (story or book)
        source_type: Source type ('story' or 'book')
        text: Text to extract from
    """
    # TODO: Implement vocabulary extraction
    # This would use NLP to extract important words and create a deck
    pass


# Helper function to get task status
def get_task_status(task_id: str):
    """Get status of a Celery task"""
    task = celery_app.AsyncResult(task_id)
    return {
        'task_id': task_id,
        'status': task.state,
        'result': task.result if task.ready() else None,
    }

@celery_app.task(name='test_task')
def test_task(word: str):
    """Simple test task"""
    import time
    time.sleep(2)  # Simulate work
    return f"Processed: {word}"


@celery_app.task(name='generate_concept_card_task')
def generate_concept_card_task(topic: str, level: str, model: str = None, target_language: str = "German"):
    """Generate concept card in background"""
    from services.llm import LLMService
    import asyncio
    
    try:
        result = asyncio.run(LLMService.generate_concept_card(
            topic=topic,
            level=level,
            model=model,
            target_language=target_language
        ))
        return result
    except Exception as e:
        return {'error': str(e)}


@celery_app.task(name='generate_exercises_task')
def generate_exercises_task(topic: str, level: str, model: str = None, target_language: str = "German"):
    """Generate exercises in background"""
    from services.llm import LLMService
    import asyncio
    
    try:
        result = asyncio.run(LLMService.generate_exercises(
            topic=topic,
            level=level,
            model=model,
            target_language=target_language
        ))
        return result
    except Exception as e:
        return {'error': str(e)}


@celery_app.task(name='generate_context_card_task')
def generate_context_card_task(topic: str, level: str, model: str = None, target_language: str = "German"):
    """Generate context card in background"""
    from services.llm import LLMService
    import asyncio
    
    try:
        result = asyncio.run(LLMService.generate_context_card(
            topic=topic,
            level=level,
            model=model,
            target_language=target_language
        ))
        return result
    except Exception as e:
        return {'error': str(e)}


