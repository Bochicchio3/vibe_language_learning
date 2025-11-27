"""
Document processing service using Docling
Handles PDF and EPUB parsing with better accuracy than pdfjs
"""

from typing import Dict, List, Tuple, Optional
import os
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False
    print("Warning: Docling not available. Install with: pip install docling")

from config import config


class DocumentProcessor:
    """Process PDF and EPUB documents"""
    
    def __init__(self):
        if DOCLING_AVAILABLE:
            self.converter = DocumentConverter()
        else:
            self.converter = None
    
    def process_document(self, file_path: str) -> Dict:
        """
        Process a document (PDF or EPUB)
        
        Args:
            file_path: Path to the document
            
        Returns:
            Dict with text, metadata, and page count
        """
        if not DOCLING_AVAILABLE:
            raise Exception("Docling is not installed. Cannot process documents.")
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self._process_pdf(file_path)
        elif file_ext == '.epub':
            return self._process_epub(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    def _process_pdf(self, file_path: str) -> Dict:
        """Process PDF file"""
        try:
            result = self.converter.convert(file_path)
            
            # Extract text
            text = result.document.export_to_markdown()
            
            # Extract metadata
            metadata = {
                "title": getattr(result.document, "title", ""),
                "author": getattr(result.document, "author", ""),
                "page_count": len(result.document.pages) if hasattr(result.document, "pages") else 0,
            }
            
            return {
                "text": text,
                "metadata": metadata,
                "page_count": metadata["page_count"],
                "is_image_only": len(text.strip()) < 100  # Heuristic for scanned PDFs
            }
        except Exception as e:
            raise Exception(f"PDF processing failed: {str(e)}")
    
    def _process_epub(self, file_path: str) -> Dict:
        """Process EPUB file"""
        try:
            result = self.converter.convert(file_path)
            
            # Extract text
            text = result.document.export_to_markdown()
            
            # Extract metadata
            metadata = {
                "title": getattr(result.document, "title", ""),
                "author": getattr(result.document, "author", ""),
            }
            
            return {
                "text": text,
                "metadata": metadata,
                "page_count": 0,  # EPUBs don't have pages
                "is_image_only": False
            }
        except Exception as e:
            raise Exception(f"EPUB processing failed: {str(e)}")
    
    @staticmethod
    def chunk_text(text: str, target_word_count: int = None) -> List[Dict[str, str]]:
        """
        Chunk text into chapters/sections
        
        Args:
            text: Full text content
            target_word_count: Target words per chunk
            
        Returns:
            List of chapter dicts with title and content
        """
        target_word_count = target_word_count or config.CHUNK_TARGET_WORDS
        
        # Try to detect chapter markers
        import re
        
        # Common chapter patterns
        chapter_patterns = [
            r'^#+\s+(?:Chapter|Kapitel)\s+\d+',  # Markdown headers
            r'^(?:Chapter|Kapitel)\s+\d+',
            r'^[IVXLCDM]+\.',  # Roman numerals
            r'^Part\s+\d+',
            r'^Teil\s+\d+',
        ]
        
        lines = text.split('\n')
        chapter_indices = []
        
        for i, line in enumerate(lines):
            for pattern in chapter_patterns:
                if re.match(pattern, line.strip(), re.IGNORECASE):
                    chapter_indices.append(i)
                    break
        
        chunks = []
        
        if len(chapter_indices) > 0:
            # Split by detected chapters
            for i, start_idx in enumerate(chapter_indices):
                end_idx = chapter_indices[i + 1] if i + 1 < len(chapter_indices) else len(lines)
                
                chapter_lines = lines[start_idx:end_idx]
                title = chapter_lines[0].strip() if chapter_lines else f"Chapter {i + 1}"
                content = '\n'.join(chapter_lines[1:]).strip()
                
                # If chapter is too large, split it further
                word_count = len(content.split())
                if word_count > target_word_count * 1.5:
                    sub_chunks = DocumentProcessor._create_size_based_chunks(
                        content, target_word_count, title
                    )
                    chunks.extend(sub_chunks)
                else:
                    chunks.append({
                        "title": title,
                        "content": content,
                        "word_count": word_count
                    })
        else:
            # No chapters detected, use size-based chunking
            chunks = DocumentProcessor._create_size_based_chunks(text, target_word_count)
        
        # Filter out very small chunks (likely headers/footers)
        chunks = [c for c in chunks if c.get("word_count", 0) > 50]
        
        return chunks
    
    @staticmethod
    def _create_size_based_chunks(
        text: str,
        target_word_count: int,
        title_prefix: str = "Part"
    ) -> List[Dict[str, str]]:
        """Create chunks based on size"""
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        current_word_count = 0
        chunk_index = 1
        
        for paragraph in paragraphs:
            paragraph_word_count = len(paragraph.split())
            
            if current_word_count + paragraph_word_count > target_word_count and current_word_count > 0:
                chunks.append({
                    "title": f"{title_prefix} {chunk_index}",
                    "content": current_chunk.strip(),
                    "word_count": current_word_count
                })
                chunk_index += 1
                current_chunk = ""
                current_word_count = 0
            
            current_chunk += paragraph + "\n\n"
            current_word_count += paragraph_word_count
        
        if current_chunk.strip():
            chunks.append({
                "title": f"{title_prefix} {chunk_index}",
                "content": current_chunk.strip(),
                "word_count": current_word_count
            })
        
        return chunks


# Fallback simple PDF processor if Docling is not available
class SimplePDFProcessor:
    """Simple fallback PDF processor using PyPDF2"""
    
    @staticmethod
    def process_pdf_fallback(file_path: str) -> Dict:
        """Fallback PDF processing"""
        try:
            import PyPDF2
            
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page in reader.pages:
                    text += page.extract_text() + "\n\n"
                
                return {
                    "text": text,
                    "metadata": {
                        "title": reader.metadata.get("/Title", "") if reader.metadata else "",
                        "author": reader.metadata.get("/Author", "") if reader.metadata else "",
                        "page_count": len(reader.pages)
                    },
                    "page_count": len(reader.pages),
                    "is_image_only": len(text.strip()) < 100
                }
        except Exception as e:
            raise Exception(f"Fallback PDF processing failed: {str(e)}")
