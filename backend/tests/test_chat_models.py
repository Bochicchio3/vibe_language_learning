import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from services.llm import LLMService

client = TestClient(app)

@pytest.mark.asyncio
async def test_get_available_models_mock():
    """Test getting models with mocked Ollama response"""
    
    # Mock requests.get to simulate Ollama response
    with patch('requests.get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [
                {"name": "llama3.2:latest", "details": {}},
                {"name": "mistral:latest", "details": {}}
            ]
        }
        mock_get.return_value = mock_response
        
        # Call the service method directly
        models = await LLMService.get_available_models()
        
        # Verify results
        assert len(models) >= 2
        assert any(m["name"] == "llama3.2:latest" for m in models)
        assert any(m["provider"] == "ollama" for m in models)

@pytest.mark.asyncio
async def test_get_available_models_fallback():
    """Test fallback when Ollama is unreachable"""
    
    with patch('requests.get') as mock_get:
        # Simulate connection error
        mock_get.side_effect = Exception("Connection refused")
        
        # Call the service method
        models = await LLMService.get_available_models()
        
        # Should still return default/cloud models or fallback
        assert len(models) > 0
        # Check for default model if no keys are set (assuming test env has no keys)
        # or check that it doesn't crash

def test_models_endpoint():
    """Test the API endpoint"""
    with patch('services.llm.LLMService.get_available_models') as mock_service:
        mock_service.return_value = [
            {"name": "test-model", "provider": "test"}
        ]
        
        response = client.get("/api/chat/models")
        
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) == 1
        assert data["models"][0]["name"] == "test-model"
