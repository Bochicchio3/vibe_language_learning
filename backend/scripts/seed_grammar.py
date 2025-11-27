import argparse
import asyncio
import os
import sys
import json
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.llm import LLMService
from services.firebase_service import get_firestore_client
from config import config

# Mock topic info (usually from frontend constant)
TOPIC_INFO = {
    "id": "articles_a1",
    "title": "Articles (Der, Die, Das)",
    "topic": "articles",
    "description": "Basic gender recognition and nominative case"
}

async def seed_grammar(user_id: str, model: str):
    print(f"🌱 Seeding grammar topic '{TOPIC_INFO['title']}' for user {user_id}...")
    
    db = get_firestore_client()
    if not db:
        print("⚠️ Firestore not available. Cannot seed database.")
        return

    # 1. Generate Concept Card
    print("📚 Generating Concept Card...")
    concept_card = await LLMService.generate_concept_card(
        topic=TOPIC_INFO["title"],
        level="A1",
        model=model
    )
    
    # 2. Generate Context Card
    print("📖 Generating Context Card...")
    context_card = await LLMService.generate_context_card(
        topic=TOPIC_INFO["title"],
        level="A1",
        model=model
    )
    
    # 3. Generate Exercises
    print("✍️ Generating Exercises...")
    exercises_data = await LLMService.generate_exercises(
        topic=TOPIC_INFO["title"],
        level="A1",
        model=model
    )
    exercises = exercises_data.get("exercises", [])

    # 4. Sanitize data for Firestore (Firestore doesn't support nested arrays)
    if "form" in concept_card and concept_card["form"].get("type") == "table":
        rows = concept_card["form"].get("rows", [])
        sanitized_rows = []
        for row in rows:
            if isinstance(row, list):
                # Convert list to dict with string indices: ["a", "b"] -> {"0": "a", "1": "b"}
                sanitized_rows.append({str(i): val for i, val in enumerate(row)})
            else:
                sanitized_rows.append(row)
        concept_card["form"]["rows"] = sanitized_rows

    # 5. Assemble Content
    full_content = {
        **concept_card,
        "context": context_card,
        "exercises": exercises
    }

    # 6. Save to Firestore
    print(f"DEBUG: Saving full content to Firestore...")
    
    doc_ref = db.collection('users').document(user_id).collection('grammar').document(TOPIC_INFO['id'])
    
    data = {
        **TOPIC_INFO,
        "level": "A1",
        "content": full_content,
        "createdAt": datetime.utcnow().isoformat(),
        "lastUpdated": datetime.utcnow().isoformat(),
        "completed": False,
        "score": 0
    }
    
    doc_ref.set(data, merge=True)
    print(f"✅ Successfully seeded grammar topic '{TOPIC_INFO['id']}'!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed a grammar topic for a user")
    parser.add_argument("--user_id", required=True, help="Target User ID")
    parser.add_argument("--model", default=config.DEFAULT_LLM_MODEL, help="LLM Model to use")
    
    args = parser.parse_args()
    
    asyncio.run(seed_grammar(args.user_id, args.model))
