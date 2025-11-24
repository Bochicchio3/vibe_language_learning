import subprocess
import json
import urllib.request
import urllib.error
import sys
import os

PDF_PATH = '/home/alfredo/projects/vibe_language_learning/Vita_e_avventure_di_Robinson_Crusoè.pdf'
OLLAMA_API_URL = "http://localhost:11434/api/chat"
MODEL = "gemma3:27b" # Updated based on user feedback

def extract_text(pdf_path, max_pages=10):
    print(f"Extracting text from {pdf_path} (first {max_pages} pages)...")
    try:
        # pdftotext -f 1 -l 10 -nopgbrk input.pdf -
        result = subprocess.run(
            ['pdftotext', '-f', '1', '-l', str(max_pages), '-nopgbrk', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error extracting text: {e}")
        return ""

def chunk_text(text, target_word_count=1000):
    print("Chunking text...")
    paragraphs = text.split('\n\n') # Simple paragraph split
    chunks = []
    current_chunk = []
    current_count = 0
    
    for para in paragraphs:
        words = para.split()
        count = len(words)
        if current_count + count > target_word_count and current_count > 0:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = []
            current_count = 0
        
        current_chunk.append(para)
        current_count += count
        
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks

def adapt_content(text, level="B1"):
    print(f"Adapting content to level {level} using {MODEL}...")
    
    system_prompt = f"""
You are an expert German language teacher and editor.
Your task is to extract the main story from the provided text and rewrite it in German for a learner at the {level} level.

RULES:
1. **Language**: The output MUST be in German.
2. **Content**: Extract ONLY the narrative story. IGNORE all metadata, copyright notices, headers, footers, page numbers, and "Google Books" information. If the text contains *only* metadata/garbage, return "NO_CONTENT".
3. **Difficulty**: Adapt the vocabulary and grammar strictly to CEFR level {level}.
4. **Output**: Return ONLY the adapted German text. Do not include any explanations, introductory phrases, or markdown.
"""
    
    data = {
        "model": MODEL,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": text }
        ],
        "stream": False,
        "options": {
            "temperature": 0.3 # Lower temperature for more focused output
        }
    }
    
    req = urllib.request.Request(
        OLLAMA_API_URL, 
        data=json.dumps(data).encode('utf-8'), 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('message', {}).get('content', "No content returned")
    except urllib.error.URLError as e:
        print(f"Ollama API Error: {e}")
        return None

import re

def smart_chunk_text(text, target_word_count=1500):
    print("Smart chunking text...")
    
    # Regex for Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X... up to L) on their own line
    # Also handling common OCR errors like "IL" for "II"
    chapter_pattern = re.compile(r'^\s*(?:[IVXLCDM]+\.?|IL\.?|Chapter\s+\d+|Kapitel\s+\d+)\s*$', re.MULTILINE | re.IGNORECASE)
    
    splits = [m.start() for m in chapter_pattern.finditer(text)]
    
    chunks = []
    last_pos = 0
    
    # If no chapters found, fall back to size-based
    if not splits:
        print("No chapter markers found. Falling back to size-based chunking.")
        return chunk_text(text, target_word_count)

    # Add the start of the text if it doesn't start with a chapter
    if splits[0] > 0:
        chunks.append(text[0:splits[0]].strip())
        last_pos = splits[0]
        
    for i, pos in enumerate(splits):
        end_pos = splits[i+1] if i + 1 < len(splits) else len(text)
        chunk_content = text[pos:end_pos].strip()
        
        # If chunk is too big, split it further
        if len(chunk_content.split()) > target_word_count * 1.5:
            sub_chunks = chunk_text(chunk_content, target_word_count)
            chunks.extend(sub_chunks)
        else:
            chunks.append(chunk_content)
            
    # Filter out very small chunks (likely just headers/garbage)
    valid_chunks = [c for c in chunks if len(c.split()) > 50]
    
    print(f"Smart chunking produced {len(valid_chunks)} valid chunks (from {len(chunks)} raw splits).")
    return valid_chunks

def main():
    if not os.path.exists(PDF_PATH):
        print(f"PDF not found at {PDF_PATH}")
        return

    # 1. Extract (50 pages)
    text = extract_text(PDF_PATH, max_pages=50)
    if not text:
        print("No text extracted.")
        return
    print(f"Extracted {len(text)} characters.")

    # 2. Chunk
    chunks = smart_chunk_text(text)
    
    # 3. Adapt (All chunks)
    results = []
    
    print(f"Starting adaptation of {len(chunks)} chunks...")
    
    for i, chunk in enumerate(chunks):
        # LIMIT FOR TESTING: Process only first 3 chunks to ensure completion
        if i >= 3:
            print("Reached limit of 3 chunks. Stopping adaptation.")
            break

        print(f"\nProcessing Chunk {i+1}/{len(chunks)} ({len(chunk.split())} words)...")
        chunk_result = {
            "chunk_id": i + 1,
            "original_snippet": chunk[:100] + "...",
            "adaptations": {}
        }
        
        # Clean up chunk
        clean_chunk = chunk.replace('\n\n', '\n')
        
        for level in ["B1", "B2"]:
            print(f"  > Adapting to {level}...")
            adapted = adapt_content(clean_chunk, level)
            
            if adapted == "NO_CONTENT":
                print(f"    Skipped (NO_CONTENT)")
                chunk_result["adaptations"][level] = None
            else:
                print(f"    Done ({len(adapted)} chars)")
                chunk_result["adaptations"][level] = adapted
        
        results.append(chunk_result)

    # Output
    output = {
        "original_file": os.path.basename(PDF_PATH),
        "extracted_chars": len(text),
        "total_chunks": len(chunks),
        "results": results
    }
    
    with open('verification_output_50.json', 'w') as f:
        json.dump(output, f, indent=2)
        
    print("\nVerification complete. Results saved to verification_output_50.json")

if __name__ == "__main__":
    main()
