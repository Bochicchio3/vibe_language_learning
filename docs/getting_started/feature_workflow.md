# Feature Development Workflow

Building AI-powered features can feel overwhelming because it involves multiple layers: UI, API, AI Prompts, and Data.

To make this efficient, we recommend a **"Prompt-First"** workflow. This approach tackles the biggest unknown (the AI's behavior) first, then solidifies the data contract, and finally implements the code.

## The 5-Step "Prompt-First" Process

### Phase 1: Content & Prompt Engineering (The "Core")
**Goal**: Verify that the AI can actually do what you want before writing a single line of app code.

1.  **Define the Goal**: e.g., "I want a feature where users practice ordering food."
2.  **Draft the Prompt**: Write the system prompt in a scratchpad.
3.  **Test Manually**: Use a CLI tool or a simple script to send the prompt to Ollama/Gemini.
    *   *Does it stay in character?*
    *   *Is the JSON valid?*
    *   *Is the language level correct?*
4.  **Refine**: Tweak the prompt until the output is consistently good.

### Phase 2: The API Contract (The "Handshake")
**Goal**: Decouple Frontend and Backend work.

Once you know what the AI *can* output, define the exact JSON structure.

*   **Request**: What does the frontend send? (e.g., `{ "scenario": "bakery", "level": "A1" }`)
*   **Response**: What does the backend return?
    ```json
    {
      "ai_message": "Guten Tag! Was darf es sein?",
      "suggested_responses": ["Ich hätte gerne...", "Ein Brötchen, bitte."]
    }
    ```
*   **Action**: Create a Pydantic model in `backend/models/`.

### Phase 3: Backend Implementation
**Goal**: Expose the prompt as an API.

1.  **Create Service Method**: Add a function to `LLMService` that uses your tested prompt and returns the Pydantic model.
2.  **Create Endpoint**: Add a route in `backend/routes/` that calls the service.
3.  **Verify**: Test the endpoint using the Swagger UI (`http://localhost:8000/docs`).

### Phase 4: Frontend Implementation
**Goal**: Build the UI to consume the API.

1.  **Update Client**: Add a function to `src/services/api/client.js` (or a specific feature file) that calls your new endpoint.
2.  **Build UI**: Create the React component. Since you verified the API in Phase 3, you don't need to worry about backend bugs here.
3.  **Mocking (Optional)**: If the backend isn't ready, you can just return the example JSON from Phase 2 in your client function to start UI work immediately.

### Phase 5: Verification & Polish
**Goal**: Ensure the end-to-end experience is smooth.

1.  **Integration Test**: Click through the feature in the app.
2.  **Edge Cases**: What happens if the AI returns invalid JSON? (The backend should handle this retry logic, so the frontend just sees an error or success).
3.  **Visual Polish**: Add loading states and animations.

---

## Example: Adding "Vocab Quiz"

1.  **Prompt**: You test a prompt that takes a word and returns 3 multiple-choice options. It works.
2.  **Contract**:
    ```json
    { "question": "Haus", "options": ["House", "Mouse", "Car"], "correct": 0 }
    ```
3.  **Backend**:
    *   `class QuizItem(BaseModel): ...`
    *   `@app.post("/api/quiz")` -> returns `QuizItem`
4.  **Frontend**:
    *   `api.getQuiz("Haus")`
    *   `<QuizComponent data={data} />`

## Why this works
*   **Reduces Context Switching**: You solve the AI problem, then the Data problem, then the Code problem.
*   **Fails Fast**: If the AI can't generate good quizzes, you find out in Phase 1, not after building the whole UI.
*   **Parallel Work**: Once Phase 2 (Contract) is done, one person can build the backend while another builds the frontend.

## Real-World Example: Grammar Feature

Here is how we applied this workflow to build the **Grammar Feature** (Concept Cards, Exercises, Context Stories):

1.  **Define the "Contract" (Data Structure)**:
    *   We defined the exact JSON structure for three distinct components:
        *   **Concept Card**: Theory, tables, and examples.
        *   **Exercise Pack**: Polymorphic exercises (Multiple Choice, Gap Fill, Reorder).
        *   **Context Card**: A short story with a glossary and grammar spotting.
    *   These were codified immediately into Pydantic models in `backend/models/grammar.py`.

2.  **Engineer the Prompts**:
    *   We designed specific system prompts for each component.
    *   **Crucial Step**: We verified these prompts using simple Python scripts (`verify_exercises.py`, `verify_context.py`) hitting the backend *before* any frontend code existed. This helped us catch issues like `litellm` model naming and JSON parsing errors early.

3.  **Backend Implementation**:
    *   Implemented `LLMService` methods (`generate_exercises`, `generate_context_card`).
    *   Exposed endpoints (`/exercises`, `/context`) that return the Pydantic models.
    *   Patched the service to handle specific model quirks (e.g., stripping `<think>` tags from reasoning models).

4.  **Frontend Implementation**:
    *   Built the React components (`GrammarLesson`, `ContextCard`, `ExerciseRenderer`).
    *   Used a **Polymorphic** approach for exercises: a single `ExerciseRenderer` component dynamically chooses the correct sub-component (`MultipleChoice`, `GapFill`) based on the data type field.
    *   Implemented "lazy loading" for the Context Card to optimize performance.

5.  **Integration**:
    *   Combined everything into the `GrammarView`.
    *   The frontend simply calls the API and renders the data, trusting the contract defined in Step 1.
