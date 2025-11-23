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

export const generateStory = async (topic, level, length, theme = "", model) => {
    const lengthMap = {
        "Short": "approx 100 words",
        "Medium": "approx 250 words",
        "Long": "approx 500 words"
    };

    const systemPrompt = `
You are a German language teacher.
Write a German story about "${topic}"${theme ? ` with a theme of "${theme}"` : ""} for a learner at ${level} level.
Length: ${lengthMap[length] || "approx 200 words"}.

IMPORTANT: Return ONLY valid JSON with the following structure:
{
  "title": "The German Title",
  "content": "The German story text..."
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

export const simplifyStory = async (text, level = "A2", model) => {
    const systemPrompt = `
You are a German language teacher.
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


export const generateFlashcards = async (topic, count = 10, level = "A2", model) => {
    const systemPrompt = `
You are a German language teacher.
Generate ${count} German vocabulary flashcards related to the topic "${topic}" for a learner at the ${level} level.
Each flashcard must include:
- "word": The German word or phrase (with article if noun).
- "definition": The English translation.
- "context": A simple example sentence in German using the word.
- "gender": "der", "die", "das", or null (if not a noun).

IMPORTANT: Return ONLY a valid JSON array of objects.
Example:
[
  { "word": "der Apfel", "definition": "the apple", "context": "Ich esse einen Apfel.", "gender": "der" },
  { "word": "laufen", "definition": "to run", "context": "Er läuft schnell.", "gender": null }
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

export const generateRolePlayResponse = async (messages, scenario, model) => {
    const systemPrompt = `
You are a helpful German tutor role-playing as a character in a "${scenario}" scenario.
Your goal is to help the user practice German conversation.
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

export const generateHint = async (messages, scenario, model) => {
    const systemPrompt = `
You are a German language helper. The user is in a role-play scenario: "${scenario}".
The user is stuck and needs a hint on what to say next.
Read the conversation history and suggest 3 possible German responses the user could say.
Return ONLY a valid JSON array of strings.
Example: ["Ich möchte bezahlen, bitte.", "Haben Sie das in Rot?", "Danke, auf Wiedersehen."]
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
