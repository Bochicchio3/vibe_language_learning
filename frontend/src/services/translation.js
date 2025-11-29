
/**
 * Translates a word or phrase from German to English using the unofficial Google Translate API.
 * This requires NO API KEY and is perfect for personal projects.
 * 
 * @param {string} text - The text to translate.
 * @param {string} context - Optional context (not used by Google Translate simple API, but kept for interface consistency).
 * @returns {Promise<string>} - The translated text.
 */
export async function translateWord(text, context = "") {
    try {
        // Google Translate 'gtx' endpoint (unofficial but widely used for free access)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Translation API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // The response structure is a nested array: [[["Translated Text", "Original Text", ...], ...], ...]
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }

        return "";
    } catch (error) {
        console.error("Translation failed:", error);
        return ""; // Return empty string on failure
    }
}
