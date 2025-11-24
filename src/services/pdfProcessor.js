import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is set up in the main app entry point, but we can double check or re-assign if needed.
// Usually best to rely on the global worker configuration if possible, or pass it in.

/**
 * Extracts text from a PDF file.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string>} - The full extracted text.
 */
export const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Process pages sequentially to avoid memory spikes on large docs
    for (let i = 1; i <= pdf.numPages; i++) {
        try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            // Add a page marker or just newlines? 
            // Newlines are safer for continuous text, maybe double newline for paragraph breaks.
            fullText += pageText + '\n\n';
        } catch (error) {
            console.warn(`Error extracting text from page ${i}`, error);
            fullText += `[Error reading page ${i}]\n\n`;
        }
    }

    return fullText;
};

/**
 * Chunks text into manageable sections.
 * @param {string} text - The full text content.
 * @param {number} targetWordCount - Approximate words per chunk.
 * @returns {Array<{title: string, content: string}>} - Array of chapters/chunks.
 */
export const chunkText = (text, targetWordCount = 1000) => {
    // 1. Try to split by "Chapter" or "Kapitel" headers if they exist clearly on their own lines.
    // This is a heuristic and might need refinement.
    const chapterRegex = /^(Chapter|Kapitel|Teil)\s+\d+|^\d+\.\s+[A-Z]/im;

    // For now, let's stick to a safer size-based chunking with paragraph preservation, 
    // as PDF text extraction often messes up formatting making regex detection hard.

    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunkWords = [];
    let chunkIndex = 1;

    // Simple word count split, but trying to break at paragraphs (double newlines) would be better if we had the raw text structure.
    // Since we split by whitespace, we lost the paragraph structure in the 'words' array.
    // Let's go back to splitting by paragraphs first.

    const paragraphs = text.split(/\n\s*\n/);
    let currentChunkContent = "";
    let currentWordCount = 0;

    for (const paragraph of paragraphs) {
        const paragraphWordCount = paragraph.split(/\s+/).length;

        if (currentWordCount + paragraphWordCount > targetWordCount && currentWordCount > 0) {
            // Push current chunk
            chunks.push({
                title: `Part ${chunkIndex}`,
                content: currentChunkContent.trim()
            });
            chunkIndex++;
            currentChunkContent = "";
            currentWordCount = 0;
        }

        currentChunkContent += paragraph + "\n\n";
        currentWordCount += paragraphWordCount;
    }

    // Push remaining
    if (currentChunkContent.trim()) {
        chunks.push({
            title: `Part ${chunkIndex}`,
            content: currentChunkContent.trim()
        });
    }

    return chunks;
};
