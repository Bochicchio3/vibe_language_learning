# Backend Testing Guide

This document outlines how to run tests for the Python backend of the Vibe Language Learning application.

## Prerequisites

Ensure you have the backend dependencies installed:

```bash
cd backend
pip install -r requirements.txt
```

## Running Tests

### Unit Tests

Run all unit tests using `pytest`:

```bash
cd backend
python3 -m pytest tests/
```

### Integration Tests

Integration tests often require external services (like Ollama) or real files.

#### Docling Real PDF Test

To test the document processor with a real PDF file from the `public/samples` directory:

```bash
cd backend
python3 tests/integration/test_docling_real.py
```

This script will:
1. Locate the `Vita_e_avventure_di_Robinson_Crusoè.pdf` sample file.
2. Initialize the `DocumentProcessor` (requires Docling installed).
3. Process the file and output metadata and a text preview.

**Note:** This test requires `docling` to be installed (`pip install docling`).

#### Chat Models Endpoint Test

To verify the chat models endpoint:

```bash
cd backend
python3 -m pytest tests/test_chat_models.py
```

## Test Structure

- `backend/tests/`: Contains all backend tests.
  - `test_*.py`: Unit tests.
  - `integration/`: Integration tests and manual verification scripts.
