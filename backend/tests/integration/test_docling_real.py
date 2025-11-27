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
        assert False, f"Sample file not found at {pdf_path}"

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

        # Save results to file
        output_path = os.path.join(os.path.dirname(pdf_path), "docling_output.json")
        # If running in docker with /public mounted, this puts it in /public/samples/docling_output.json
        # But let's put it in a dedicated output dir if possible, or just next to the file for now as it's mounted.
        
        # Actually, let's save to a specific test_outputs directory if it exists, otherwise current dir
        output_dir = "/app/test_outputs"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            
        output_file = os.path.join(output_dir, "docling_results.json")
        
        print(f"\nSaving results to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, default=str)
        print("Results saved successfully.")
        
    except Exception as e:
        print(f"\nError processing document: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_real_pdf()
