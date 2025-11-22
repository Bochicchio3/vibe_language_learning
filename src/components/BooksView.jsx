import React, { useState, useEffect } from 'react';
import { Book, CheckCircle, Lock, Unlock, PlayCircle, RotateCcw } from 'lucide-react';
import { collection, getDocs, setDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import seedData from '../data/ein_neues_leben.json';

export default function BooksView({ setView, setActiveBook }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const booksRef = collection(db, 'books');
            // We might want to order by title or level, for now just fetch all
            const snapshot = await getDocs(booksRef);
            const loadedBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBooks(loadedBooks);
        } catch (error) {
            console.error("Error fetching books:", error);
        } finally {
            setLoading(false);
        }
    };

    const seedBooks = async () => {
        setSeeding(true);
        try {
            // Use a fixed ID for the seed book so we don't create duplicates
            const bookId = 'ein_neues_leben';
            const bookRef = doc(db, 'books', bookId);

            await setDoc(bookRef, {
                ...seedData,
                totalChapters: seedData.chapters.length,
                createdAt: serverTimestamp()
            });

            alert("Book seeded successfully!");
            fetchBooks(); // Refresh list
        } catch (error) {
            console.error("Error seeding book:", error);
            alert("Failed to seed book: " + error.message);
        } finally {
            setSeeding(false);
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-slate-500">Loading library...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Book className="text-indigo-600" /> Books Library
                </h2>
                {/* Admin/Seed Button - Only show if no books or for testing */}
                {books.length === 0 && (
                    <button
                        onClick={seedBooks}
                        disabled={seeding}
                        className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full transition flex items-center gap-1"
                    >
                        {seeding ? "Seeding..." : "Seed Sample Book"}
                    </button>
                )}
            </div>

            {books.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
                    <Book size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No books available yet.</p>
                    <p className="text-sm text-slate-400 mt-1">Click "Seed Sample Book" to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {books.map(book => (
                        <div key={book.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group">
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white p-6 relative">
                                <Book size={48} className="opacity-20 absolute right-4 bottom-4" />
                                <h3 className="text-xl font-bold text-center z-10">{book.title}</h3>
                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold">
                                    {book.level}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                                    <span>{book.totalChapters || book.chapters?.length || 0} Chapters</span>
                                    {/* Placeholder for progress */}
                                    <span>0% Complete</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setActiveBook(book);
                                        setView('book_detail');
                                    }}
                                    className="w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-medium py-2 rounded-lg border border-slate-200 hover:border-indigo-200 transition flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={18} /> Start Reading
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
