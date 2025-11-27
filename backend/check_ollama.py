import requests
import sys

# Default Ollama URL
url = "http://localhost:11434/api/tags"

print(f"Testing connection to Ollama at {url}...")

try:
    response = requests.get(url, timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Ollama is reachable.")
        print("Available models:")
        data = response.json()
        for model in data.get("models", []):
            print(f"- {model['name']}")
    else:
        print(f"Failed with status code: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error connecting to Ollama: {str(e)}")
    sys.exit(1)
