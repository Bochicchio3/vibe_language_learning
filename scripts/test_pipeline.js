import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist';
import { extractTextFromPDF, chunkText } from '../src/services/pdfProcessor.js';
import { adaptContent } from '../src/services/ollama.js';

// Polyfill for Node environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock browser File object
class MockFile {
    constructor(buffer, name) {
        this.buffer = buffer;
        this.name = name;
        this.type = 'application/pdf';
    }
    async arrayBuffer() {
        return this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength);
    }
}

// Polyfill fetch for ollama service if needed (Node 18+ has fetch)
if (!global.fetch) {
    console.warn("Node version might be too old for native fetch. Adaptation might fail.");
}

async function runPipeline() {
    const pdfPath = '/home/alfredo/projects/vibe_language_learning/Vita_e_avventure_di_Robinson_Crusoè.pdf';
    console.log(`Reading PDF: ${pdfPath}`);

    try {
        const pdfBuffer = await fs.readFile(pdfPath);
        const mockFile = new MockFile(pdfBuffer, path.basename(pdfPath));

        // 1. Extraction (First 10 pages)
        console.log("Step 1: Extracting text (first 10 pages)...");
        const extractedText = await extractTextFromPDF(mockFile, 10);
        console.log(`Extracted ${extractedText.length} characters.`);

        // 2. Chunking
        console.log("Step 2: Chunking text...");
        const chunks = chunkText(extractedText);
        console.log(`Created ${chunks.length} chunks.`);

        // 3. Adaptation (Test on first chunk only to save time)
        console.log("Step 3: Adapting first chunk (A2 level)...");
        // Note: We need a model. Assuming 'llama3' or similar is available. 
        // We'll try to fetch models first or just hardcode one if we can't.
        // For this test, let's just try a common one or skip if fails.
        let adaptedContent = null;
        try {
            // We can't easily use fetchModels from here because it uses relative URL '/api/tags' which assumes browser proxy.
            // We need to hit localhost:11434 directly in Node.
            // But adaptContent also uses '/api/chat'. 
            // We need to mock the global fetch or modify the service to support base URL.
            // OR, simpler: we just redefine adaptContent locally for this test script to point to localhost:11434

            adaptedContent = await adaptContentNode(chunks[0].content, "A2", "llama3");
            console.log("Adaptation successful.");
        } catch (e) {
            console.warn("Adaptation failed (Ollama might not be running or model missing):", e.message);
            adaptedContent = "Adaptation skipped/failed.";
        }

        // Output Result
        const output = {
            originalFile: path.basename(pdfPath),
            extractedCharacters: extractedText.length,
            chunksCount: chunks.length,
            sampleChunk: chunks[0],
            adaptedSample: adaptedContent
        };

        const outputPath = path.join(__dirname, 'pipeline_output.json');
        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
        console.log(`Pipeline complete. Results saved to ${outputPath}`);

    } catch (error) {
        console.error("Pipeline failed:", error);
    }
}

// Custom adapt function for Node (direct to Ollama, no proxy)
async function adaptContentNode(text, level, model) {
    const systemPrompt = `
You are a professional editor adapting a book for a German learner at the ${level} level.
Rewrite the following text to match the target proficiency level.
- Vocabulary: Use words appropriate for ${level}.
- Grammar: Use sentence structures appropriate for ${level}.
- Meaning: Preserve the original meaning and flow of the story.
- Formatting: Keep paragraphs similar to the original.
IMPORTANT: Return ONLY the adapted text. Do not include any intro, outro, or markdown formatting.
`;

    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            stream: false
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || text;
}

runPipeline();
