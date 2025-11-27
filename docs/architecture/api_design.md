# API Design & Architecture

This document outlines the design principles, structure, and interaction patterns for the Vibe Language Learning API.

## 1. Design Principles

We follow **RESTful** design principles to ensure the API is predictable, scalable, and easy to use.

*   **Resource-Oriented**: URLs represent resources (nouns), not actions (verbs).
    *   ✅ `GET /api/stories` (Get all stories)
    *   ❌ `GET /api/getStories`
*   **Standard HTTP Methods**: We use HTTP verbs to define the action.
    *   `GET`: Retrieve data.
    *   `POST`: Create new data.
    *   `PUT`/`PATCH`: Update existing data.
    *   `DELETE`: Remove data.
*   **Stateless**: Each request contains all necessary information (auth tokens) to be processed. The server does not store session state between requests.
*   **JSON Everywhere**: Requests and responses are always valid JSON.

## 2. Server-Side Structure (FastAPI)

The backend is organized to separate concerns: **Routing**, **Business Logic**, and **Data Models**.

### Directory Structure
```
backend/
├── main.py                 # Entry point, app initialization, CORS
├── routes/                 # "Controllers" - Handle HTTP requests
│   ├── stories.py          # Endpoints for /api/stories
│   ├── chat.py             # Endpoints for /api/chat
│   └── ...
├── services/               # "Business Logic" - Complex processing
│   ├── llm.py              # AI generation logic
│   ├── db.py               # Database interactions
│   └── ...
└── models/                 # "Schemas" - Pydantic data validation
    ├── story.py            # Request/Response schemas for stories
    └── ...
```

### The Flow of a Request
1.  **Request**: `POST /api/stories/generate` arrives at `main.py`.
2.  **Router**: `routes/stories.py` matches the URL and method.
3.  **Validation**: FastAPI validates the JSON body against a Pydantic model (e.g., `StoryGenerationRequest`).
4.  **Service**: The route calls `LLMService.generate_story()`.
5.  **Response**: The service returns data, which FastAPI serializes to JSON and sends back with a `200 OK` status.

## 3. Client-Side Structure (React)

The frontend uses a **Service Layer** pattern to abstract API calls from UI components.

### Directory Structure
```
src/
├── services/
│   ├── api/
│   │   ├── client.js       # Base HTTP client (Axios/Fetch wrapper)
│   │   ├── stories.js      # Story-related API calls
│   │   └── chat.js         # Chat-related API calls
│   └── ...
└── components/             # UI Components (call services, never fetch directly)
```

### Base Client (`client.js`)
This is the single most important file for API interactions. It handles:
*   **Base URL**: Configures the API root (e.g., `/api` or `http://localhost:8000`).
*   **Authentication**: Automatically attaches the Firebase ID Token to the `Authorization` header of every request.
*   **Error Handling**: Global error interception (e.g., logging out on 401).

### Example: Calling the API
**`src/services/api/stories.js`**:
```javascript
import client from './client';

export const generateStory = async (topic, level) => {
  // Clean, simple call. Auth is handled automatically.
  return client.post('/stories/generate', { topic, level });
};
```

**`src/components/StoryGenerator.jsx`**:
```jsx
import { generateStory } from '../services/api/stories';

const handleGenerate = async () => {
  try {
    const story = await generateStory('Travel', 'B1');
    setStory(story);
  } catch (error) {
    showError('Failed to generate story');
  }
};
```

## 4. Best Practices Checklist

When adding a new feature, follow this checklist:

### ✅ URL Naming
*   Use plural nouns for collections: `/api/books`, not `/api/book`.
*   Use IDs for specific items: `/api/books/{id}`.
*   Use sub-resources for relationships: `/api/books/{id}/chapters`.

### ✅ Status Codes
*   `200 OK`: Success (GET, PUT).
*   `201 Created`: Success (POST resulting in new resource).
*   `204 No Content`: Success (DELETE).
*   `400 Bad Request`: Invalid input data.
*   `401 Unauthorized`: Missing or invalid auth token.
*   `403 Forbidden`: Valid token, but not allowed to access this resource.
*   `404 Not Found`: Resource doesn't exist.
*   `500 Internal Server Error`: Server bug.

### ✅ Error Responses
Always return a consistent error format:
```json
{
  "detail": "Description of what went wrong",
  "code": "ERROR_CODE_FOR_FRONTEND"
}
```
