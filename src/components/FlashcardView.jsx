import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Brain, CheckCircle, RefreshCw, Plus, Sparkles, X, Loader2, Library, Layers, Trash2, GraduationCap } from 'lucide-react';
import { collection, getDocs, doc, setDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateNextReview, isDue } from '../services/srs';
import Flashcard from './Flashcard';
import { recordVocabSession } from '../services/activityTracker';
import { generateFlashcards } from '../services/ollama';

export default function FlashcardView({ initialDeck: propInitialDeck = null }) {
    const { currentUser } = useAuth();
    const location = useLocation();

    // Get initialDeck from either props or router state
    const initialDeck = propInitialDeck || location.state?.initialDeck;

    const [allVocab, setAllVocab] = useState([]); // Store all vocab to derive decks
    const [dueCards, setDueCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [cardsReviewed, setCardsReviewed] = useState(0);

    // Generate Deck State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateTopic, setGenerateTopic] = useState('');
    const [generateCount, setGenerateCount] = useState(10);
    const [generateLevel, setGenerateLevel] = useState('A2');
    const [isGenerating, setIsGenerating] = useState(false);

    // Deck Selection State
    const [selectedDeck, setSelectedDeck] = useState(initialDeck); // null = Deck Selection View
    const [decks, setDecks] = useState([]);

    useEffect(() => {
        console.log("FlashcardView mounted. CurrentUser:", currentUser?.uid);
        if (initialDeck) {
            setSelectedDeck(initialDeck);
        }
        fetchDueCards();
    }, [currentUser, initialDeck]);

    const fetchDueCards = async () => {
        if (!currentUser) {
            console.log("No current user in FlashcardView");
            return;
        }
        setLoading(true);
        try {
            console.log("Fetching vocab for flashcards...");
            const vocabRef = collection(db, 'users', currentUser.uid, 'vocab');
            const snapshot = await getDocs(vocabRef);

            const vocabList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter out learned words if you want to hide them completely, 
            // or keep them but ensure they aren't 'due'. 
            // For now, we'll keep them in allVocab but they won't be due if learned=true.
            setAllVocab(vocabList);
            console.log("Fetched vocab count:", vocabList.length);

            // Extract Decks
            const deckMap = {};
            vocabList.forEach(word => {
                const deckName = word.deck || 'General';
                if (!deckMap[deckName]) {
                    deckMap[deckName] = { name: deckName, total: 0, due: 0 };
                }
                deckMap[deckName].total++;
                if (isDue(word.srs) && !word.learned) {
                    deckMap[deckName].due++;
                }
            });
            const deckList = Object.values(deckMap).sort((a, b) => b.due - a.due);
            setDecks(deckList);

            // If a deck is already selected (or passed as initial prop), filter for it.
            const targetDeck = selectedDeck || initialDeck;
            if (targetDeck) {
                startSession(targetDeck, vocabList);
            } else {
                // Optional: Auto-select 'General' if it's the only one? No, show library.
            }

        } catch (error) {
            console.error("Error fetching vocab:", error);
        } finally {
            setLoading(false);
        }
    };

    const startSession = (deckInput, vocabList = null) => {
        setSelectedDeck(deckInput);

        // Use provided vocabList or fall back to state (for when called from UI)
        const vocab = vocabList || allVocab;
        let filtered = vocab;

        // Handle object-based deck (from Library with content)
        if (typeof deckInput === 'object' && deckInput !== null && deckInput.content) {
            // Filter words that appear in the content
            // Create a Set of unique words from content for O(1) lookup
            // Split by non-word characters, lowercase
            const contentWords = new Set(
                deckInput.content.toLowerCase()
                    .split(/[^a-zA-Z0-9äöüÄÖÜß]+/)
                    .filter(w => w.length > 0)
            );

            // Filter vocab words that match words in the content
            // Check both the document ID and the sourceTextId to ensure we get words from this story
            filtered = vocab.filter(word => {
                // Match if this word appears in the content
                const wordText = (word.id || '').toLowerCase();
                return contentWords.has(wordText) && word.sourceTextId === deckInput.id;
            });
            console.log(`[FlashcardView] Filtered ${filtered.length} words from story "${deckInput.title}"`);
        }
        // Handle string-based deck (standard)
        else if (deckInput !== 'All') {
            filtered = vocab.filter(word => (word.deck || 'General') === deckInput);
        }

        // Filter out learned words from review
        const due = filtered.filter(word => isDue(word.srs) && !word.learned);
        setDueCards(due);
        setCurrentIndex(0);
        setSessionComplete(false);
    };


    const handleGenerateDeck = async () => {
        if (!generateTopic.trim()) return;

        setIsGenerating(true);
        try {
            // 1. Generate cards using Ollama
            const newCards = await generateFlashcards(generateTopic, generateCount, generateLevel, "qwen2.5:1.5b"); // Using available model

            if (!newCards || newCards.length === 0) {
                throw new Error("No cards generated");
            }

            // 2. Save to Firestore
            const batch = writeBatch(db);
            const vocabRef = collection(db, 'users', currentUser.uid, 'vocab');

            newCards.forEach(card => {
                // Create a unique ID based on the word to prevent duplicates (simple approach)
                const docId = card.word.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const docRef = doc(vocabRef, docId);

                batch.set(docRef, {
                    id: card.word, // Display text
                    definition: card.definition,
                    context: card.context,
                    gender: card.gender,
                    deck: generateTopic,
                    srs: {
                        interval: 0,
                        repetition: 0,
                        efactor: 2.5,
                        dueDate: serverTimestamp(), // Due immediately
                    },
                    createdAt: serverTimestamp()
                }, { merge: true });
            });

            await batch.commit();

            // 3. Refresh and close
            setShowGenerateModal(false);
            setGenerateTopic('');
            await fetchDueCards(); // Re-fetch to update decks
            // Optionally auto-select the new deck
            // startSession(generateTopic); 

        } catch (error) {
            console.error("Error generating deck:", error);
            alert("Failed to generate deck. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGrade = async (grade) => {
        const currentCard = dueCards[currentIndex];
        if (!currentCard) return;

        // Calculate new SRS state
        const newSrs = calculateNextReview(currentCard.srs, grade);

        // Optimistic UI update: Move to next card immediately
        if (currentIndex < dueCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
        }

        // Save to Firestore in background
        try {
            const cardRef = doc(db, 'users', currentUser.uid, 'vocab', currentCard.id);
            await setDoc(cardRef, {
                srs: newSrs
            }, { merge: true });
        } catch (error) {
            console.error("Error saving SRS state:", error);
            // In a robust app, we'd handle rollback or retry here
        }

        // Track card review
        setCardsReviewed(prev => prev + 1);

        // If session is complete, record to activity tracker
        if (currentIndex >= dueCards.length - 1) {
            recordVocabSession(currentUser.uid, cardsReviewed + 1)
                .catch(err => console.error('Error recording vocab session:', err));
        }
    };

    const handleDelete = async () => {
        const currentCard = dueCards[currentIndex];
        if (!currentCard) return;

        if (!window.confirm(`Are you sure you want to delete "${currentCard.id}"? This cannot be undone.`)) {
            return;
        }

        // Optimistic UI update
        const newDueCards = dueCards.filter(c => c.id !== currentCard.id);
        setDueCards(newDueCards);
        // If we deleted the last card, session is complete. 
        // If we deleted a card in the middle, currentIndex stays same (showing next card)
        // If we deleted the *last* card but there were others before it, we need to adjust index?
        // Actually, if we delete the card at currentIndex, the next card slides into currentIndex.
        // If currentIndex was the last index, we should finish.
        if (newDueCards.length === 0) {
            setSessionComplete(true);
        } else if (currentIndex >= newDueCards.length) {
            setSessionComplete(true);
        }

        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'vocab', currentCard.id));
            // Update allVocab too so it doesn't reappear if we go back to library
            setAllVocab(prev => prev.filter(c => c.id !== currentCard.id));
        } catch (error) {
            console.error("Error deleting card:", error);
            alert("Failed to delete card.");
        }
    };

    const handleMarkLearned = async () => {
        const currentCard = dueCards[currentIndex];
        if (!currentCard) return;

        if (!window.confirm(`Mark "${currentCard.id}" as learned? It will stop appearing in reviews.`)) {
            return;
        }

        // Optimistic UI update
        const newDueCards = dueCards.filter(c => c.id !== currentCard.id);
        setDueCards(newDueCards);
        if (newDueCards.length === 0) {
            setSessionComplete(true);
        } else if (currentIndex >= newDueCards.length) {
            setSessionComplete(true);
        }

        try {
            const cardRef = doc(db, 'users', currentUser.uid, 'vocab', currentCard.id);
            await setDoc(cardRef, {
                learned: true,
                srs: { ...currentCard.srs, interval: 9999, dueDate: null } // Effectively remove from SRS
            }, { merge: true });

            // Update allVocab
            setAllVocab(prev => prev.map(c => c.id === currentCard.id ? { ...c, learned: true } : c));
        } catch (error) {
            console.error("Error marking as learned:", error);
            alert("Failed to mark as learned.");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-slate-500 dark:text-slate-400">Loading flashcards...</div>;
    }

    if (sessionComplete) {
        return (
            <div className="text-center py-20 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-500" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Session Complete!</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">You reviewed {cardsReviewed} words in "{typeof selectedDeck === 'object' ? selectedDeck.title : selectedDeck}".</p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => setSelectedDeck(null)}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-bold px-4 py-2"
                    >
                        Back to Decks
                    </button>
                    <button
                        onClick={() => { setSessionComplete(false); fetchDueCards(); }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                    >
                        Finish
                    </button>
                </div>
            </div>
        );
    }

    // Deck Library View
    if (!selectedDeck) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Library className="text-indigo-500 dark:text-indigo-400" /> Flashcard Decks
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Select a deck to start reviewing</p>
                    </div>
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900"
                    >
                        <Sparkles size={18} />
                        Generate Deck
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* All Words Deck */}
                    <div
                        onClick={() => startSession('All')}
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xl transition cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Layers size={64} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Layers size={24} />
                            </div>
                            {allVocab.filter(w => isDue(w.srs) && !w.learned).length > 0 && (
                                <span className="bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-bold">
                                    {allVocab.filter(w => isDue(w.srs) && !w.learned).length} due
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">All Words</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{allVocab.length} cards total</p>
                    </div>

                    {/* Dynamic Decks */}
                    {decks.map(deck => (
                        <div
                            key={deck.name}
                            onClick={() => startSession(deck.name)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xl transition cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                                <Brain size={64} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-indigo-50 dark:bg-indigo-900 p-3 rounded-xl text-indigo-500 dark:text-indigo-400">
                                    <Brain size={24} />
                                </div>
                                {deck.due > 0 ? (
                                    <span className="bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-bold">
                                        {deck.due} due
                                    </span>
                                ) : (
                                    <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-xs font-bold">
                                        All done
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{deck.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{deck.total} cards total</p>
                        </div>
                    ))}
                </div>

                {/* Generate Modal (Reused) */}
                {showGenerateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Sparkles className="text-indigo-500 dark:text-indigo-400" size={20} />
                                    Generate Flashcards
                                </h3>
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Topic</label>
                                    <input
                                        type="text"
                                        value={generateTopic}
                                        onChange={(e) => setGenerateTopic(e.target.value)}
                                        placeholder="e.g., Medicine, Travel, Fruits"
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Count</label>
                                        <input
                                            type="number"
                                            value={generateCount}
                                            onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                                            min="1"
                                            max="20"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Level</label>
                                        <select
                                            value={generateLevel}
                                            onChange={(e) => setGenerateLevel(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition bg-white"
                                        >
                                            <option value="A1">A1 (Beginner)</option>
                                            <option value="A2">A2 (Elementary)</option>
                                            <option value="B1">B1 (Intermediate)</option>
                                            <option value="B2">B2 (Upper Intermediate)</option>
                                            <option value="C1">C1 (Advanced)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-4 rounded-xl text-xs text-indigo-700">
                                    <p><strong>Note:</strong> This will generate {generateCount} new cards about "{generateTopic || '...'}" using your local AI. It may take a few seconds.</p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition"
                                    disabled={isGenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateDeck}
                                    disabled={isGenerating || !generateTopic.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (dueCards.length === 0) {
        return (
            <div className="max-w-md mx-auto text-center py-12">
                <div className="bg-green-100 dark:bg-green-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">All Caught Up!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">You have no cards due for review in <strong>{typeof selectedDeck === 'object' ? selectedDeck.title : selectedDeck}</strong>.</p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => setSelectedDeck(null)}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-bold px-4 py-2"
                    >
                        Back to Decks
                    </button>
                    <button
                        onClick={fetchDueCards}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} /> Check again
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = dueCards[currentIndex];

    return (
        <div className="max-w-2xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setSelectedDeck(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                    <Library size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {typeof selectedDeck === 'object' ? selectedDeck.title : selectedDeck}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {dueCards.length} cards due
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleMarkLearned}
                    className="p-2 hover:bg-green-100 rounded-lg text-slate-400 hover:text-green-600 transition"
                    title="Mark as Learned"
                >
                    <GraduationCap size={20} />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition"
                    title="Delete Card"
                >
                    <Trash2 size={20} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                    {currentIndex + 1} / {dueCards.length}
                </span>
            </div>

            <div className="mt-8">
                {currentCard ? (
                    <Flashcard
                        key={currentCard.id}
                        word={currentCard}
                        onGrade={handleGrade}
                    />
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-indigo-500" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            All caught up!
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">
                            You've reviewed all due cards in <strong>{typeof selectedDeck === 'object' ? selectedDeck.title : selectedDeck}</strong>.
                        </p>
                        <button
                            onClick={() => setSelectedDeck(null)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg hover:shadow-indigo-500/25"
                        >
                            Back to Library
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
