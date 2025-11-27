"""
Books API routes
Handles book upload and processing
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import uuid

from config import config
from services.queue import process_book_upload, get_task_status

router = APIRouter()


class BookProcessingStatus(BaseModel):
    book_id: str
    status: str
    current_chapter: Optional[int] = None
    total_chapters: Optional[int] = None
    progress: float = 0


@router.post("/upload")
async def upload_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    level: str = Form(...),
    should_adapt: bool = Form(True),
    model: Optional[str] = Form(None),
    target_language: str = Form("German"),
    user_id: str = Form(...)  # TODO: Get from auth token
):
    """
    Upload a book for processing
    
    Note: This is a placeholder implementation.
    In production, this would:
    1. Validate the file
    2. Save to storage
    3. Queue for background processing
    4. Return job ID for status polling
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.pdf', '.epub')):
            raise HTTPException(status_code=400, detail="Only PDF and EPUB files are supported")
        
        # Check file size
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB
        while chunk := await file.read(chunk_size):
            file_size += len(chunk)
            if file_size > config.MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=413, detail="File too large")
        
        # Reset file pointer
        await file.seek(0)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(config.UPLOAD_DIR, unique_filename)
        
        # Save file
        os.makedirs(config.UPLOAD_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            while chunk := await file.read(chunk_size):
                f.write(chunk)
        
        # Generate book ID
        book_id = str(uuid.uuid4())
        
        # Queue for processing
        task = process_book_upload.delay(
            user_id=user_id,
            book_id=book_id,
            file_path=file_path,
            level=level,
            should_adapt=should_adapt
        )
        
        return {
            "book_id": book_id,
            "task_id": task.id,
            "status": "queued",
            "message": "Book uploaded successfully and queued for processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{book_id}/status")
async def get_processing_status(book_id: str):
    """
    Get book processing status
    
    Note: This is a placeholder. In production, this would:
    1. Check Celery task status
    2. Check Firestore for current processing chapter
    3. Return detailed progress
    """
    # TODO: Implement actual status checking
    return {
        "book_id": book_id,
        "status": "processing",
        "current_chapter": 1,
        "total_chapters": 10,
        "progress": 10.0,
        "message": "Processing in progress"
    }


@router.post("/{book_id}/cancel")
async def cancel_processing(book_id: str):
    """
    Cancel book processing
    
    Note: This is a placeholder. In production, this would:
    1. Revoke Celery task
    2. Update Firestore status
    3. Clean up temporary files
    """
    # TODO: Implement actual cancellation
    return {
        "book_id": book_id,
        "status": "cancelled",
        "message": "Processing cancelled successfully"
    }
