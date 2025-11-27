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

# CEFR Levels to discover
LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
MANIFEST_FILE = "curriculum_manifest.json"

async def generate_topic(db, user_id: str, topic_info: dict, model: str):
    print(f"\n🌱 Processing topic: {topic_info['title']} ({topic_info['level']})...")
    
    # Generate a deterministic ID if not present
    if "id" not in topic_info:
        # Simple slugify: "Present Tense Verbs" -> "present_tense_verbs_a1"
        slug = topic_info['title'].lower().replace(" ", "_").replace("(", "").replace(")", "").replace("&", "and")
        topic_info['id'] = f"{slug}_{topic_info['level'].lower()}"

    try:
        # 1. Generate Concept Card
        print("  📚 Generating Concept Card...")
        concept_card = await LLMService.generate_concept_card(
            topic=topic_info["title"],
            level=topic_info["level"],
            model=model
        )

        # 2. Generate Context Card
        print("  📖 Generating Context Card...")
        context_card = await LLMService.generate_context_card(
            topic=topic_info["title"],
            level=topic_info["level"],
            model=model
        )
        
        # 3. Generate Exercises
        print("  ✍️ Generating Exercises...")
        exercises_data = await LLMService.generate_exercises(
            topic=topic_info["title"],
            level=topic_info["level"],
            model=model
        )
        exercises = exercises_data.get("exercises", [])

        # 4. Sanitize data for Firestore
        if "form" in concept_card and concept_card["form"].get("type") == "table":
            rows = concept_card["form"].get("rows", [])
            sanitized_rows = []
            for row in rows:
                if isinstance(row, list):
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
        print(f"  💾 Saving to Firestore: {topic_info['id']}...")
        doc_ref = db.collection('users').document(user_id).collection('grammar').document(topic_info['id'])
        
        data = {
            **topic_info,
            "content": full_content,
            "createdAt": datetime.utcnow().isoformat(),
            "lastUpdated": datetime.utcnow().isoformat(),
            "completed": False,
            "score": 0
        }
        
        doc_ref.set(data, merge=True)
        print(f"  ✅ Done: {topic_info['id']}")
        
    except Exception as e:
        print(f"  ❌ Error generating {topic_info.get('id', 'unknown')}: {e}")

async def discover_curriculum(model: str):
    print(f"🔍 Starting Curriculum Discovery using {model}...")
    full_curriculum = []
    
    for level in LEVELS:
        print(f"  Scanning Level {level}...")
        result = await LLMService.generate_curriculum(level, model)
        topics = result.get("topics", [])
        
        # Add level to each topic object for safety
        for t in topics:
            t["level"] = level
            
        full_curriculum.extend(topics)
        print(f"    Found {len(topics)} topics.")
        
    # Save to manifest
    with open(MANIFEST_FILE, "w") as f:
        json.dump(full_curriculum, f, indent=2)
        
    print(f"\n✨ Discovery complete! Saved {len(full_curriculum)} topics to {MANIFEST_FILE}")
    print(f"👉 Please review {MANIFEST_FILE} before running generation.")

async def main():
    parser = argparse.ArgumentParser(description="Batch generate grammar topics")
    parser.add_argument("--user_id", help="Target User ID (required for generation)")
    parser.add_argument("--model", default=config.DEFAULT_LLM_MODEL, help="LLM Model to use")
    parser.add_argument("--discover", action="store_true", help="Run discovery phase (generate manifest)")
    parser.add_argument("--generate", action="store_true", help="Run generation phase (from manifest)")
    parser.add_argument("--test_mode", action="store_true", help="Run only for the 3 selected test topics (Legacy)")
    
    args = parser.parse_args()
    
    # Discovery Phase
    if args.discover:
        await discover_curriculum(args.model)
        return

    # Generation Phase
    if args.generate:
        if not args.user_id:
            print("❌ Error: --user_id is required for generation.")
            return
            
        if not os.path.exists(MANIFEST_FILE):
            print(f"❌ Error: Manifest file {MANIFEST_FILE} not found. Run --discover first.")
            return
            
        with open(MANIFEST_FILE, "r") as f:
            topics_to_run = json.load(f)
            
        print(f"🚀 Starting batch generation for {len(topics_to_run)} topics from manifest...")
        
        db = get_firestore_client()
        for topic in topics_to_run:
            await generate_topic(db, args.user_id, topic, args.model)
            
        print("\n✨ Batch generation complete!")
        return

    # Legacy Test Mode
    if args.test_mode:
        if not args.user_id:
            print("❌ Error: --user_id is required for test mode.")
            return
        db = get_firestore_client()
        print(f"🚀 Starting test batch generation...")
        for topic in TEST_TOPICS:
            await generate_topic(db, args.user_id, topic, args.model)
        return

    print("⚠️ No action specified. Use --discover, --generate, or --test_mode.")

if __name__ == "__main__":
    asyncio.run(main())
