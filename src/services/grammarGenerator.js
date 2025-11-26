/**
 * Grammar Content Generation Service
 * Uses Ollama LLM to generate comprehensive grammar lessons, examples, and exercises
 */

// CEFR Level definitions for grammar content
export const GRAMMAR_LEVELS = [
    'A1_1', 'A1_2',
    'A2_1', 'A2_2',
    'B1_1', 'B1_2',
    'B2_1', 'B2_2',
    'C1_1', 'C1_2',
    'C2_1', 'C2_2'
];

// Grammar topic definitions
// Grammar Curriculum grouped by CEFR Level
export const GRAMMAR_CURRICULUM = {
    'A1': [
        { id: 'articles_a1', title: 'Articles (Der, Die, Das)', topic: 'articles', description: 'Basic gender recognition and nominative case' },
        { id: 'verbs_a1', title: 'Present Tense Verbs', topic: 'verbConjugation', description: 'Regular and common irregular verbs' },
        { id: 'pronouns_a1', title: 'Personal Pronouns', topic: 'pronouns', description: 'Ich, du, er, sie, es...' }
    ],
    'A2': [
        { id: 'articles_a2', title: 'Accusative & Dative', topic: 'articles', description: 'Articles in different cases' },
        { id: 'modal_verbs_a2', title: 'Modal Verbs', topic: 'verbConjugation', description: 'Können, müssen, wollen...' },
        { id: 'prepositions_a2', title: 'Common Prepositions', topic: 'prepositions', description: 'Prepositions with Accusative/Dative' }
    ],
    'B1': [
        { id: 'past_tense_b1', title: 'Perfect Tense', topic: 'verbConjugation', description: 'Spoken past tense (Perfekt)' },
        { id: 'adjectives_b1', title: 'Adjective Endings', topic: 'adjectiveDeclension', description: 'Declension with definite/indefinite articles' },
        { id: 'connectors_b1', title: 'Sentence Connectors', topic: 'wordOrder', description: 'Weil, dass, wenn, obwohl...' }
    ],
    'B2': [
        { id: 'passive_b2', title: 'Passive Voice', topic: 'verbConjugation', description: 'Vorgangspassiv and Zustandspassiv' },
        { id: 'genitive_b2', title: 'Genitive Case', topic: 'cases', description: 'Possession and genitive prepositions' },
        { id: 'relative_b2', title: 'Relative Clauses', topic: 'wordOrder', description: 'Relativsätze and pronouns' }
    ],
    'C1': [
        { id: 'subjunctive_c1', title: 'Konjunktiv II', topic: 'verbConjugation', description: 'Hypothetical situations and politeness' },
        { id: 'nominalization_c1', title: 'Nominalization', topic: 'syntax', description: 'Turning verbs/adjectives into nouns' }
    ],
    'C2': [
        { id: 'dialects_c2', title: 'Dialects & Nuances', topic: 'culture', description: 'Regional variations and register' },
        { id: 'idioms_c2', title: 'Complex Idioms', topic: 'vocabulary', description: 'Advanced idiomatic expressions' }
    ]
};

// Exercise Templates for LLM Prompting
const EXERCISE_TEMPLATES = {
    'multiple-choice': {
        type: 'multiple-choice',
        description: 'Standard multiple choice question',
        jsonFormat: `{
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why it is correct"
    }`
    },
    'gap-fill': {
        type: 'gap-fill',
        description: 'Sentence with a missing word',
        jsonFormat: `{
      "type": "gap-fill",
      "question": "Complete the sentence: Das ist ___ (the) Mann.",
      "answer": "der",
      "explanation": "Nominative masculine"
    }`
    },
    'matching': {
        type: 'matching',
        description: 'Match pairs of items',
        jsonFormat: `{
      "type": "matching",
      "question": "Match the German words to English",
      "pairs": [
        {"left": "Hund", "right": "Dog"},
        {"left": "Katze", "right": "Cat"}
      ]
    }`
    },
    'reorder': {
        type: 'reorder',
        description: 'Reorder words to form a correct sentence',
        jsonFormat: `{
      "type": "reorder",
      "question": "Arrange the words correctly",
      "segments": ["Ich", "gehe", "nach", "Hause"],
      "correctOrder": [0, 1, 2, 3],
      "explanation": "Standard SVO structure"
    }`
    }
};

/**
 * Generate a comprehensive grammar lesson for a specific topic and level
 */
