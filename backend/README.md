# Vibe Language Learning - Backend API

Python FastAPI backend for the Vibe Language Learning platform.

## Features

- **LLM Integration**: Unified interface for multiple LLM providers (Ollama, OpenAI, Anthropic, Google Gemini) using LiteLLM
- **Document Processing**: PDF/EPUB parsing with Docling for robust text extraction
- **News Fetching**: RSS feed parsing with full article content extraction
- **AI-Powered Features**:
  - Story generation
  - Text simplification
  - Comprehension question generation
  - Writing analysis and correction
  - Chat/conversation practice
  - Grammar explanations

## Prerequisites

- Python 3.10+
- Redis (for Celery task queue)
- Ollama (optional, for local LLM)

## Installation

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server
PORT=8000
DEBUG=True

# CORS (frontend URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Firebase (optional, for user auth)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_PROJECT_ID=your-project-id

# LLM Configuration
DEFAULT_LLM_MODEL=ollama/llama3.2

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434

# OpenAI (optional)
OPENAI_API_KEY=your-key-here

# Redis (for task queue)
REDIS_URL=redis://localhost:6379/0
```

## Running the Server

### Development Mode

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
 
## API Endpoints

### Stories

- `POST /api/stories/generate` - Generate a story
- `POST /api/stories/simplify` - Simplify a story
- `POST /api/stories/questions` - Generate comprehension questions

### News

- `GET /api/news/categories` - Get news categories
- `GET /api/news/{category}` - Get news articles
- `POST /api/news/adapt` - Adapt news to target level

### Chat

- `POST /api/chat/message` - Send chat message
- `POST /api/chat/hint` - Get conversation hints
- `POST /api/chat/analyze-writing` - Analyze writing

## LLM Configuration

### Using Ollama (Local)

1. Install Ollama: https://ollama.ai
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Set in `.env`:
   ```env
   DEFAULT_LLM_MODEL=ollama/llama3.2
   OLLAMA_BASE_URL=http://localhost:11434
   ```

### Using OpenAI

1. Get API key from https://platform.openai.com
2. Set in `.env`:
   ```env
   DEFAULT_LLM_MODEL=gpt-4o-mini
   OPENAI_API_KEY=your-key-here
   ```

### Using Anthropic Claude

1. Get API key from https://console.anthropic.com
2. Set in `.env`:
   ```env
   DEFAULT_LLM_MODEL=claude-3-5-sonnet-20241022
   ANTHROPIC_API_KEY=your-key-here
   ```

## Document Processing

The backend uses **Docling** for PDF/EPUB processing, which provides:
- Better text extraction than pdfjs
- OCR support for scanned PDFs
- Table and image extraction
- Metadata extraction

If Docling is not available, a fallback to PyPDF2 is used.

## Task Queue (Celery)

For background processing (book imports, etc.):

### 1. Start Redis

```bash
redis-server
```

### 2. Start Celery Worker

```bash
celery -A celery_worker worker --loglevel=info
```

## Project Structure

```
backend/
├── main.py                 # FastAPI application
├── config.py               # Configuration
├── requirements.txt        # Dependencies
├── .env.example            # Environment template
├── services/               # Business logic
│   ├── llm.py              # LLM service (LiteLLM)
│   ├── document_processor.py  # PDF/EPUB processing
│   ├── news_parser.py      # News fetching
│   └── firebase_service.py # Firebase integration
├── routes/                 # API routes
│   ├── stories.py
│   ├── news.py
│   ├── chat.py
│   ├── books.py
│   └── grammar.py
└── tests/                  # Tests
```

## Testing

Run tests with pytest:

```bash
pytest tests/
```

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t vibe-backend .
docker run -p 8000:8000 --env-file .env vibe-backend
```

### Cloud Platforms

The backend can be deployed to:
- **Railway**: https://railway.app
- **Render**: https://render.com
- **Google Cloud Run**
- **AWS Lambda** (with Mangum adapter)

## Troubleshooting

### Ollama Connection Issues

If you get connection errors with Ollama:

1. Check Ollama is running:
   ```bash
   ollama list
   ```

2. Verify the base URL in `.env`:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   ```

3. Test the connection:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Docling Installation Issues

If Docling fails to install:

1. Install system dependencies (macOS):
   ```bash
   brew install poppler tesseract
   ```

2. Install system dependencies (Ubuntu):
   ```bash
   sudo apt-get install poppler-utils tesseract-ocr
   ```

3. Reinstall Docling:
   ```bash
   pip install --upgrade docling
   ```

## License

MIT
