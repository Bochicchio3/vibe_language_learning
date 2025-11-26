import React, { useState, useEffect } from 'react';
import { ChevronLeft, Volume2, Brain, Loader2, CheckCircle, ArrowRight, MessageCircle, Sparkles, RotateCcw, BookOpen, GraduationCap, X, Play } from 'lucide-react';
import { doc, updateDoc, arrayUnion, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { translateWord } from '../services/translation';
import { simplifyStory, fetchModels, explainText } from '../services/ollama';
import { useTTS } from '../hooks/useTTS';

export default function ChapterReader({ chapter, book, setView, setChapter, setActiveBook, setChatWidgetOpen, setChatInitialMessage }) {
    const { currentUser } = useAuth();
    const { speak, stop, isPlaying, isLoading, isModelLoading, currentSentenceIndex } = useTTS();
    const [savedVocab, setSavedVocab] = useState({});
    const [translatingWord, setTranslatingWord] = useState(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [completing, setCompleting] = useState(false);

    const [selection, setSelection] = useState(null);
    const [simplifiedContent, setSimplifiedContent] = useState(null);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [showingSimplified, setShowingSimplified] = useState(false);
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [sentences, setSentences] = useState([]);

    // Inline explanation state
    const [explanation, setExplanation] = useState(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [explanationIndex, setExplanationIndex] = useState(null);

    const contentToDisplay = showingSimplified ? simplifiedContent : chapter.content;

    useEffect(() => {
        fetchModels().then(models => {
            setOllamaModels(models);
            if (models.length > 0) setSelectedModel(models[0].name);
        });
    }, []);

    // Load saved vocab (simplified - ideally passed from parent or context to avoid refetching)
    useEffect(() => {
        // For now, we won't re-fetch vocab here to keep it simple, 
        // assuming the main app might pass it down or we just fetch on demand.
        // Let's just fetch it once for this view to be self-contained if needed.
        // In a real app, use a Context or global store.
    }, []);

    // Split content into sentences for highlighting
    useEffect(() => {
        if (contentToDisplay) {
            const segmenter = new Intl.Segmenter('de', { granularity: 'sentence' });
            const segments = Array.from(segmenter.segment(contentToDisplay));
            setSentences(segments.map(s => s.segment));
        }
    }, [contentToDisplay]);

    const tokenize = (str) => {
        return str.split(/([^\wäöüÄÖÜß]+)/);
    };

    const handleSpeak = () => {
        if (isPlaying) {
            stop();
        } else {
            speak(chapter.content);
        }
    };

    const handleSelection = () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            const selectionRange = window.getSelection().getRangeAt(0);
            const rect = selectionRange.getBoundingClientRect();
            setSelection({
                text: selectedText,
                top: rect.top,
                left: rect.left + rect.width / 2
            });
        } else {
            setSelection(null);
        }
    };

    const handleExplainText = async (template) => {
        if (!selection) return;

        // Find which sentence contains the selection
        const sIndex = sentences.findIndex(s => s.includes(selection.text));
        setExplanationIndex(sIndex);

        // Use the specific sentence as context, not the whole chapter
        const contextSentence = sentences[sIndex] || "";

        setIsExplaining(true);
        try {
            const result = await explainText(selection.text, template, contextSentence, selectedModel);
            setExplanation({
                template,
                text: selection.text,
                data: result
            });
        } catch (error) {
            console.error("Explanation failed:", error);
            alert("Failed to generate explanation. Please try again.");
        } finally {
            setIsExplaining(false);
            setSelection(null);
            window.getSelection().removeAllRanges();
        }
    };

    const findContextSentence = (content, word) => {
        if (!content) return "Context not found";
        // Split into sentences (naive split by .!?)
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        // Find the first sentence containing the word
        const sentence = sentences.find(s => s.includes(word));
        return sentence ? sentence.trim() : "Context not found";
    };

    const toggleWord = async (originalToken) => {
        const cleanWord = originalToken.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (!cleanWord || cleanWord.length < 2) return;

        // Check if already saved (local state check would go here)
        // For this MVP, we'll just do the translation/save directly.

        try {
            setTranslatingWord(cleanWord);

            // Find Context
            const contextSentence = findContextSentence(chapter.content, originalToken);

            const translation = await translateWord(cleanWord, contextSentence);

            // Save to Firestore with source book/chapter information
            const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', cleanWord);
            await setDoc(vocabRef, {
                definition: translation,
                context: contextSentence,
                sourceTextId: book.id || null,
                sourceTextTitle: `${book.title} - Ch${chapter.number}`,
                deck: book.title || 'General',
                createdAt: serverTimestamp()
            }, { merge: true });

            // Update local state for tooltip (simplified)
            setSavedVocab(prev => ({
                ...prev,
                [cleanWord]: { definition: translation }
            }));

        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setTranslatingWord(null);
        }
    };

    const handleComplete = async () => {
        setCompleting(true);
        try {
            const progressRef = doc(db, 'users', currentUser.uid, 'bookProgress', book.id);

            // 1. Mark current chapter as completed
            await setDoc(progressRef, {
                completedChapters: arrayUnion(chapter.id || chapter.number),
                lastReadAt: serverTimestamp(),
                currentChapter: chapter.number + 1 // Advance to next
            }, { merge: true });

            // 2. Find next chapter
            const nextChapter = book.chapters.find(c => c.number === chapter.number + 1);

            if (nextChapter) {
                // Move to next chapter
                setChapter(nextChapter);
                window.scrollTo(0, 0);
            } else {
                // Book finished!
                alert("Congratulations! You've finished the book!");
                setView('book_detail');
            }

        } catch (error) {
            console.error("Error completing chapter:", error);
            alert("Failed to save progress.");
        } finally {
            setCompleting(false);
        }
    };

    const handleSimplify = async () => {
        if (!selectedModel) {
            alert("Please ensure Ollama is running and a model is selected.");
            return;
        }
        setIsSimplifying(true);
        try {
            const simplified = await simplifyStory(chapter.content, "A1", selectedModel);
            setSimplifiedContent(simplified);
            setShowingSimplified(true);
        } catch (error) {
            console.error("Simplification failed:", error);
            alert("Failed to simplify story. Check console.");
        } finally {
            setIsSimplifying(false);
        }
    };


    return (
        <div
            className="max-w-3xl mx-auto bg-white dark:bg-slate-900 min-h-[80vh] shadow-sm rounded-xl overflow-hidden flex flex-col relative"
            onMouseUp={handleSelection}
        >
            {/* Selection Popup */}
            {selection && (
                <div
                    className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2"
                    style={{ top: selection.top, left: selection.left }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex gap-2 animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => handleExplainText('grammar')}
                            disabled={isExplaining}
                            className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Grammar"
                        >
                            <GraduationCap size={14} />
                            Grammar
                        </button>
                        <button
                            onClick={() => handleExplainText('sentence')}
                            disabled={isExplaining}
                            className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Sentence"
                        >
                            <BookOpen size={14} />
                            Sentence
                        </button>
                        <button
                            onClick={() => handleExplainText('word')}
                            disabled={isExplaining}
                            className="text-amber-600 dark:text-amber-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Word/Phrase"
                        >
                            <MessageCircle size={14} />
                            Word
                        </button>
                    </div>
                    <div className="w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                </div>
            )}
            {/* Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center sticky top-0 z-10">
                <button
                    onClick={() => setView('book_detail')}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                    <ChevronLeft size={18} /> Back to Book
                </button>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                    Chapter {chapter.number}: {chapter.title}
                </div>
                <div className="flex gap-2 items-center">
                    {ollamaModels.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="text-xs p-1 border border-slate-200 rounded bg-white max-w-[100px]"
                            >
                                {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                            </select>
                        </div>
                    )}

                    {simplifiedContent ? (
                        <button
                            onClick={() => setShowingSimplified(!showingSimplified)}
                            className={`p-2 rounded-full transition-colors ${showingSimplified ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                            title={showingSimplified ? "Show Original" : "Show Simplified"}
                        >
                            <RotateCcw size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSimplify}
                            disabled={isSimplifying || ollamaModels.length === 0}
                            className={`p-2 rounded-full transition-colors ${isSimplifying ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                            title="Simplify Text (AI)"
                        >
                            {isSimplifying ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                        </button>
                    )}

                    {isModelLoading && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 mr-2">
                            <Loader2 size={12} className="animate-spin" /> Loading Model...
                        </span>
                    )}
                    <button
                        onClick={handleSpeak}
                        className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        title={isPlaying ? "Stop Reading" : "Read Aloud"}
                        disabled={isModelLoading}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} className={isPlaying ? "animate-pulse" : ""} />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                <div className="text-xl leading-loose text-slate-800 dark:text-slate-200 font-serif">
                    {sentences.map((sentence, sIndex) => {
                        const isCurrentSentence = sIndex === currentSentenceIndex;
                        const tokens = tokenize(sentence);

                        return (
                            <React.Fragment key={sIndex}>
                                <div className={`group relative transition-colors duration-300 rounded-lg py-2 px-1 -mx-1 ${isCurrentSentence ? 'bg-yellow-100 dark:bg-yellow-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    {/* Sentence Play Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speak(chapter.content, sIndex);
                                        }}
                                        className={`absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition opacity-0 group-hover:opacity-100 ${isCurrentSentence ? 'opacity-100 text-indigo-600' : ''}`}
                                        title="Play from here"
                                    >
                                        <Play size={16} className={isCurrentSentence && isPlaying ? "fill-current" : ""} />
                                    </button>

                                    {tokens.map((token, tIndex) => {
                                        const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                                        const isTranslating = translatingWord === cleanToken;
                                        const isWord = /\w/.test(token);
                                        const isSaved = savedVocab[cleanToken];

                                        if (!isWord) return <span key={`${sIndex}-${tIndex}`}>{token}</span>;

                                        return (
                                            <span
                                                key={`${sIndex}-${tIndex}`}
                                                onClick={() => toggleWord(cleanToken, sentence)}
                                                className={`group/word relative cursor-pointer transition-colors duration-200 rounded px-0.5 mx-0.5 select-none inline-flex items-center gap-1
                                        ${isSaved
                                                        ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400'
                                                        : 'hover:bg-indigo-100 active:bg-indigo-200'}
                                        ${isTranslating ? 'opacity-70 cursor-wait' : ''}
                                    `}
                                            >
                                                {token}
                                                {isTranslating && <Loader2 size={12} className="animate-spin" />}

                                                {/* Tooltip */}
                                                {isSaved && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/word:block z-50 w-max max-w-[200px]">
                                                        <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                                                            {savedVocab[cleanToken].definition}
                                                        </div>
                                                        <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                    </div>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                                {/* Inline Explanation Card */}
                                {
                                    (isExplaining || explanation) && explanationIndex === sIndex && (
                                        <div className="mt-4 mb-2 animate-in slide-in-from-top duration-300">
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-l-4 border-indigo-500 rounded-lg p-4 shadow-md">
                                                {isExplaining ? (
                                                    <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                                                        <Loader2 size={20} className="animate-spin" />
                                                        <span className="text-sm font-medium">Generating explanation...</span>
                                                    </div>
                                                ) : explanation ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                {explanation.template === 'grammar' && <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                                                {explanation.template === 'sentence' && <BookOpen size={18} className="text-emerald-600 dark:text-emerald-400" />}
                                                                {explanation.template === 'word' && <MessageCircle size={18} className="text-amber-600 dark:text-amber-400" />}
                                                                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                                                                    {explanation.template.charAt(0).toUpperCase() + explanation.template.slice(1)} Explanation
                                                                </h3>
                                                            </div>
                                                            <button
                                                                onClick={() => setExplanation(null)}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>

                                                        <div className="text-sm bg-white/50 dark:bg-slate-800/50 rounded p-2 font-medium text-slate-700 dark:text-slate-300 italic">
                                                            "{explanation.text}"
                                                        </div>

                                                        {/* Grammar Template */}
                                                        {explanation.template === 'grammar' && (
                                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                {explanation.data.summary && (
                                                                    <p className="font-medium">{explanation.data.summary}</p>
                                                                )}
                                                                {explanation.data.structures && explanation.data.structures.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Structures:</p>
                                                                        {explanation.data.structures.map((struct, idx) => (
                                                                            <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2">
                                                                                <span className="font-mono text-indigo-600 dark:text-indigo-400">{struct.element}</span>
                                                                                {' → '}
                                                                                <span>{struct.explanation}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {explanation.data.tips && explanation.data.tips.length > 0 && (
                                                                    <div className="mt-2 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2">
                                                                        <p className="font-semibold text-xs uppercase text-indigo-700 dark:text-indigo-300 mb-1">Tips:</p>
                                                                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                                                                            {explanation.data.tips.map((tip, idx) => (
                                                                                <li key={idx}>{tip}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Sentence Template */}
                                                        {explanation.template === 'sentence' && (
                                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                {explanation.data.translation && (
                                                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded p-2">
                                                                        <p className="font-semibold text-xs uppercase text-emerald-700 dark:text-emerald-300 mb-1">Translation:</p>
                                                                        <p className="text-emerald-900 dark:text-emerald-100">{explanation.data.translation}</p>
                                                                    </div>
                                                                )}
                                                                {explanation.data.breakdown && explanation.data.breakdown.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Breakdown:</p>
                                                                        {explanation.data.breakdown.map((part, idx) => (
                                                                            <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2">
                                                                                <span className="font-mono text-emerald-600 dark:text-emerald-400">{part.part}</span>
                                                                                {' → '}
                                                                                <span>{part.meaning}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {explanation.data.notes && (
                                                                    <div className="bg-white dark:bg-slate-800 rounded p-2 text-xs italic">
                                                                        <strong>Note:</strong> {explanation.data.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Word Template */}
                                                        {explanation.template === 'word' && (
                                                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                {explanation.data.translation && (
                                                                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded p-2">
                                                                        <p className="font-semibold text-xs uppercase text-amber-700 dark:text-amber-300 mb-1">Translation:</p>
                                                                        <p className="text-amber-900 dark:text-amber-100 font-medium">{explanation.data.translation}</p>
                                                                    </div>
                                                                )}
                                                                {explanation.data.explanation && (
                                                                    <p>{explanation.data.explanation}</p>
                                                                )}
                                                                {explanation.data.examples && explanation.data.examples.length > 0 && (
                                                                    <div className="space-y-1.5">
                                                                        <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Examples:</p>
                                                                        {explanation.data.examples.map((ex, idx) => (
                                                                            <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2 space-y-1">
                                                                                <p className="font-mono text-amber-600 dark:text-amber-400">{ex.german}</p>
                                                                                <p className="text-xs text-slate-500 dark:text-slate-400">{ex.english}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {explanation.data.tips && (
                                                                    <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-2 text-xs italic">
                                                                        <strong>Tips:</strong> {explanation.data.tips}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                }
                            </React.Fragment>
                        );
                    })}

                </div>

                {/* Inline Explanation Card */}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end">
                <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                    {completing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                    Complete & Next Chapter <ArrowRight size={18} />
                </button>
            </div>
        </div >
    );
}
