import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, Book, CheckCircle, Lock, Unlock, PlayCircle, RotateCcw } from 'lucide-react';
import { doc, getDoc, collection, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function BookDetailView({ book, setView, setActiveBook, setChapter }) {
    const { currentUser } = useAuth();
    const [progress, setProgress] = useState({ completedChapters: [], currentChapter: 1 });
    const [loading, setLoading] = useState(true);

    const [liveBook, setLiveBook] = useState(book);

    useEffect(() => {
        setLiveBook(book);
    }, [book]);

    useEffect(() => {
        if (!currentUser || !book) return;

        // Listen for progress
        const progressRef = doc(db, 'users', currentUser.uid, 'bookProgress', book.id);
        const unsubProgress = onSnapshot(progressRef, (doc) => {
            if (doc.exists()) {
                setProgress(doc.data());
            } else {
                setDoc(progressRef, {
                    bookId: book.id,
                    currentChapter: 1,
                    completedChapters: [],
                    lastReadAt: serverTimestamp()
                }, { merge: true });
            }
            setLoading(false);
        });

        // Listen for book updates (e.g. background adaptation)
        const bookRef = doc(db, 'users', currentUser.uid, 'books', book.id);
        const unsubBook = onSnapshot(bookRef, (doc) => {
            if (doc.exists()) {
                setLiveBook({ id: doc.id, ...doc.data() });
            }
        });

        return () => {
            unsubProgress();
            unsubBook();
        };
    }, [currentUser, book]);

    const handleChapterClick = (chapter) => {
        // Allow clicking if it's the current chapter or already completed (or if we want to allow peeking)
        // For MVP, let's unlock everything for testing, or enforce order.
        // Enforcing order:
        const isUnlocked = progress.completedChapters.includes(chapter.id) || chapter.number === progress.currentChapter;

        if (isUnlocked || true) { // Temporarily allowing all for testing
            setChapter(chapter);
            setView('chapter_reader');
        } else {
            alert("Finish the previous chapter to unlock this one!");
        }
    };

    if (!book) return <div>No book selected</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button
                onClick={() => setView('books')}
                className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition"
            >
                <ChevronLeft size={20} /> Back to Library
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 relative p-8 flex items-end">
                    <Book className="absolute top-8 right-8 text-white opacity-20" size={120} />
                    <div className="relative z-10 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                                {book.level}
                            </span>
                            <span className="text-indigo-100 text-sm">{book.chapters?.length || 0} Chapters</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">{book.title}</h1>
                        <p className="text-indigo-100 max-w-xl">{book.description}</p>
                    </div>
                </div>

                {/* Processing Banner - Show if book is being processed */}
                {liveBook.currentProcessingChapter && (
                    <div className="bg-indigo-600 text-white px-8 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="font-medium">
                                Processing Chapter {liveBook.currentProcessingChapter} of {liveBook.totalChapters}...
                            </span>
                        </div>
                        <span className="text-indigo-200 text-sm">
                            {Math.round((liveBook.currentProcessingChapter / liveBook.totalChapters) * 100)}% Complete
                        </span>
                    </div>
                )}

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Chapters</h3>
                        <div className="text-sm text-slate-500">
                            {progress.completedChapters?.length || 0} / {book.chapters?.length || 0} Completed
                        </div>
                    </div>

                    <div className="space-y-3">
                        {liveBook.chapters?.map((chapter, index) => {
                            const isCompleted = progress.completedChapters?.includes(chapter.id || chapter.number);
                            const isCurrent = chapter.number === progress.currentChapter;
                            const isLocked = !isCompleted && !isCurrent && false; // Temporarily disabled lock

                            // Check if this chapter is still being adapted (if book is adapted but chapter isn't marked)
                            const isOptimizing = liveBook.isAdapted && !chapter.isAdapted;

                            return (
                                <div
                                    key={chapter.id || chapter.number || index}
                                    onClick={() => !isLocked && !isOptimizing && handleChapterClick(chapter)}
                                    className={`flex items-center p-4 rounded-xl border transition cursor-pointer
                                ${isCurrent ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                                ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
                                ${isOptimizing ? 'opacity-75 bg-slate-50 cursor-wait' : ''}
                            `}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4
                                ${isCompleted ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}
                            `}>
                                        {isCompleted ? <CheckCircle size={20} /> : (chapter.number || index + 1)}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className={`font-bold ${isCurrent ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {chapter.title}
                                            {isOptimizing && (
                                                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                                                    Optimizing...
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {chapter.content.split(' ').length} words
                                        </p>
                                    </div>

                                    <div className="text-slate-400">
                                        {isLocked ? <Lock size={18} /> :
                                            isOptimizing ? <RotateCcw size={18} className="animate-spin" /> :
                                                <PlayCircle size={20} className={isCurrent ? 'text-indigo-600' : ''} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
