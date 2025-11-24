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

export const generateComprehensionQuestions = async (model, textContent, targetLanguage = "German") => {
    const systemPrompt = `
You are a ${targetLanguage} language teacher. 
Read the provided text and generate 3 comprehension questions in ${targetLanguage} with their answers.
Return ONLY a valid JSON array of objects. Each object must have a "q" field (question) and an "a" field (answer).
Do not include any markdown formatting like \`\`\`json or \`\`\`. Just the raw JSON array.
Example output format:
[
  { "q": "Question in ${targetLanguage}?", "a": "Answer in ${targetLanguage}." },
  { "q": "Question in ${targetLanguage}?", "a": "Answer in ${targetLanguage}." }
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

export const generateStory = async (topic, level, length, theme = "", model, targetLanguage = "German") => {
    const lengthMap = {
        "Short": "approx 100 words",
        "Medium": "approx 250 words",
        "Long": "approx 500 words"
    };

    const systemPrompt = `
You are a ${targetLanguage} language teacher.
Write a ${targetLanguage} story about "${topic}"${theme ? ` with a theme of "${theme}"` : ""} for a learner at ${level} level.
Length: ${lengthMap[length] || "approx 200 words"}.

IMPORTANT: Return ONLY valid JSON with the following structure:
{
  "title": "The Title",
  "content": "The story text..."
}
Do not include markdown formatting (like \`\`\`json) in the response. Just the raw JSON string.
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Generate the story now." }
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

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error('Error generating story with Ollama:', error);
        throw error;
    }
};

export const simplifyStory = async (text, level = "A2", model, targetLanguage = "German") => {
    const systemPrompt = `
You are a ${targetLanguage} language teacher.
Rewrite the following text to be suitable for a learner at the ${level} level.
Keep the meaning of the story but use simpler vocabulary and grammar.
IMPORTANT: Return ONLY the simplified text. Do not include any intro or outro.
`;

    try {
        const response = await fetch('/api/chat', {
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
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.message?.content || "Failed to simplify text.";

    } catch (error) {
        console.error('Error simplifying story with Ollama:', error);
        throw error;
    }
};


export const generateFlashcards = async (topic, count = 10, level = "A2", model, targetLanguage = "German") => {
    const systemPrompt = `
You are a ${targetLanguage} language teacher.
Generate ${count} ${targetLanguage} vocabulary flashcards related to the topic "${topic}" for a learner at the ${level} level.
Each flashcard must include:
- "word": The ${targetLanguage} word or phrase.
- "definition": A simple definition or synonym (or English translation if appropriate).
- "context": A simple example sentence in ${targetLanguage} using the word.
- "gender": null (or gender if applicable for the language).

IMPORTANT: Return ONLY a valid JSON array of objects.
Example:
[
  { "word": "word1", "definition": "definition1", "context": "example sentence 1", "gender": null },
  { "word": "word2", "definition": "definition2", "context": "example sentence 2", "gender": null }
]
Do not include any markdown formatting like \`\`\`json. Just the raw JSON array.
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Generate the flashcards now." }
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

        console.log("Raw Ollama Response (Flashcards):", jsonStr);

        // Cleanup if model adds markdown despite instructions
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            throw new Error(`Failed to parse JSON response: ${jsonStr.substring(0, 50)}...`);
        }

        // Normalize output
        if (Array.isArray(parsed)) {
            return parsed;
        } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.flashcards)) return parsed.flashcards;
            if (Array.isArray(parsed.cards)) return parsed.cards;
        }

        console.warn("Unexpected JSON structure:", parsed);
        throw new Error("Response was not a list of flashcards.");

    } catch (error) {
        console.error('Error generating flashcards with Ollama:', error);
        throw error;
    }
};

export const generateRolePlayResponse = async (messages, scenario, model, targetLanguage = "German") => {
    const systemPrompt = `
You are a helpful ${targetLanguage} tutor role-playing as a character in a "${scenario}" scenario.
Your goal is to help the user practice ${targetLanguage} conversation.
Keep your responses natural, relatively short (1-3 sentences), and suitable for a learner.
If the user makes a mistake, you can subtly correct them in your response or just continue the conversation naturally if it's understandable.
Do NOT break character.
`;

    const conversation = [
        { role: "system", content: systemPrompt },
        ...messages
    ];

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: conversation,
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get response from Ollama');
        }

        const data = await response.json();
        return data.message?.content || "...";

    } catch (error) {
        console.error('Error in roleplay:', error);
        throw error;
    }
};

export const generateHint = async (messages, scenario, model, targetLanguage = "German") => {
    const systemPrompt = `
You are a ${targetLanguage} language helper. The user is in a role-play scenario: "${scenario}".
The user is stuck and needs a hint on what to say next.
Read the conversation history and suggest 3 possible ${targetLanguage} responses the user could say.
Return ONLY a valid JSON array of strings.
Example: ["Response 1", "Response 2", "Response 3"]
`;

    const conversation = [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: "I don't know what to say. Give me a hint." }
    ];

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: conversation,
                stream: false,
                format: "json"
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get hint');
        }

        const data = await response.json();
        let jsonStr = data.message?.content;

        // Cleanup
        jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        const hints = JSON.parse(jsonStr);
        return Array.isArray(hints) ? hints : ["Entschuldigung?", "Ich verstehe nicht.", "Können Sie das wiederholen?"];

    } catch (error) {
        console.error('Error generating hint:', error);
        return ["Hallo!", "Ja, bitte.", "Danke."]; // Fallback
    }
};

export const analyzeWriting = async (text, model, targetLanguage = "German") => {
    const systemPrompt = `
You are a ${targetLanguage} language teacher correcting a student's writing.
Analyze the provided ${targetLanguage} text.
Return ONLY a valid JSON object with the following structure:
{
  "correctedText": "The full text with all grammar and spelling errors fixed.",
  "feedback": "A brief overall comment on the writing style and level.",
  "rating": "A CEFR level estimate (e.g., A1, A2, B1...)",
  "corrections": [
    {
      "original": "mistaken phrase",
      "correction": "corrected phrase",
      "explanation": "Why it was wrong"
    }
  ],
  "suggestions": [
    "Suggestion for better vocabulary or phrasing 1",
    "Suggestion 2"
  ]
}
Do not include markdown formatting like \`\`\`json. Just the raw JSON object.
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                stream: false,
                format: "json"
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to analyze writing');
        }

        const data = await response.json();
        let jsonStr = data.message?.content;

        // Cleanup
        jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error('Error analyzing writing:', error);
        throw error;
    }
};

export const adaptContent = async (text, level, model, targetLanguage = "German") => {
    const systemPrompt = `
You are an expert ${targetLanguage} language teacher and editor.
Your task is to adapt the provided text for a learner at the ${level} level.

RULES:
1. **Language**: The output MUST be in ${targetLanguage}.
2. **Content**: 
   - Adapt the text to ${level} level.
   - Maintain the original meaning and flow.
   - IGNORE all metadata, copyright notices, headers, footers.
3. **Difficulty**: Adapt the vocabulary and grammar strictly to CEFR level ${level}.
4. **Output Format**: You MUST return a valid JSON object with EXACTLY these two fields:
   - "reasoning": A brief explanation (in English) of what you changed.
   - "adapted_text": The final adapted ${targetLanguage} text.

Example JSON:
{
  "reasoning": "Simplified vocabulary and sentence structure for A2 level.",
  "adapted_text": "Adapted text in ${targetLanguage}..."
}
Do not include markdown formatting like \`\`\`json. Just the raw JSON object.
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                stream: false,
                format: "json", // Enforce JSON mode
                options: {
                    temperature: 0.3
                }
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to adapt content');
        }

        const data = await response.json();
        let content = data.message?.content;

        try {
            // Cleanup markdown if present
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            // Parse the JSON response
            const parsed = JSON.parse(content);

            // Handle potential schema mismatch (fallback if model returns "content" instead of "adapted_text")
            const adaptedText = parsed.adapted_text || parsed.content || parsed.text || content;
            const reasoning = parsed.reasoning || "No reasoning provided.";

            return {
                content: adaptedText,
                reasoning: reasoning
            };
        } catch (e) {
            console.warn("Failed to parse JSON response from LLM, using raw content", e);
            // If parsing fails, return the raw content but try to strip JSON syntax if it looks like a failed JSON dump
            return { content: content, reasoning: "Failed to parse reasoning." };
        }

    } catch (error) {
        console.error('Error adapting content:', error);
        throw error;
    }
};

export const detectLevel = async (text, model, targetLanguage = "German") => {
    const systemPrompt = `
You are an expert ${targetLanguage} language teacher.
Analyze the provided text and determine its CEFR proficiency level (A1, A2, B1, B2, C1, or C2).

IMPORTANT: Return ONLY a valid JSON object with EXACTLY these two fields:
- "level": The CEFR level (e.g., "A2").
- "reasoning": A brief explanation of why this level was chosen.

Example:
{
  "level": "B1",
  "reasoning": "Uses complex sentence structures and vocabulary related to daily life."
}
Do not include markdown formatting like \`\`\`json. Just the raw JSON object.
`;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text.substring(0, 1000) } // Analyze first 1000 chars
                ],
                stream: false,
                format: "json"
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to detect level');
        }

        const data = await response.json();
        let jsonStr = data.message?.content;

        // Cleanup
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error('Error detecting level:', error);
        // Fallback
        return { level: "A2", reasoning: "Could not detect level automatically." };
    }
};