export const generateGrammarLesson = async (topicId, level, model, targetLanguage = 'German') => {
    // Find the topic info from the new curriculum structure
    let topicInfo = null;
    const levelGroup = level.split('_')[0]; // e.g., 'A1' from 'A1_1' or just 'A1'

    // Try to find by ID first, then by topic key
    if (GRAMMAR_CURRICULUM[levelGroup]) {
        topicInfo = GRAMMAR_CURRICULUM[levelGroup].find(t => t.id === topicId || t.topic === topicId);
    } else if (GRAMMAR_CURRICULUM[level]) {
        // Direct level match (e.g. 'A1')
        topicInfo = GRAMMAR_CURRICULUM[level].find(t => t.id === topicId || t.topic === topicId);
    }

    if (!topicInfo) {
        // Fallback or error
        console.warn(`Topic ${topicId} not found in curriculum for level ${level}, using generic info`);
        topicInfo = { title: topicId, description: 'Grammar practice' };
    }

    const levelTitle = `${topicInfo.title} (${level})`;

    const systemPrompt = `
You are an expert ${targetLanguage} language teacher creating educational content.
You are creating a lesson for the topic: "${topicInfo.title}"
Description: "${topicInfo.description}"
CEFR Level: ${level}

Create a comprehensive grammar lesson that includes:
1. A clear, engaging explanation (2-4 paragraphs) that teaches the grammar concept at the ${level} level
2. 4-6 key points (concise bullet points that students should remember)
3. 5-8 example sentences that demonstrate the grammar rule

IMPORTANT GUIDELINES:
- The explanation should be in English but all examples must be in ${targetLanguage}
- Adjust complexity to match ${level} level (${level.startsWith('A') ? 'beginner' : level.startsWith('B') ? 'intermediate' : 'advanced'})
- Examples should progress from simple to more complex within the lesson
- Include helpful memory tips or patterns where relevant

Return ONLY valid JSON with this exact structure:
{
  "explanation": "Full explanation text in English...",
  "keyPoints": [
    "First key point",
    "Second key point",
    "Third key point"
  ],
  "examples": [
    {
      "german": "Example sentence in German",
      "english": "Translation in English",
      "note": "Brief grammatical note or highlight"
    }
  ]
}

Do not include markdown formatting like \`\`\`json. Just the raw JSON object.
`;

    try {
        // Construct the full prompt combining system and user messages
        const fullPrompt = `${systemPrompt}\n\nUser: Generate the lesson content for "${levelTitle}" now.`;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: fullPrompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.7
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate lesson: ${response.statusText}`);
        }

        const data = await response.json();
        let jsonStr = data.response;

        // Remove <think> tags if present (qwq model wraps responses)
        jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // Cleanup markdown if present
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        let lessonData;
        try {
            lessonData = JSON.parse(jsonStr);
        } catch (e) {
            // If parsing fails, try to extract JSON from the text
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                lessonData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error(`Could not parse JSON from response: ${jsonStr.substring(0, 200)}`);
            }
        }

        // Handle potentially nested structure (e.g., {lesson: {explanation, ...}})
        if (lessonData.lesson) {
            lessonData = lessonData.lesson;
        }

        // Validate structure
        if (!lessonData.explanation || !lessonData.keyPoints || !lessonData.examples) {
            console.error('Invalid lesson structure:', lessonData);
            throw new Error('Invalid lesson structure returned from LLM. Missing required fields: explanation, keyPoints, or examples');
        }

        return {
            title: levelTitle,
            level: level,
            ...lessonData
        };

    } catch (error) {
        console.error('Error generating grammar lesson:', error);
        throw error;
    }
};

/**
 * Generate exercises for a specific grammar topic and level
 * Now supports mixed exercise types in a single prompt
 */
export const generateExercises = async (topicId, level, count = 5, model, targetLanguage = 'German') => {
    // Find the topic info from the new curriculum structure
    let topicInfo = null;
    const levelGroup = level.split('_')[0]; // e.g., 'A1' from 'A1_1'

    if (GRAMMAR_CURRICULUM[levelGroup]) {
        topicInfo = GRAMMAR_CURRICULUM[levelGroup].find(t => t.id === topicId || t.topic === topicId);
    }

    // Fallback if not found (or if using old topicId style)
    if (!topicInfo) {
        topicInfo = { title: topicId, description: 'Grammar practice' };
    }

    const systemPrompt = `
You are a helpful German language tutor creating simple practice exercises for students.
Topic: "${topicInfo.title}"
Level: ${level}

Create ${count} simple exercises.
Mix these types:
1. Multiple Choice (type: "multiple-choice")
2. Fill in the blank (type: "gap-fill")
3. Matching pairs (type: "matching")
4. Reorder words (type: "reorder")

JSON Formats:
- multiple-choice: {"type": "multiple-choice", "question": "...", "options": ["A", "B"], "correctIndex": 0, "explanation": "..."}
- gap-fill: {"type": "gap-fill", "question": "Das ist ___ Mann.", "answer": "der", "explanation": "..."}
- matching: {"type": "matching", "question": "Match words", "pairs": [{"left": "Ja", "right": "Yes"}]}
- reorder: {"type": "reorder", "question": "Order sentence", "segments": ["Ich", "bin", "da"], "correctOrder": [0, 1, 2], "explanation": "..."}

Return ONLY a JSON array with ${count} exercises. No markdown.
`;

    try {
        // Construct the full prompt
        const fullPrompt = `${systemPrompt}\n\nUser: Generate ${count} mixed exercises now.`;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: fullPrompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.8
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate exercises: ${response.statusText}`);
        }

        const data = await response.json();
        let jsonStr = data.response;

        console.log('Raw LLM response for exercises:', jsonStr);

        // Remove <think> tags if present
        jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // Cleanup markdown
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        let exercises;
        try {
            exercises = JSON.parse(jsonStr);
        } catch (e) {
            // Try extracting array
            const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                try {
                    exercises = JSON.parse(arrayMatch[0]);
                } catch (e2) {
                    console.error('Failed to parse extracted array:', e2);
                }
            }

            if (!exercises) {
                throw new Error(`Could not parse JSON from response. Raw: ${jsonStr.substring(0, 200)}...`);
            }
        }



        // Validate
        if (!Array.isArray(exercises)) {
            console.error('Invalid exercises structure:', exercises);
            throw new Error('Exercises must be an array. Received: ' + typeof exercises);
        }

        return exercises;

    } catch (error) {
        console.error('Error generating exercises:', error);
        throw error;
    }
};

