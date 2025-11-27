import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock docling modules BEFORE importing the service
sys.modules['docling'] = MagicMock()
sys.modules['docling.document_converter'] = MagicMock()
sys.modules['docling.datamodel'] = MagicMock()
sys.modules['docling.datamodel.base_models'] = MagicMock()

from services.document_processor import DocumentProcessor

class TestDocumentProcessor:
    
    def test_chunk_text_with_chapters(self):
        """Test chunking text with clear chapter markers"""
        # Create content with > 50 words to pass the filter
        content_filler = "word " * 60
        text = f"""
Chapter 1
This is the content of chapter 1. {content_filler}

Chapter 2
This is chapter 2 content. {content_filler}
"""
        chunks = DocumentProcessor.chunk_text(text)
        
        assert len(chunks) == 2
        assert chunks[0]["title"] == "Chapter 1"
        assert "content of chapter 1" in chunks[0]["content"]
        assert chunks[1]["title"] == "Chapter 2"
        assert "chapter 2 content" in chunks[1]["content"]

    def test_chunk_text_size_based(self):
        """Test chunking text based on size when no chapters found"""
        # Create text with multiple paragraphs
        paragraph = "Word " * 50  # 50 words per paragraph
        text = (paragraph + "\n\n") * 20  # 1000 words total, 20 paragraphs
        
        # Set a small target word count for testing
        with patch('config.config.CHUNK_TARGET_WORDS', 200):
            chunks = DocumentProcessor.chunk_text(text, target_word_count=200)
            
        assert len(chunks) > 1
        assert chunks[0]["title"].startswith("Part")

    @patch('services.document_processor.DocumentConverter')
    def test_process_pdf_mock(self, mock_converter_cls):
        """Test PDF processing with mocked Docling"""
        # Setup mock
        mock_converter = MagicMock()
        mock_converter_cls.return_value = mock_converter
        
        # Create content > 100 chars to avoid is_image_only=True
        long_content = "Mocked PDF content " * 10
        
        mock_result = MagicMock()
        mock_result.document.export_to_markdown.return_value = long_content
        mock_result.document.title = "Test PDF"
        mock_result.document.author = "Test Author"
        mock_result.document.pages = [1, 2, 3]
        
        mock_converter.convert.return_value = mock_result
        
        # Initialize processor
        processor = DocumentProcessor()
        
        # Test
        result = processor.process_document("test.pdf")
        
        assert result["text"] == long_content
        assert result["metadata"]["title"] == "Test PDF"
        assert result["metadata"]["author"] == "Test Author"
        assert result["page_count"] == 3
        assert result["is_image_only"] is False

    def test_unsupported_file_type(self):
        """Test error for unsupported file types"""
        processor = DocumentProcessor()
        with pytest.raises(ValueError):
            processor.process_document("test.txt")
