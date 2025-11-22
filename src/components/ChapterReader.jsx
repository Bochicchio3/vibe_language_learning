import React, { useState, useEffect } from 'react';
import { ChevronLeft, Volume2, Brain, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { doc, updateDoc, arrayUnion, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { translateWord } from '../services/translation';
import { useTTS } from '../hooks/useTTS';

export default function ChapterReader({ chapter, book, setView, setChapter, setActiveBook }) {
    const { currentUser } = useAuth();
    const { speak, cancel, isSpeaking, currentSpeechIndex } = useTTS();
    const [savedVocab, setSavedVocab] = useState({});
    const [translatingWord, setTranslatingWord] = useState(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [completing, setCompleting] = useState(false);

    // Load saved vocab (simplified - ideally passed from parent or context to avoid refetching)
    useEffect(() => {
        // For now, we won't re-fetch vocab here to keep it simple, 
        // assuming the main app might pass it down or we just fetch on demand.
        // Let's just fetch it once for this view to be self-contained if needed.
        // In a real app, use a Context or global store.
    }, []);

    const tokenize = (str) => {
        return str.split(/([^\wäöüÄÖÜß]+)/);
    };

    const handleSpeak = () => {
        if (isSpeaking) {
            cancel();
        } else {
            speak(chapter.content);
        }
    };

    const toggleWord = async (originalToken, sentence) => {
        const cleanWord = originalToken.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (!cleanWord || cleanWord.length < 2) return;

        // Check if already saved (local state check would go here)
        // For this MVP, we'll just do the translation/save directly.

        try {
            setTranslatingWord(cleanWord);
            const translation = await translateWord(cleanWord, sentence);

            // Save to Firestore
            const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', cleanWord);
            await setDoc(vocabRef, {
                definition: translation,
                context: sentence,
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

    const tokens = tokenize(chapter.content);

    // Calculate cumulative lengths for mapping charIndex to token
    let charCount = 0;
    const tokenRanges = tokens.map(token => {
        const start = charCount;
        charCount += token.length;
        return { start, end: charCount };
    });

    return (
        <div className="max-w-3xl mx-auto bg-white min-h-[80vh] shadow-sm rounded-xl overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-10">
                <button
                    onClick={() => setView('book_detail')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                    <ChevronLeft size={18} /> Back to Book
                </button>
                <div className="font-bold text-slate-700">
                    Chapter {chapter.number}: {chapter.title}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSpeak}
                        className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-200 text-slate-700'}`}
                        title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                    >
                        <Volume2 size={20} className={isSpeaking ? "animate-pulse" : ""} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12 flex-grow overflow-y-auto">
                <div className="text-xl leading-loose text-slate-800 font-serif">
                    {tokens.map((token, index) => {
                        const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                        const isTranslating = translatingWord === cleanToken;
                        const isWord = /\w/.test(token);
                        const isSaved = savedVocab[cleanToken];

                        // Check if this token is currently being spoken
                        const range = tokenRanges[index];
                        const isCurrentSpeech = isSpeaking && currentSpeechIndex >= range.start && currentSpeechIndex < range.end;

                        if (!isWord) return <span key={index} className={isCurrentSpeech ? "bg-yellow-200" : ""}>{token}</span>;

                        return (
                            <span
                                key={index}
                                onClick={() => toggleWord(cleanToken, "Context from book")} // Context extraction could be improved
                                className={`group relative cursor-pointer transition-colors duration-200 rounded px-0.5 mx-0.5 select-none inline-flex items-center gap-1
                            ${isCurrentSpeech ? 'bg-yellow-200' : (isSaved ? 'bg-amber-200 text-amber-900' : 'hover:bg-indigo-100')}
                            ${isTranslating ? 'opacity-70' : ''}
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

                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
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
