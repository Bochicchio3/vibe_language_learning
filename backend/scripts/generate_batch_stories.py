import asyncio
import argparse
import sys
import os
from datetime import datetime

# Add backend directory to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.llm import LLMService
from services.firebase_service import get_firestore_client

async def generate_and_save(topic, level, count, user_id, theme="", model=None):
    print(f"🚀 Starting batch generation for topic: '{topic}'")
    print(f"📊 Level: {level}, Count: {count}, Theme: '{theme}'")
    
    db = get_firestore_client()
    
    for i in range(count):
        print(f"\n📝 Generating story {i+1}/{count} for level {level}...")
        try:
            # Generate story
            story = await LLMService.generate_story(
                topic=topic,
                level=level,
                length="Medium",
                theme=theme,
                model=model
            )
            
            print(f"✅ Generated: {story['title']}")
            
            doc_data = {
                'title': story['title'],
                'level': level,
                'content': story['content'],
                'questions': [],
                'createdAt': datetime.now().isoformat(),
                'isRead': False,
                'generatedBy': 'batch_script',
                'topic': topic,
                'theme': theme
            }
            
            if db:
                # Save to Firestore
                doc_ref = db.collection('users').document(user_id).collection('texts').document()
                doc_ref.set(doc_data)
                print(f"💾 Saved to Firestore with ID: {doc_ref.id}")
            else:
                # Fallback: Save to local file
                import json
                filename = f"generated_story_{level}_{i+1}.json"
                with open(filename, 'w') as f:
                    json.dump(doc_data, f, indent=2)
                print(f"⚠️ Firestore not available. Saved to local file: {filename}")
            
        except Exception as e:
            print(f"❌ Error generating story {i+1}: {e}")

async def main():
    parser = argparse.ArgumentParser(description='Batch generate stories and upload to Firebase')
    parser.add_argument('--topic', required=True, help='Topic for the stories')
    parser.add_argument('--user_id', required=True, help='Firebase User ID to save stories to')
    parser.add_argument('--levels', default='A1,A2,B1,B2,C1', help='Comma-separated levels (default: A1,A2,B1,B2,C1)')
    parser.add_argument('--count', type=int, default=1, help='Number of stories per level (default: 1)')
    parser.add_argument('--theme', default='', help='Optional theme')
    parser.add_argument('--model', default=None, help='LLM model to use')

    args = parser.parse_args()
    
    levels = args.levels.split(',')
    
    print(f"🎯 Target User ID: {args.user_id}")
    
    for level in levels:
        await generate_and_save(
            topic=args.topic,
            level=level.strip(),
            count=args.count,
            user_id=args.user_id,
            theme=args.theme,
            model=args.model
        )
        
    print("\n✨ Batch generation complete!")

if __name__ == "__main__":
    asyncio.run(main())
