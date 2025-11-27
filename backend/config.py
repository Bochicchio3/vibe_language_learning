import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    
    # LLM Configuration
    # Default model for story generation, chat, etc.
    DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "ollama/llama3.2")
    
    # Ollama
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # OpenAI (optional)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
    # Anthropic (optional)
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Google Gemini (optional)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # File Upload
    MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 50 * 1024 * 1024))  # 50MB default
    ALLOWED_EXTENSIONS = {"pdf", "epub"}
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Celery / Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
    
    # Document Processing
    CHUNK_TARGET_WORDS = int(os.getenv("CHUNK_TARGET_WORDS", 1500))
    
    # News
    NEWS_CACHE_TTL = int(os.getenv("NEWS_CACHE_TTL", 3600))  # 1 hour

config = Config()
