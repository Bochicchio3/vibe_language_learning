"""
Simple test to verify backend services work
"""

import asyncio
from services.llm import LLMService
from services.news_parser import NewsParser


async def test_llm_service():
    """Test LLM service (requires Ollama running)"""
    print("\n=== Testing LLM Service ===")
    
    try:
        # Test story generation
        print("\n1. Testing story generation...")
        story = await LLMService.generate_story(
            topic="A cat and a dog",
            level="A2",
            length="Short",
            target_language="German"
        )
        print(f"✓ Story generated: {story['title']}")
        print(f"  Content preview: {story['content'][:100]}...")
        
    except Exception as e:
        print(f"✗ LLM test failed: {str(e)}")
        print("  Make sure Ollama is running: ollama serve")


def test_news_parser():
    """Test news parser"""
    print("\n=== Testing News Parser ===")
    
    try:
        # Test categories
        print("\n1. Testing categories...")
        categories = NewsParser.get_categories()
        print(f"✓ Categories: {', '.join(categories)}")
        
        # Test news fetching
        print("\n2. Testing news fetching...")
        articles = NewsParser.fetch_news("General", limit=2)
        print(f"✓ Fetched {len(articles)} articles")
        if articles:
            print(f"  First article: {articles[0]['title'][:60]}...")
        
    except Exception as e:
        print(f"✗ News parser test failed: {str(e)}")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("Backend Services Test")
    print("=" * 60)
    
    # Test news parser (no dependencies)
    test_news_parser()
    
    # Test LLM service (requires Ollama)
    await test_llm_service()
    
    print("\n" + "=" * 60)
    print("Tests complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
