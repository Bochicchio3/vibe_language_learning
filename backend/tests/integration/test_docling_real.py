import sys
import os
import json
import time

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.document_processor import DocumentProcessor

def test_real_pdf():
    # Path to the sample PDF
    # Assuming the script is run from the project root or backend dir, we need to find the file
    # Based on the file listing: /Users/dappide/Documents/Progetti/vibe_language_learning/public/samples/Vita_e_avventure_di_Robinson_Crusoè.pdf
    
    # Current file is in backend/tests/integration
    # Root is ../../../
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    pdf_path = os.path.join(project_root, "public", "samples", "Vita_e_avventure_di_Robinson_Crusoè.pdf")
    
    print(f"Looking for file at: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        print("Error: File not found!")
        return

    print("Initializing DocumentProcessor...")
    try:
        processor = DocumentProcessor()
    except Exception as e:
        print(f"Failed to initialize DocumentProcessor: {e}")
        return

    if not processor.converter:
        print("Error: Docling converter not initialized. Is docling installed?")
        return

    print("Starting processing (this may take a while)...")
    start_time = time.time()
    
    try:
        result = processor.process_document(pdf_path)
        duration = time.time() - start_time
        
        print(f"\nProcessing completed in {duration:.2f} seconds")
        print("-" * 50)
        print(f"Title: {result['metadata'].get('title', 'N/A')}")
        print(f"Author: {result['metadata'].get('author', 'N/A')}")
        print(f"Page Count: {result.get('page_count', 'N/A')}")
        print(f"Text Length: {len(result['text'])} characters")
        print(f"Is Image Only: {result.get('is_image_only', False)}")
        print("-" * 50)
        
        # Print first 500 chars of text
        print("\nPreview of extracted text:")
        print(result['text'][:500])
        print("...")
        
    except Exception as e:
        print(f"\nError processing document: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_real_pdf()
