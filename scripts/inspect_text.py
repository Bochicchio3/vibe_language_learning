import subprocess
import os

PDF_PATH = '/home/alfredo/projects/vibe_language_learning/Vita_e_avventure_di_Robinson_Crusoè.pdf'

def extract_text(pdf_path, max_pages=50):
    print(f"Extracting text from {pdf_path} (first {max_pages} pages)...")
    try:
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

text = extract_text(PDF_PATH)
with open('raw_text_50.txt', 'w') as f:
    f.write(text)
print("Saved to raw_text_50.txt")
