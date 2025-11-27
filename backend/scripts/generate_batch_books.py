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

MANIFEST_FILE = "books_manifest.json"

async def discover_books(topic: str, level: str, model: str):
    print(f"🔍 Starting Book Discovery for topic '{topic}' at level {level}...")
    
    try:
        outline = await LLMService.generate_book_outline(topic, level, model)
        
        # Add metadata
        outline["topic"] = topic
        outline["level"] = level
        outline["status"] = "planned"
        
        # Load existing manifest if any
        manifest = []
        if os.path.exists(MANIFEST_FILE):
            with open(MANIFEST_FILE, "r") as f:
                try:
                    manifest = json.load(f)
                except json.JSONDecodeError:
                    pass
        
        manifest.append(outline)
        
        with open(MANIFEST_FILE, "w") as f:
            json.dump(manifest, f, indent=2)
            
        print(f"✨ Discovery complete! Added '{outline['title']}' to {MANIFEST_FILE}")
        
    except Exception as e:
        print(f"❌ Error discovering book: {e}")

async def generate_book(db, user_id: str, book_info: dict, model: str, is_public: bool = False):
    print(f"\n📚 Generating book: {book_info['title']}...")
    
    try:
        # 1. Create Book Document in Firestore
        if is_public:
            doc_ref = db.collection('books').document()
            print(f"  🌍 Creating PUBLIC book")
        else:
            doc_ref = db.collection('users').document(user_id).collection('books').document()
            print(f"  👤 Creating PRIVATE book for {user_id}")
        
        book_data = {
            "title": book_info['title'],
            "description": book_info.get('description', ''),
            "level": book_info['level'],
            "topic": book_info.get('topic', ''),
            "totalChapters": len(book_info['chapters']),
            "createdAt": datetime.utcnow().isoformat(),
            "status": "generating",
            "chapters": [],
            "isGlobal": is_public,
            "submittedBy": "system" if is_public else user_id
        }
        
        doc_ref.set(book_data)
        book_id = doc_ref.id
        print(f"  💾 Created book document: {book_id}")
        
        # 2. Generate Chapters
        generated_chapters = []
        
        for i, chapter in enumerate(book_info['chapters']):
            print(f"  📖 Generating Chapter {chapter['number']}: {chapter['title']}...")
            
            full_chapter_content = ""
            previous_context = ""
            
            # Generate in 3 chunks
            TOTAL_CHUNKS = 3
            for chunk_idx in range(TOTAL_CHUNKS):
                print(f"    ✍️ Chunk {chunk_idx + 1}/{TOTAL_CHUNKS}...")
                
                chunk_text = await LLMService.generate_chapter_chunk(
                    book_title=book_info['title'],
                    chapter_title=chapter['title'],
                    chapter_summary=chapter['summary'],
                    chunk_index=chunk_idx,
                    total_chunks=TOTAL_CHUNKS,
                    previous_context=previous_context,
                    model=model,
                    level=book_info['level']
                )
                
                full_chapter_content += chunk_text + "\n\n"
                
                # Update context (keep last ~500 chars)
                previous_context = chunk_text[-500:]
            
            chapter_data = {
                "id": str(chapter['number']), # Simple ID
                "number": chapter['number'],
                "title": chapter['title'],
                "content": full_chapter_content.strip(),
                "summary": chapter['summary']
            }
            
            generated_chapters.append(chapter_data)
            
            # Update book with progress
            doc_ref.update({
                "chapters": generated_chapters,
                "lastUpdated": datetime.utcnow().isoformat()
            })
            
        # 3. Finalize
        doc_ref.update({
            "status": "approved",
            "completedAt": datetime.utcnow().isoformat()
        })
        print(f"  ✅ Book generation complete: {book_info['title']}")
        
    except Exception as e:
        print(f"  ❌ Error generating book {book_info.get('title', 'unknown')}: {e}")
        # Mark as failed
        if 'doc_ref' in locals():
            doc_ref.update({"status": "failed", "error": str(e)})

async def main():
    parser = argparse.ArgumentParser(description="Batch generate books")
    parser.add_argument("--user_id", help="Target User ID (required for generation)")
    parser.add_argument("--model", default=config.DEFAULT_LLM_MODEL, help="LLM Model to use")
    parser.add_argument("--discover", action="store_true", help="Run discovery phase")
    parser.add_argument("--generate", action="store_true", help="Run generation phase")
    parser.add_argument("--topic", help="Topic for discovery")
    parser.add_argument("--level", default="A2", help="CEFR Level for discovery")
    parser.add_argument("--public", action="store_true", help="Generate as public book (global collection)")
    
    args = parser.parse_args()
    
    # Discovery Phase
    if args.discover:
        if not args.topic:
            print("❌ Error: --topic is required for discovery.")
            return
            
        await discover_books(args.topic, args.level, args.model)
        return

    # Generation Phase
    if args.generate:
        if not args.user_id and not args.public:
            print("❌ Error: --user_id is required for private generation (or use --public).")
            return
            
        if not os.path.exists(MANIFEST_FILE):
            print(f"❌ Error: Manifest file {MANIFEST_FILE} not found. Run --discover first.")
            return
            
        with open(MANIFEST_FILE, "r") as f:
            books_to_run = json.load(f)
            
        print(f"🚀 Starting batch generation for {len(books_to_run)} books...")
        
        db = get_firestore_client()
        for book in books_to_run:
            await generate_book(db, args.user_id, book, args.model, is_public=args.public)
            
        print("\n✨ Batch generation complete!")
        return

    print("⚠️ No action specified. Use --discover or --generate.")

if __name__ == "__main__":
    asyncio.run(main())
