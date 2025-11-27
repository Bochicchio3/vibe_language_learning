"""
Celery Worker
Run with: celery -A celery_worker worker --loglevel=info
"""

from services.queue import celery_app

# Import tasks to register them
from services.queue import (
    process_book_upload,
    adapt_chapter,
    extract_vocabulary,
    test_task,
    generate_concept_card_task,
    generate_exercises_task,
    generate_context_card_task,
)

if __name__ == '__main__':
    celery_app.start()
