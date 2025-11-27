from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os

from config import config

# Import routes
from routes import stories, news, chat, books, grammar

app = FastAPI(
    title="Vibe Language Learning API",
    description="Backend API for language learning platform",
    version="1.0.0",
    debug=config.DEBUG
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {"status": "ok", "message": "Vibe Language Learning API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "api": "running",
            # Add more service checks here
        }
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )

# Register routes
app.include_router(stories.router, prefix="/api/stories", tags=["stories"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(books.router, prefix="/api/books", tags=["books"])
app.include_router(grammar.router, prefix="/api/grammar", tags=["grammar"])

if __name__ == "__main__":
    # Create upload directory if it doesn't exist
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG
    )
