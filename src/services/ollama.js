/**
 * Service for interacting with the local Ollama instance.
 * Assumes Ollama is running at localhost:11434 and proxied via /api
 */

export const fetchModels = async () => {
    try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
};

export const generateComprehensionQuestions = async (model, textContent) => {
    const systemPrompt = `
You are a German language teacher. 
Read the provided text and generate 3 comprehension questions in German with their answers.
Return ONLY a valid JSON array of objects. Each object must have a "q" field (question) and an "a" field (answer).
Do not include any markdown formatting like \`\`\`json or \`\`\`. Just the raw JSON array.
Example output format:
[
  { "q": "Was macht Markus?", "a": "Er geht zur Arbeit." },
  { "q": "Wie ist das Wetter?", "a": "Die Sonne scheint." }
]
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Text:\n"${textContent}"` }
                ],
                stream: false,
                format: "json"
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        let jsonStr = data.message?.content;

        if (!jsonStr) {
            throw new Error("No content in response");
        }

        console.log("Raw Ollama Response:", jsonStr);

        // Cleanup if model adds markdown despite instructions
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error(`Failed to parse JSON response: ${jsonStr.substring(0, 50)}...`);
        }

        // Normalize output to ensure it's an array
        if (Array.isArray(parsed)) {
            return parsed;
        } else if (parsed && typeof parsed === 'object') {
            // Handle case where LLM wraps it in an object like { "questions": [...] }
            if (Array.isArray(parsed.questions)) {
                return parsed.questions;
            }
            // Handle single object case
            if (parsed.q && parsed.a) {
                return [parsed];
            }
        }

        console.warn("Unexpected JSON structure:", parsed);
        throw new Error("Response was not a list of questions.");

    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
};
