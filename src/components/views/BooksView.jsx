import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, CheckCircle, Lock, Unlock, PlayCircle, RotateCcw, Plus, Upload, X, Loader2, Sparkles, Globe, User, Shield, Share2, Download, Search, Filter, Wand2, Trash2 } from 'lucide-react';
import { collection, getDocs, setDoc, doc, query, orderBy, serverTimestamp, addDoc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useImporter } from '../../hooks/useImporter';
import { useVocab } from '../../hooks/useVocab';
import ConfirmationModal from '../../components/shared/ConfirmationModal';

import { extractTextFromPDF, chunkText } from '../../services/pdfProcessor';
import { fetchModels, detectLevel } from '../../services/ollama';

export default function BooksView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { uploadBook } = useImporter();
    const { savedVocab, deleteVocabForText } = useVocab();

    const [privateBooks, setPrivateBooks] = useState([]);
    const [publicBooks, setPublicBooks] = useState([]);
    const [pendingBooks, setPendingBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    // View State
    const [activeTab, setActiveTab] = useState('private'); // 'private' | 'public'
    const [isAdmin, setIsAdmin] = useState(false); // Simulation for now

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevels, setSelectedLevels] = useState([]);

    // Add Book State
    const [showAddModal, setShowAddModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [title, setTitle] = useState('');
    const [level, setLevel] = useState('A2');
    const [bookChunks, setBookChunks] = useState([]);
    const [shouldAdapt, setShouldAdapt] = useState(false);
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('German');
    const [isDetectingLevel, setIsDetectingLevel] = useState(false);
    const [detectedReasoning, setDetectedReasoning] = useState('');

    // PDF Enhancements State
    const [pdfFile, setPdfFile] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(0);
    const [previewText, setPreviewText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isImageOnly, setIsImageOnly] = useState(false);

    useEffect(() => {
        fetchBooks();
    }, [currentUser, activeTab]); // Refetch when tab changes to ensure fresh data

    useEffect(() => {
        if (showAddModal) {
            fetchModels().then(models => {
                setOllamaModels(models);
                if (models.length > 0 && !selectedModel) setSelectedModel(models[0].name);
            });
        }
    }, [showAddModal]);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            // 1. Fetch Private Books
            let userBooksData = [];
            if (currentUser) {
                const userBooksRef = collection(db, 'users', currentUser.uid, 'books');
                const userSnapshot = await getDocs(query(userBooksRef, orderBy('createdAt', 'desc')));
                userBooksData = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isGlobal: false }));
            }
            setPrivateBooks(userBooksData);

            // 2. Fetch Public Books (Global)
            const globalBooksRef = collection(db, 'books');
            const globalSnapshot = await getDocs(globalBooksRef);
            const allGlobalBooks = globalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isGlobal: true }));

            // Filter Public vs Pending
            const approved = allGlobalBooks.filter(b => !b.status || b.status === 'approved');
            const pending = allGlobalBooks.filter(b => b.status === 'pending');

            setPublicBooks(approved);
            setPendingBooks(pending);

        } catch (error) {
            console.error("Error fetching books:", error);
        } finally {
            setLoading(false);
        }
    };

    const seedBooks = async () => {
        setSeeding(true);
        try {
            // Fetch seed data from public assets
            const response = await fetch('/samples/ein_neues_leben.json');
            if (!response.ok) throw new Error('Failed to load seed data');
            const seedData = await response.json();

            // Use a fixed ID for the seed book so we don't create duplicates
            const bookId = 'ein_neues_leben';
            // Seed to public collection as approved by default
            const bookRef = doc(db, 'books', bookId);

            await setDoc(bookRef, {
                ...seedData,
                totalChapters: seedData.chapters.length,
                createdAt: serverTimestamp(),
                status: 'approved',
                submittedBy: 'system'
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

    const handlePushToPublic = async (book) => {
        if (!confirm(`Share "${book.title}" to the public library? It will be reviewed by an admin.`)) return;

        try {
            // Create a new document in the global 'books' collection
            // We don't use the same ID to avoid conflicts if multiple users upload same book, 
            // though for a real app we might want deduplication.
            const newBookData = {
                ...book,
                isGlobal: true,
                status: 'pending',
                submittedBy: currentUser.uid,
                submittedAt: serverTimestamp(),
                originalId: book.id // Track origin
            };

            // Remove user-specific fields if any
            delete newBookData.id;

            await addDoc(collection(db, 'books'), newBookData);
            alert("Book submitted for approval!");
            fetchBooks();
        } catch (error) {
            console.error("Error sharing book:", error);
            alert("Failed to share book.");
        }
    };

    const handleAddToPrivate = async (book) => {
        if (!currentUser) return;

        try {
            // Check if already exists? (Skipping for simplicity, Firestore will just create new doc)
            const userBooksRef = collection(db, 'users', currentUser.uid, 'books');

            const newBookData = {
                ...book,
                isGlobal: false,
                addedFromPublic: true,
                addedAt: serverTimestamp()
            };
            delete newBookData.id; // Let Firestore generate new ID for user's copy
            delete newBookData.status; // User copy doesn't need approval status

            await addDoc(userBooksRef, newBookData);
            alert("Book added to your private library!");
            setActiveTab('private');
            fetchBooks();
        } catch (error) {
            console.error("Error adding book:", error);
            alert("Failed to add book.");
        }
    };

    const handleApproveBook = async (bookId) => {
        try {
            const bookRef = doc(db, 'books', bookId);
            await updateDoc(bookRef, { status: 'approved' });
            fetchBooks();
        } catch (error) {
            console.error("Error approving book:", error);
        }
    };

    const handleRejectBook = async (bookId) => {
        if (!confirm("Are you sure you want to reject this book?")) return;
        try {
            const bookRef = doc(db, 'books', bookId);
            await updateDoc(bookRef, { status: 'rejected' });
            fetchBooks();
        } catch (error) {
            console.error("Error rejecting book:", error);
        }
    };

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, bookId: null, vocabCount: 0 });

    const initiateDeleteBook = (e, bookId) => {
        e.stopPropagation();
        const wordsToDelete = Object.values(savedVocab).filter(word => word.sourceTextId === bookId);
        setDeleteModal({ isOpen: true, bookId, vocabCount: wordsToDelete.length });
    };

    const confirmDeleteBook = async () => {
        const { bookId, vocabCount } = deleteModal;
        if (!bookId || !currentUser) return;

        try {
            // Delete associated vocab first
            if (vocabCount > 0) {
                try {
                    await deleteVocabForText(bookId);
                } catch (vocabError) {
                    console.error("Failed to delete vocab:", vocabError);
                    alert("Failed to delete associated vocabulary. Stopping delete.");
                    return;
                }
            }

            // Delete the book
            await deleteDoc(doc(db, 'users', currentUser.uid, 'books', bookId));

            fetchBooks();
        } catch (error) {
            console.error("Error deleting book:", error);
            alert("Failed to delete book: " + error.message);
        } finally {
            setDeleteModal({ isOpen: false, bookId: null, vocabCount: 0 });
        }
    };

    const processPdf = async (file, start, end) => {
        setIsProcessing(true);
        setProcessingStep('extracting');
        try {
            const result = await extractTextFromPDF(file, start, end);

            if (result.isImageOnly) {
                setIsImageOnly(true);
                setBookChunks([]);
                setPreviewText('');
            } else {
                setIsImageOnly(false);
                setTitle(prev => prev || file.name.replace('.pdf', ''));
                setPageCount(result.pageCount);
                if (end === 0 || end > result.pageCount) setEndPage(result.pageCount);

                setPreviewText(result.text.substring(0, 500) + "...");

                setProcessingStep('chunking');
                const chunks = chunkText(result.text);
                setBookChunks(chunks);
                console.log(`Chunked into ${chunks.length} parts`);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Failed to process file.');
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        setPdfFile(file);
        setStartPage(1);
        setEndPage(0); // Will be set to max pages after first read

        // Initial read of full doc (or first few pages to get count? 
        // extractTextFromPDF gets page count efficiently)
        await processPdf(file, 1, Infinity);
    };

    const handleReprocess = async () => {
        if (pdfFile) {
            await processPdf(pdfFile, startPage, endPage);
        }
    };

    const handleAutoDetectLevel = async () => {
        if (!previewText) {
            alert("Please upload a PDF first to detect level.");
            return;
        }

        setIsDetectingLevel(true);
        setDetectedReasoning('');
        try {
            const result = await detectLevel(previewText, selectedModel, targetLanguage);
            if (result.level) {
                setLevel(result.level);
                setDetectedReasoning(result.reasoning);
            }
        } catch (error) {
            console.error("Auto detect failed:", error);
            alert("Failed to detect level.");
        } finally {
            setIsDetectingLevel(false);
        }
    };

    const handleImport = async () => {
        if (!title || !pdfFile) return;

        // Close modal immediately
        setShowAddModal(false);

        // Trigger background import via hook
        try {
            await uploadBook({
                file: pdfFile,
                title,
                level,
                shouldAdapt,
                model: selectedModel,
                targetLanguage,
                onSuccess: (newBook) => {
                    // Switch to private tab to see the new book coming in
                    setActiveTab('private');
                    fetchBooks(); // Refresh to see the new book
                }
            });
        } catch (e) {
            console.error("Import failed", e);
        }
    };

    const toggleLevel = (l) => {
        setSelectedLevels(prev =>
            prev.includes(l) ? prev.filter(item => item !== l) : [...prev, l]
        );
    };

    // Filter Logic
    const filteredBooks = useMemo(() => {
        const sourceBooks = activeTab === 'private' ? privateBooks : publicBooks;

        return sourceBooks.filter(book => {
            // Search Filter
            const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());

            // Level Filter
            const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(book.level);

            return matchesSearch && matchesLevel;
        });
    }, [activeTab, privateBooks, publicBooks, searchQuery, selectedLevels]);

    if (loading && !privateBooks.length && !publicBooks.length) { // Only show full loader on initial load
        return <div className="text-center py-12 text-slate-500">Loading library...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto relative px-4">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Book className="text-indigo-600 dark:text-indigo-400" /> Books Library
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Read and manage your collection</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Admin Toggle (Simulation) */}
                    <button
                        onClick={() => setIsAdmin(!isAdmin)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${isAdmin ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                    >
                        <Shield size={14} /> {isAdmin ? 'Admin ON' : 'Admin OFF'}
                    </button>

                    {/* Seed Button */}
                    {publicBooks.length === 0 && isAdmin && (
                        <button
                            onClick={seedBooks}
                            disabled={seeding}
                            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl transition flex items-center gap-1"
                        >
                            {seeding ? "Seeding..." : "Seed Sample"}
                        </button>
                    )}

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm font-medium flex-1 md:flex-none justify-center"
                    >
                        <Plus size={18} /> Add Book
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('private')}
                    className={`px-6 py-3 font-medium text-sm transition relative ${activeTab === 'private' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <User size={16} /> My Library
                    </div>
                    {activeTab === 'private' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('public')}
                    className={`px-6 py-3 font-medium text-sm transition relative ${activeTab === 'public' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <Globe size={16} /> Public Library
                    </div>
                    {activeTab === 'public' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>
                    )}
                </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:bg-white dark:focus:bg-slate-600 transition outline-none"
                    />
                </div>

                {/* Level Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar items-center">
                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center mr-2 shrink-0">
                        <Filter size={14} className="mr-1" /> Level:
                    </span>
                    {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => (
                        <button
                            key={l}
                            onClick={() => toggleLevel(l)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${selectedLevels.includes(l)
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                                }`}
                        >
                            {l}
                        </button>
                    ))}
                    {selectedLevels.length > 0 && (
                        <button
                            onClick={() => setSelectedLevels([])}
                            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 ml-auto"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Admin Pending Section */}
            {activeTab === 'public' && isAdmin && pendingBooks.length > 0 && (
                <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                    <h3 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2 mb-4">
                        <Shield size={18} /> Pending Approvals ({pendingBooks.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingBooks.map(book => (
                            <div key={book.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-amber-100 dark:border-amber-800 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{book.title}</h4>
                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{book.level}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApproveBook(book.id)}
                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                        title="Approve"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleRejectBook(book.id)}
                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                        title="Reject"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Books Grid */}
            {filteredBooks.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <Book size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No books found.</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Try adjusting your filters or search query.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBooks.map(book => (
                        <div key={book.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition group flex flex-col h-full">
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white p-6 relative shrink-0">
                                <Book size={48} className="opacity-20 absolute right-4 bottom-4" />
                                <h3 className="text-xl font-bold text-center z-10 line-clamp-2">{book.title}</h3>
                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold">
                                    {book.level}
                                </div>
                            </div>

                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    <span>{book.totalChapters || book.chapters?.length || 0} Chapters</span>
                                    {/* Placeholder for progress */}
                                    {activeTab === 'private' && <span>0% Complete</span>}
                                </div>

                                <div className="mt-auto space-y-2">
                                    {/* Primary Action */}
                                    {activeTab === 'private' ? (
                                        <button
                                            onClick={() => navigate(`/book/${book.id}`)}
                                            className="w-full bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-medium py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-800 transition flex items-center justify-center gap-2"
                                        >
                                            <PlayCircle size={18} /> Start Reading
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAddToPrivate(book)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Download size={18} /> Add to Library
                                        </button>
                                    )}

                                    {/* Secondary Action: Share (Private Only) */}
                                    {activeTab === 'private' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePushToPublic(book)}
                                                className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium py-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition flex items-center justify-center gap-2"
                                            >
                                                <Share2 size={16} /> Share
                                            </button>
                                            <button
                                                onClick={(e) => initiateDeleteBook(e, book.id)}
                                                className="bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 py-2 px-3 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-900 transition flex items-center justify-center"
                                                title="Delete Book"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDeleteBook}
                title="Delete Book"
                message={deleteModal.vocabCount > 0
                    ? `Are you sure you want to delete this book?\n\nWARNING: This book has ${deleteModal.vocabCount} saved words associated with it. If you delete this book, those words will also be deleted from your vocabulary list.`
                    : "Are you sure you want to delete this book?"
                }
                confirmText="Delete"
                isDangerous={true}
            />

            {/* Upload Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white">Import New Book</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            {/* File Upload */}
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isProcessing}
                                />
                                {isProcessing ? (
                                    <div className="flex flex-col items-center gap-2 text-indigo-600">
                                        <Loader2 size={24} className="animate-spin" />
                                        <span className="text-sm font-medium capitalize">{processingStep}...</span>
                                    </div>
                                ) : bookChunks.length > 0 ? (
                                    <div className="flex flex-col items-center gap-2 text-green-600">
                                        <CheckCircle size={32} />
                                        <span className="font-medium">Ready to Import</span>
                                        <span className="text-xs text-slate-500">{bookChunks.length} chapters detected</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <Upload size={32} />
                                        <span className="font-medium">Upload PDF</span>
                                        <span className="text-xs">Click or drag file here</span>
                                    </div>
                                )}
                            </div>

                            {/* Image Only Warning */}
                            {isImageOnly && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                                    <div className="bg-red-100 p-1 rounded-full text-red-600 mt-0.5">
                                        <X size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-red-800">No Text Detected</h4>
                                        <p className="text-xs text-red-600 mt-1">
                                            This PDF seems to contain only images (scanned pages).
                                            We cannot extract text from it currently. Please try a text-based PDF.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Page Range & Preview */}
                            {pageCount > 0 && !isImageOnly && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Page Range (Total: {pageCount})</span>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="text-xs text-indigo-600 font-bold hover:underline"
                                        >
                                            Preview Text
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[10px] text-slate-400 mb-1">Start Page</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={endPage}
                                                value={startPage}
                                                onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] text-slate-400 mb-1">End Page</label>
                                            <input
                                                type="number"
                                                min={startPage}
                                                max={pageCount}
                                                value={endPage}
                                                onChange={(e) => setEndPage(parseInt(e.target.value) || pageCount)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleReprocess}
                                                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
                                                title="Apply Page Range"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Book Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter book title..."
                                />
                            </div>

                            {/* Level */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Target Level</label>
                                    {previewText && (
                                        <button
                                            onClick={handleAutoDetectLevel}
                                            disabled={isDetectingLevel}
                                            className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                                        >
                                            {isDetectingLevel ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                            Auto-detect
                                        </button>
                                    )}
                                </div>

                                {detectedReasoning && (
                                    <div className="mb-2 p-2 bg-indigo-50 text-indigo-700 text-xs rounded-lg border border-indigo-100 flex items-start gap-2">
                                        <Sparkles size={14} className="mt-0.5 shrink-0" />
                                        <span>{detectedReasoning}</span>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => (
                                        <button
                                            key={l}
                                            onClick={() => setLevel(l)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${level === l ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Language */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Language</label>
                                <select
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                >
                                    <option value="German">German</option>
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="French">French</option>
                                    <option value="Italian">Italian</option>
                                </select>
                            </div>

                            {/* Adaptation Toggle */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={shouldAdapt}
                                    onChange={(e) => setShouldAdapt(e.target.checked)}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                    id="adapt-toggle"
                                />
                                <label htmlFor="adapt-toggle" className="flex-1 cursor-pointer">
                                    <span className="block font-bold text-slate-700 text-sm">Adapt Content with AI</span>
                                    <span className="block text-xs text-slate-400">Simplify text to {level} level</span>
                                </label>
                            </div>

                            {/* Model Selection */}
                            {shouldAdapt && (
                                <div className="animate-in slide-in-from-top-2 fade-in">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select AI Model</label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    >
                                        {ollamaModels.length === 0 && <option>Loading models...</option>}
                                        {ollamaModels.map(model => (
                                            <option key={model.name} value={model.name}>{model.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Note: Adaptation can take a while. We'll process Chapter 1 first so you can start reading immediately.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={!title || !pdfFile}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {shouldAdapt ? <Sparkles size={18} /> : <Book size={18} />}
                                Import Book
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Text Preview</h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50">
                            <p className="text-sm text-slate-600 font-mono whitespace-pre-wrap">{previewText}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
