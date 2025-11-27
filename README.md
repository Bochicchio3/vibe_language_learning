# Vibe Language Learning

A comprehensive language learning platform with AI-powered features for reading, vocabulary building, and conversation practice.

## Architecture

This application uses a **client-server architecture**:
- **Frontend**: React SPA with Vite (this directory)
- **Backend**: Python FastAPI server (`backend/` directory)
- **Database**: Firebase Firestore
- **Queue**: Redis + Celery for background processing

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase account
- Ollama (optional, for local AI)

### Quick Start (Docker) - Recommended

Run the entire stack (Frontend, Backend, Database, Queue, AI) with one command:

```bash
docker compose up --build
```

Services available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **Documentation**: http://localhost:8080
- **Flower (Queue Monitor)**: http://localhost:5555
- **Ollama (AI)**: http://localhost:11435

### Manual Setup (Local Dev)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase**:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication and Firestore
   - Copy your Firebase config to `src/firebase.js`

3. **Run development server**:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:5173

### Backend Setup

See [`backend/README.md`](backend/README.md) for detailed backend setup instructions.

Quick start:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python main.py
```

The backend API will be available at http://localhost:8000

## Development

### Running Both Servers

For full functionality, run both frontend and backend:

**Terminal 1 - Frontend**:
```bash
npm run dev
```

**Terminal 2 - Backend**:
```bash
cd backend
source venv/bin/activate
python main.py
```

The frontend automatically proxies `/api` requests to the backend.

### Project Structure

```
vibe_language_learning/
├── src/                    # Frontend source code
│   ├── components/         # React components (organized by type)
│   ├── services/           # Services (DB layer, API layer)
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   └── utils/              # Utility functions
├── backend/                # Python backend
│   ├── services/           # Backend services (LLM, document processing, etc.)
│   ├── routes/             # API routes
│   └── tests/              # Backend tests
├── docs/                   # Documentation
│   ├── repository_structure.md
│   ├── database_schema.md
│   └── visual_behavior_tests.md
└── public/                 # Static assets
```

## Features

### Reading & Comprehension
- Import PDFs and EPUBs
- Click-to-translate words
- Text-to-speech (TTS)
- AI-powered text simplification
- Comprehension questions

### Vocabulary Building
- Automatic vocabulary extraction
- Spaced Repetition System (SRS)
- Flashcard practice
- Vocabulary decks from stories/books

### AI Features
- Story generation (multiple difficulty levels)
- News articles adapted to your level
- Grammar explanations
- Writing correction and feedback
- Conversation practice with AI

### Progress Tracking
- Reading statistics and heatmaps
- Daily streaks
- Level progression
- Time tracking

## Documentation

- **[Repository Structure](docs/repository_structure.md)**: Detailed code organization
- **[Database Schema](docs/database_schema.md)**: Complete database documentation
- **[Visual Tests](docs/visual_behavior_tests.md)**: Manual testing guide
- **[Backend README](backend/README.md)**: Backend setup and API docs

## Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
cd backend
pytest tests/
```

### Visual Behavior Tests
Run the visual test workflow:
```bash
# See docs/visual_behavior_tests.md for manual testing
```

## Building for Production

### Frontend
```bash
npm run build
npm run preview  # Preview production build
```

### Backend
See [`backend/README.md`](backend/README.md) for deployment options.

## Technologies

### Frontend
- React 19
- Vite
- Firebase (Auth & Firestore)
- TailwindCSS
- Framer Motion
- Recharts
- ONNX Runtime (for TTS)

### Backend
- FastAPI
- LiteLLM (unified LLM interface)
- Docling (document processing)
- Firebase Admin SDK
- Celery + Redis (task queue)
- BeautifulSoup (web scraping)

## Contributing

1. Follow the existing code organization
2. Update documentation when adding features
3. Run tests before committing
4. Update `docs/visual_behavior_tests.md` for UI changes

## License

MIT