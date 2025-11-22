const GEMINI_API_KEY = "AIzaSyAyNH7EFr-BEcnO4wtrKusbK819jq0opqE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Generates a German story based on topic, level, and length using Google Gemini.
 * @param {string} topic - The topic of the story.
 * @param {string} level - The CEFR level (A1, A2, B1, B2, C1).
 * @param {string} length - The desired length (Short, Medium, Long).
 * @returns {Promise<{title: string, content: string}>} - The generated story.
 */
export async function generateStory(topic, level, length) {
    const lengthMap = {
        "Short": "approx 100 words",
        "Medium": "approx 250 words",
        "Long": "approx 500 words"
    };

    const prompt = `
    Write a German story about "${topic}" for a learner at ${level} level.
    Length: ${lengthMap[length] || "approx 200 words"}.
    
    IMPORTANT: Return ONLY valid JSON with the following structure:
    {
      "title": "The German Title",
      "content": "The German story text..."
    }
    Do not include markdown formatting (like \`\`\`json) in the response. Just the raw JSON string.
  `;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error("Invalid response format from Gemini");
        }
        const textResponse = data.candidates[0].content.parts[0].text;
        console.log("Gemini Raw Response:", textResponse);

        // Clean up potential markdown formatting if the model ignores instructions
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Story Generation failed:", error);
        throw error;
    }
}
