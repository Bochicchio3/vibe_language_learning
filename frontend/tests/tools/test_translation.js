async function translateWord(text) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        console.log("Translation:", data[0][0][0]);
    } catch (error) {
        console.error("Error:", error);
    }
}
translateWord("Morgen");
