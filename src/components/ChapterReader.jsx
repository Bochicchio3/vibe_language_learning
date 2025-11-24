import React, { useState, useEffect } from 'react';
import { ChevronLeft, Volume2, Brain, Loader2, CheckCircle, ArrowRight, MessageCircle, Sparkles, RotateCcw } from 'lucide-react';
import { doc, updateDoc, arrayUnion, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { translateWord } from '../services/translation';
import { simplifyStory, fetchModels } from '../services/ollama';
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

    const handleAskAI = (e) => {
        e.stopPropagation();
        if (!selection) return;
        setChatInitialMessage(`Explain this: "${selection.text}"`);
        setChatWidgetOpen(true);
        setSelection(null);
        window.getSelection().removeAllRanges();
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

            // Save to Firestore
            const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', cleanWord);
            await setDoc(vocabRef, {
                definition: translation,
                context: contextSentence,
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
                    <button
                        onClick={handleAskAI}
                        className="bg-indigo-600 text-white text-sm font-bold py-2 px-4 rounded-full shadow-lg hover:bg-indigo-700 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
                    >
                        <MessageCircle size={16} /> Ask AI
                    </button>
                    <div className="w-3 h-3 bg-indigo-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
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
                            <span key={sIndex} className={`transition-colors duration-300 ${isCurrentSentence ? 'bg-yellow-100 dark:bg-yellow-900 rounded px-1 -mx-1' : ''}`}>
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
                                            className={`group relative cursor-pointer transition-colors duration-200 rounded px-0.5 mx-0.5 select-none inline-flex items-center gap-1
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
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-max max-w-[200px]">
                                                    <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                                                        {savedVocab[cleanToken].definition}
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                </div>
                                            )}
                                        </span>
                                    );
                                })}
                            </span>
                        );
                    })}

                </div>
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
