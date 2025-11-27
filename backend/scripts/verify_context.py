import requests
import json
import sys

def test_generate_context():
    url = "http://localhost:8001/api/grammar/context"
    payload = {
        "topic": "Two-Way Prepositions",
        "level": "A2",
        "model": "ollama/gemma3:27b",
        "target_language": "German"
    }
    
    print(f"Testing {url} with payload: {payload}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\nSuccess! Generated Context Card:")
        print(json.dumps(data, indent=2))
        
        # Basic validation
        if "title" not in data or "text" not in data:
            print("Error: 'title' or 'text' key missing in response")
            sys.exit(1)
            
        print(f"\nTitle: {data['title']}")
        print(f"Text length: {len(data['text'])} chars")
        print(f"Glossary items: {len(data.get('glossary', []))}")
        print(f"Grammar spots: {len(data.get('grammar_spotting', []))}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        sys.exit(1)

if __name__ == "__main__":
    test_generate_context()
