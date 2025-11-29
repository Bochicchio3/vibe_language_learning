export const tokenize = (str) => {
    if (!str) return [];
    // Split by non-word characters but keep delimiters (simplified for German chars)
    return str.split(/([^\wäöüÄÖÜß]+)/);
};

export const findContextSentence = (content, word) => {
    if (!content) return "Context not found";
    // Split into sentences (naive split by .!?)
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    // Find the first sentence containing the word
    const sentence = sentences.find(s => s.includes(word));
    return sentence ? sentence.trim() : "Context not found";
};
