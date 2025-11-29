import { tokenize, findContextSentence } from './textUtils.js';
import assert from 'assert';

console.log("  Testing tokenize...");
const text = "Hallo Welt! Wie geht's?";
const tokens = tokenize(text);
assert.ok(tokens.includes("Hallo"), "Should tokenize words");
assert.ok(tokens.includes("! "), "Should keep delimiters");
console.log("    ✓ tokenize passed");

console.log("  Testing findContextSentence...");
const content = "Das ist ein Satz. Das ist noch ein Satz. Und hier ist das Ende.";
const sentence = findContextSentence(content, "noch");
assert.strictEqual(sentence, "Das ist noch ein Satz.", "Should find correct sentence");

const notFound = findContextSentence(content, "missing");
assert.strictEqual(notFound, "Context not found", "Should handle missing words");
console.log("    ✓ findContextSentence passed");
