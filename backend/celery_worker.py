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
)

if __name__ == '__main__':
    celery_app.start()