/**
 * Generate complete content for one level of a topic (lesson + exercises)
 */
export const generateLevelContent = async (topicId, level, model, targetLanguage = 'German') => {
    console.log(`Generating content for ${topicId} - ${level}`);

    try {
        // Generate lesson content
        const lesson = await generateGrammarLesson(topicId, level, model, targetLanguage);

        // Generate exercises
        const exercises = await generateExercises(topicId, level, 5, model, targetLanguage);

        return {
            ...lesson,
            exercises,
            completed: false,
            score: 0,
            lastAccessed: null
        };
    } catch (error) {
        console.error(`Error generating level content for ${topicId} - ${level}:`, error);
        throw error;
    }
};

/**
 * Generate complete content for all levels of a topic
 * This is the recursive function that generates the full topic
 */
export const generateFullTopicContent = async (topicId, model, targetLanguage = 'German', progressCallback = null) => {
    // Find topic info
    let topicInfo = null;
    // Search all levels for this topic ID
    for (const level of Object.keys(GRAMMAR_CURRICULUM)) {
        const found = GRAMMAR_CURRICULUM[level].find(t => t.id === topicId);
        if (found) {
            topicInfo = found;
            break;
        }
    }

    if (!topicInfo) throw new Error(`Unknown topic: ${topicId}`);

    const levels = {};
    const totalLevels = GRAMMAR_LEVELS.length;

    for (let i = 0; i < GRAMMAR_LEVELS.length; i++) {
        const level = GRAMMAR_LEVELS[i];

        try {
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: totalLevels,
                    level: level,
                    status: 'generating'
                });
            }

            const levelContent = await generateLevelContent(topicId, level, model, targetLanguage);
            levels[level] = levelContent;

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: totalLevels,
                    level: level,
                    status: 'completed'
                });
            }

            // Small delay to avoid overwhelming the LLM
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Failed to generate ${level} for ${topicId}:`, error);

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: totalLevels,
                    level: level,
                    status: 'error',
                    error: error.message
                });
            }

            // Continue with other levels even if one fails
            levels[level] = {
                title: `${level} (Generation Failed)`,
                level: level,
                explanation: 'Content generation failed. Please try again.',
                keyPoints: [],
                examples: [],
                exercises: [],
                completed: false,
                score: 0
            };
        }
    }

    return {
        ...topicInfo,
        levels,
        createdAt: new Date().toISOString(),
        generatedWith: model
    };
};

