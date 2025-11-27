# Grammar Feature Implementation Plan

This document breaks down the "Grammar Feature" into manageable chunks using the **Prompt-First** workflow. We will tackle this one component at a time.

## 1. The Data Structure (The "Contract")

Before writing code, we define exactly what the AI should return for each component.

### A. Concept Card (The "Theory")
**Goal**: Explain the rule clearly.

**JSON Contract**:
```json
{
  "meta": {
    "topic": "Two-Way Prepositions",
    "level": "B1"
  },
  "overview": "Two-way prepositions take either the accusative or dative case depending on movement.",
  "form": {
    "type": "table",
    "headers": ["Preposition", "Case", "Meaning"],
    "rows": [
      ["in", "Dative", "Location (wo?)"],
      ["in", "Accusative", "Direction (wohin?)"]
    ]
  },
  "usage": [
    "Use Dative for static location (Wo?)",
    "Use Accusative for movement towards a goal (Wohin?)"
  ],
  "examples": [
    { "german": "Ich bin im Park.", "english": "I am in the park.", "note": "Dative (Location)" },
    { "german": "Ich gehe in den Park.", "english": "I am going into the park.", "note": "Accusative (Movement)" }
  ],
  "common_mistakes": [
    { "mistake": "Ich gehe im Park.", "correction": "Ich gehe in den Park.", "explanation": "'Gehen' implies movement." }
  ],
  "mini_quiz": [
    { "question": "Wo bist du?", "options": ["Im Kino", "Ins Kino"], "correct": 0 }
  ]
}
```

### B. Exercise Pack (The "Practice")
**Goal**: Generate drills based on the topic.

**JSON Contract**:
```json
{
  "exercises": [
    {
      "type": "multiple_choice",
      "question": "Er legt das Buch ___ den Tisch.",
      "options": ["auf", "über", "unter"],
      "correct": 0,
      "explanation": "Movement onto a surface = auf + Accusative."
    },
    {
      "type": "gap_fill",
      "question": "Wir gehen ___ (in) das Haus.",
      "answer": "in",
      "hint": "Accusative movement"
    },
    {
      "type": "reorder",
      "segments": ["Ich", "lege", "das", "Buch", "auf", "den", "Tisch"],
      "correct_order": [0, 1, 2, 3, 4, 5, 6]
    }
  ]
}
```

### C. Context Card (The "Real World")
**Goal**: See the grammar in action.

**JSON Contract**:
```json
{
  "title": "Ein Tag im Zoo",
  "text": "Heute gehen wir in den Zoo...",
  "glossary": [
    { "word": "der Zoo", "definition": "the zoo" }
  ],
  "grammar_spotting": [
    { "phrase": "in den Zoo", "rule": "Accusative (Wohin?)" }
  ]
}
```

---

## 2. The Prompts (The "Core")

These are the instructions we will send to the LLM.

### Prompt: Generate Concept Card
```text
You are an expert German teacher. Create a "Concept Card" for the grammar topic: "{topic}" (Level {level}).

Return ONLY valid JSON with this structure:
{
  "overview": "2-3 simple sentences explaining the concept",
  "form": { "type": "table", "headers": [...], "rows": [...] },
  "usage": ["Bullet point 1", "Bullet point 2"],
  "examples": [{ "german": "...", "english": "...", "note": "..." }],
  "common_mistakes": [{ "mistake": "...", "correction": "...", "explanation": "..." }],
  "mini_quiz": [{ "question": "...", "options": [...], "correct": index }]
}
```

### Prompt: Generate Exercises
```text
You are an expert German teacher. Create 5 exercises for the topic: "{topic}" (Level {level}).
Include a mix of: Multiple Choice, Gap Fill, and Sentence Reordering.

Return ONLY valid JSON:
{
  "exercises": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["..."],
      "correct": 0,
      "explanation": "..."
    },
    ...
  ]
}
```

---

## 3. Implementation Roadmap

Don't do everything at once. Follow this order:

### Step 1: The "Concept" MVP
1.  **Backend**: Implement `POST /api/grammar/concept` using the Concept Card prompt.
2.  **Frontend**: Build a `<ConceptCard data={...} />` component.
3.  **Verify**: Test it with "Present Tense" (A1).

### Step 2: The "Exercise" Engine
1.  **Backend**: Implement `POST /api/grammar/exercises`.
2.  **Frontend**: Build a generic `<ExerciseRenderer type={...} />` that switches between `<MultipleChoice>`, `<GapFill>`, etc.
3.  **Verify**: Test generating exercises for the same topic.

### Step 3: The "Context" Layer
1.  **Backend**: Implement `POST /api/grammar/context`.
2.  **Frontend**: Build a `<StoryReader />` (reuse existing reader components?) that highlights the grammar points.

## 4. Frontend Component Architecture

```
src/components/grammar/
├── GrammarTopicView.jsx       # Main container, fetches data
├── ConceptCard.jsx            # Renders the theory JSON
├── ExerciseDrill.jsx          # Manages the quiz state (score, progress)
├── exercises/                 # Sub-components for specific types
│   ├── MultipleChoice.jsx
│   ├── GapFill.jsx
│   └── Reorder.jsx
└── ContextReader.jsx          # Renders the story with highlights
```
