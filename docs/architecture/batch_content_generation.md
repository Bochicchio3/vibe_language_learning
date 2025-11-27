# Batch Content Generation & Firebase Integration

This document outlines the architecture and workflow for the batch generation of grammar content and its integration with Firebase Firestore.

## Overview

The system allows for the automated, bulk generation of grammar learning content (Concept Cards, Context Cards, and Exercises) for various CEFR levels (A1-C2). It uses a two-phase approach: **Discovery** and **Generation**.

## Components

### 1. Scripts

*   **`backend/scripts/generate_batch_grammar.py`**: The main CLI script for managing the workflow.
    *   **Discovery Mode (`--discover`)**: Scans all CEFR levels and asks the LLM to generate a curriculum manifest.
    *   **Generation Mode (`--generate`)**: Reads the manifest and generates full content for each topic.
    *   **Test Mode (`--test_mode`)**: (Legacy) Generates content for a hardcoded set of test topics.
*   **`backend/scripts/seed_grammar.py`**: A utility script for seeding a single grammar topic (useful for development/testing).

### 2. LLM Service (`backend/services/llm.py`)

The `LLMService` has been extended with several methods to support this workflow:

*   **`generate_curriculum(level)`**: Asks the LLM to list key grammar topics for a given level.
*   **`generate_concept_card(topic, level)`**: Generates the core grammatical concept explanation.
*   **`generate_context_card(topic, level)`**: Generates a short story and glossary illustrating the concept.
*   **`generate_exercises(topic, level)`**: Generates interactive exercises (Multiple Choice, Gap Fill, Reorder).
*   **`_ensure_model_prefix(model)`**: Helper to ensure correct model naming for Ollama.

### 3. Firebase Firestore

Content is stored in the `users/{userId}/grammar` collection.

*   **Document ID**: Deterministic slug based on title and level (e.g., `present_tense_verbs_a1`).
*   **Data Structure**:
    ```json
    {
      "id": "present_tense_verbs_a1",
      "title": "Present Tense Verbs",
      "level": "A1",
      "topic": "verbConjugation",
      "content": {
        "overview": "...",
        "form": { ... }, // Concept Card data
        "context": { ... }, // Context Card data
        "exercises": [ ... ] // Array of exercises
      },
      "createdAt": "ISO Timestamp",
      "lastUpdated": "ISO Timestamp"
    }
    ```
*   **Sanitization**: The script automatically converts nested lists (e.g., in tables) to dictionaries to comply with Firestore's nesting limitations.

## Workflow

### Phase 1: Discovery
1.  Run `python scripts/generate_batch_grammar.py --discover`.
2.  The script iterates through levels A1-C2.
3.  It generates a `curriculum_manifest.json` file containing a list of all topics to be generated.
4.  **Review**: The user can manually edit this JSON file to curate the curriculum before generation.

### Phase 2: Generation
1.  Run `python scripts/generate_batch_grammar.py --generate --user_id "USER_ID"`.
2.  The script reads `curriculum_manifest.json`.
3.  For each topic, it calls the LLM to generate the Concept, Context, and Exercises.
4.  It saves the result to Firestore.
5.  **Monitoring**: Output can be redirected to a log file (e.g., `generation.log`) for monitoring.

## Configuration

*   **Model**: Defaults to `ollama/gemma3:27b` (configurable via `config.py` or CLI args).
*   **Ollama**: Must be running and accessible (e.g., via `host.docker.internal`).

## Troubleshooting

*   **Pydantic Warnings**: You may see `PydanticSerializationUnexpectedValue` warnings in the logs. These are generally benign and caused by minor schema mismatches in the `litellm` library's internal validation of Ollama responses. The script is robust enough to handle the actual content despite these warnings.
