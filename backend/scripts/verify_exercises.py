import requests
import json
import sys

def test_generate_exercises():
    url = "http://localhost:8000/api/grammar/exercises"
    payload = {
        "topic": "Present Tense",
        "level": "A1",
        "model": "ollama/gemma3:27b",
        "target_language": "German"
    }
    
    print(f"Testing {url} with payload: {payload}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\nSuccess! Generated Exercises:")
        print(json.dumps(data, indent=2))
        
        # Basic validation
        if "exercises" not in data:
            print("Error: 'exercises' key missing in response")
            sys.exit(1)
            
        exercises = data["exercises"]
        if len(exercises) == 0:
            print("Error: No exercises returned")
            sys.exit(1)
            
        print(f"\nReceived {len(exercises)} exercises.")
        for i, ex in enumerate(exercises):
            print(f"Exercise {i+1}: {ex.get('type')}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        sys.exit(1)

if __name__ == "__main__":
    test_generate_exercises()
