import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, RefreshCw } from 'lucide-react';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { calculateNextReview, isDue } from '../services/srs';
import Flashcard from './Flashcard';

export default function FlashcardView() {
    const { currentUser } = useAuth();
    const [dueCards, setDueCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);

    useEffect(() => {
        console.log("FlashcardView mounted. CurrentUser:", currentUser?.uid);
        fetchDueCards();
    }, [currentUser]);

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

            const allVocab = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Fetched vocab count:", allVocab.length);

            // Filter for due cards
            const due = allVocab.filter(word => isDue(word.srs));
            console.log("Due cards count:", due.length);

            // Shuffle slightly or sort by priority? For now, random shuffle or just list
            setDueCards(due);
            setCurrentIndex(0);
            setSessionComplete(false);
        } catch (error) {
            console.error("Error fetching vocab:", error);
        } finally {
            setLoading(false);
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
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-slate-500">Loading flashcards...</div>;
    }

    if (dueCards.length === 0) {
        return (
            <div className="max-w-md mx-auto text-center py-12">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
                <p className="text-slate-500 mb-8">You have no cards due for review right now. Great job!</p>
                <button
                    onClick={fetchDueCards}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    <RefreshCw size={16} /> Check again
                </button>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="max-w-md mx-auto text-center py-12">
                <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                    <Brain size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Session Complete!</h2>
                <p className="text-slate-500 mb-8">You reviewed {dueCards.length} words today.</p>
                <button
                    onClick={() => { setSessionComplete(false); fetchDueCards(); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                    Finish
                </button>
            </div>
        );
    }

    const currentCard = dueCards[currentIndex];

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Brain className="text-indigo-500" /> Review Session
                </h2>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                    {currentIndex + 1} / {dueCards.length}
                </span>
            </div>

            <Flashcard
                key={currentCard.id}
                word={currentCard}
                onGrade={handleGrade}
            />
        </div>
    );
}
