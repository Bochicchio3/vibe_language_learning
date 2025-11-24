import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is set up in the main app entry point, but we can double check or re-assign if needed.
// Usually best to rely on the global worker configuration if possible, or pass it in.

/**
 * Extracts text from a PDF file.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string>} - The full extracted text.
 */
export const extractTextFromPDF = async (file, startPage = 1, endPage = Infinity) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    const numPages = pdf.numPages;
    const effectiveEndPage = Math.min(numPages, endPage);
    const effectiveStartPage = Math.max(1, Math.min(startPage, effectiveEndPage));

    // Process pages sequentially
    for (let i = effectiveStartPage; i <= effectiveEndPage; i++) {
        try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            // Basic cleanup: replace multiple spaces with single space
            const cleanPageText = pageText.replace(/\s+/g, ' ').trim();

            if (cleanPageText.length > 0) {
                fullText += cleanPageText + '\n\n';
            }
        } catch (error) {
            console.warn(`Error extracting text from page ${i}`, error);
            fullText += `[Error reading page ${i}]\n\n`;
        }
    }

    return {
        text: fullText,
        pageCount: numPages,
        processedPages: effectiveEndPage - effectiveStartPage + 1,
        isImageOnly: fullText.trim().length === 0 && numPages > 0
    };
};

/**
 * Chunks text into manageable sections.
 * @param {string} text - The full text content.
 * @param {number} targetWordCount - Approximate words per chunk.
 * @returns {Array<{title: string, content: string}>} - Array of chapters/chunks.
 */
export const chunkText = (text, targetWordCount = 1500) => {
    // 1. Smart Chunking: Try to split by "Chapter" or Roman numerals
    // Regex matches:
    // - Roman numerals (I, II, III, IV, V...) on their own line
    // - "Chapter X" or "Kapitel X"
    // - Common OCR errors like "IL" for "II"
    const chapterRegex = /^\s*(?:[IVXLCDM]+\.?|IL\.?|Chapter\s+\d+|Kapitel\s+\d+)\s*$/gim;

    const splits = [];
    let match;
    while ((match = chapterRegex.exec(text)) !== null) {
        splits.push(match.index);
    }

    let chunks = [];

    // If no chapters found, fall back to purely size-based chunking
    if (splits.length === 0) {
        console.log("No chapter markers found. Falling back to size-based chunking.");
        return createSizeBasedChunks(text, targetWordCount);
    }

    // Add the start of the text if it doesn't start with a chapter
    if (splits[0] > 0) {
        chunks.push({
            title: "Intro / Prologue",
            content: text.substring(0, splits[0]).trim()
        });
    }

    for (let i = 0; i < splits.length; i++) {
        const start = splits[i];
        const end = splits[i + 1] || text.length;
        const chunkContent = text.substring(start, end).trim();

        // Extract title from the first line
        const titleMatch = chunkContent.match(/^[^\n]+/);
        const title = titleMatch ? titleMatch[0].trim() : `Chapter ${i + 1}`;

        // If chunk is too big, split it further
        if (chunkContent.split(/\s+/).length > targetWordCount * 1.5) {
            const subChunks = createSizeBasedChunks(chunkContent, targetWordCount, title);
            chunks.push(...subChunks);
        } else {
            chunks.push({
                title: title,
                content: chunkContent
            });
        }
    }

    // Filter out very small chunks (likely just headers/garbage)
    return chunks.filter(c => c.content.split(/\s+/).length > 50);
};

const createSizeBasedChunks = (text, targetWordCount, titlePrefix = "Part") => {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunkContent = "";
    let currentWordCount = 0;
    let chunkIndex = 1;

    for (const paragraph of paragraphs) {
        const paragraphWordCount = paragraph.split(/\s+/).length;

        if (currentWordCount + paragraphWordCount > targetWordCount && currentWordCount > 0) {
            chunks.push({
                title: `${titlePrefix} ${chunkIndex}`,
                content: currentChunkContent.trim()
            });
            chunkIndex++;
            currentChunkContent = "";
            currentWordCount = 0;
        }

        currentChunkContent += paragraph + "\n\n";
        currentWordCount += paragraphWordCount;
    }

    if (currentChunkContent.trim()) {
        chunks.push({
            title: `${titlePrefix} ${chunkIndex}`,
            content: currentChunkContent.trim()
        });
    }

    return chunks;
};
