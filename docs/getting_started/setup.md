# Project Setup & Development Guide

This guide details how to prepare the environment, run the application, and execute tests for both the frontend and backend of Vibe Language Learning.

## Prerequisites

- **Docker & Docker Compose** (Recommended for backend)
- **Node.js** (v18+)
- **Python** (v3.10+) (If running backend locally)
- **Firebase Project** (Credentials needed)

---

## 1. Environment Configuration

### Backend (.env)
1. Navigate to `backend/`
2. Copy the example file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your API keys (OpenAI, Anthropic, etc.) and Firebase configuration.

### Frontend (Firebase)
1. Ensure `src/firebase.js` is configured with your Firebase project details.

---

## 2. Running the Application

### Option A: Hybrid (Recommended)
Run the backend in Docker and frontend locally. This gives you the best of both worlds: isolated backend services (Redis, Worker) and fast frontend HMR.

**1. Start Backend Services (Docker)**
```bash
# Starts API, Celery Worker, and Redis
docker-compose up --build
```
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

**2. Start Frontend (Local)**
```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```
- App: http://localhost:5173

### Option B: Full Local
Run everything locally. Requires Python and Redis installed on your machine.

**1. Start Redis**
```bash
redis-server
```

**2. Start Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**3. Start Celery Worker**
```bash
cd backend
source venv/bin/activate
celery -A celery_worker worker --loglevel=info
```

**4. Start Frontend**
```bash
npm run dev
```

---

## 3. Running Tests

### Frontend Tests (Vitest)
Unit and component tests for the React application.

```bash
# Run tests once
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Backend Tests (Pytest)
Unit and integration tests for the Python API and services.

**Docker:**
```bash
docker-compose exec backend pytest
```

**Local:**
```bash
cd backend
source venv/bin/activate
pytest
```

### Visual Behavior Tests
Manual verification steps are documented in [`docs/visual_behavior_tests.md`](visual_behavior_tests.md).

---

## 4. Troubleshooting

**Backend Connection Issues**
- Ensure the frontend proxy in `vite.config.js` points to the correct backend URL (default `http://localhost:8000`).
- Check Docker logs: `docker-compose logs -f backend`

**Worker Not Processing**
- Ensure Redis is running.
- Check worker logs: `docker-compose logs -f worker`

**Dependency Issues**
- Frontend: Delete `node_modules` and run `npm install`.
- Backend: Rebuild Docker container `docker-compose up --build`.
