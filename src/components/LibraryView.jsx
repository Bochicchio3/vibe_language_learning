import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Plus,
    Search,
    Filter,
    Clock,
    MoreVertical,
    Trash2,
    CheckCircle,
    Circle,
    Book,
    BarChart2,
    AlertCircle,
    Sparkles,
    Globe,
    Share2,
    Download,
    Shield,
    Check,
    X,
    Brain
} from 'lucide-react';
import NewsModal from './library/NewsModal';
import ConfirmationModal from './ConfirmationModal';
import StoryGeneratorModal from './library/StoryGeneratorModal';
import { useAuth } from '../contexts/AuthContext';
import { useVocab } from '../hooks/useVocab';
import { useLibrary } from '../hooks/useLibrary';
import { db } from '../firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    where
} from 'firebase/firestore';

export default function LibraryView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { savedVocab, deleteVocabForText } = useVocab();
    const { saveText, deleteText, toggleReadStatus } = useLibrary();

    // Local state for admin (could be moved to context)
    const [isAdmin, setIsAdmin] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [showNewsModal, setShowNewsModal] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [generatorInitialTopic, setGeneratorInitialTopic] = useState('');

    // Public/Private State
    const [activeTab, setActiveTab] = useState('private'); // 'private' | 'public'
    const [privateTexts, setPrivateTexts] = useState([]);
    const [publicTexts, setPublicTexts] = useState([]);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!currentUser) return;

        // 1. Fetch Private Texts
        const privateRef = collection(db, 'users', currentUser.uid, 'texts');
        const qPrivate = query(privateRef, orderBy('createdAt', 'desc'));

        const unsubscribePrivate = onSnapshot(qPrivate, (snapshot) => {
            const texts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPrivateTexts(texts);
        });

        // 2. Fetch Public Texts
        const publicRef = collection(db, 'texts');
        // In a real app, we might limit this query or paginate
        const qPublic = query(publicRef, orderBy('createdAt', 'desc'));

        const unsubscribePublic = onSnapshot(qPublic, (snapshot) => {
            const texts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPublicTexts(texts);
        });

        return () => {
            unsubscribePrivate();
            unsubscribePublic();
        };
    }, [currentUser]);

    // --- ACTIONS ---

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, textId: null, vocabCount: 0 });

    const initiateDelete = (e, textId) => {
        e.stopPropagation();
        const vocabCount = getVocabCount(textId);
        setDeleteModal({ isOpen: true, textId, vocabCount });
    };

    const confirmDelete = async () => {
        const { textId, vocabCount } = deleteModal;
        if (!textId || !currentUser) return;

        try {
            if (activeTab === 'private') {
                // Delete associated vocab first
                if (vocabCount > 0) {
                    try {
                        await deleteVocabForText(textId);
                    } catch (vocabError) {
                        console.error("Failed to delete vocab:", vocabError);
                        alert("Failed to delete associated vocabulary. Stopping delete.");
                        return;
                    }
                }

                await deleteText(textId);
            } else if (isAdmin) {
                await deleteDoc(doc(db, 'texts', textId));
            }
        } catch (error) {
            console.error("Error deleting text:", error);
            alert("Failed to delete text: " + error.message);
        } finally {
            setDeleteModal({ isOpen: false, textId: null, vocabCount: 0 });
        }
    };

    const handleToggleRead = async (textId, isRead) => {
        if (!currentUser || activeTab !== 'private') return;
        await toggleReadStatus(textId, isRead);
    };

    const handleShareToPublic = async (text) => {
        if (!window.confirm('Share this story to the Public Library? It will be reviewed by an admin.')) return;

        try {
            await addDoc(collection(db, 'texts'), {
                title: text.title,
                content: text.content,
                level: text.level,
                status: 'pending',
                submittedBy: currentUser.uid,
                submittedAt: serverTimestamp(),
                originalId: text.id,
                likes: 0,
                downloads: 0
            });
            alert('Story submitted for review!');
        } catch (error) {
            console.error("Error sharing story:", error);
            alert("Failed to share story.");
        }
    };

    const handleAddToLibrary = async (text) => {
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'texts'), {
                title: text.title,
                content: text.content,
                level: text.level,
                createdAt: serverTimestamp(),
                isRead: false,
                originPublicId: text.id
            });
            alert('Story added to your library!');
        } catch (error) {
            console.error("Error adding to library:", error);
            alert("Failed to add story to library.");
        }
    };

    const handleApprove = async (textId) => {
        try {
            await updateDoc(doc(db, 'texts', textId), { status: 'approved' });
        } catch (error) {
            console.error("Error approving:", error);
        }
    };

    const handleReject = async (textId) => {
        if (!window.confirm('Reject this story?')) return;
        try {
            await updateDoc(doc(db, 'texts', textId), { status: 'rejected' });
        } catch (error) {
            console.error("Error rejecting:", error);
        }
    };

    // --- HELPERS ---
    const getWordCount = (text) => text.split(/\s+/).length;
    const getReadingTime = (text) => Math.ceil(getWordCount(text) / 200); // ~200 wpm

    // Calculate stats for a text
    const getTextStats = (text) => {
        if (!text.content) return { unknownCount: 0, unknownPercent: 0, totalWords: 0 };

        // Simple tokenization to match App.jsx logic roughly
        const words = text.content.split(/([^\wäöüÄÖÜß]+)/).filter(w => /\w/.test(w));

        // Get unique words (case-insensitive for counting unique words)
        const uniqueWords = new Set();
        const wordMapping = new Map(); // Map lowercase -> original case
        words.forEach(word => {
            const cleanWord = word.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            if (cleanWord) {
                const lowerWord = cleanWord.toLowerCase();
                uniqueWords.add(lowerWord);
                // Store the first occurrence's case
                if (!wordMapping.has(lowerWord)) {
                    wordMapping.set(lowerWord, cleanWord);
                }
            }
        });

        const totalUniqueWords = uniqueWords.size;
        if (totalUniqueWords === 0) return { unknownCount: 0, unknownPercent: 0, totalWords: 0 };

        // Count how many unique words are in savedVocab
        // savedVocab stores words without lowercasing, so we need to check the original case
        let unknownCount = 0;
        uniqueWords.forEach(lowerWord => {
            const originalCase = wordMapping.get(lowerWord);
            if (savedVocab && savedVocab.hasOwnProperty(originalCase)) {
                unknownCount++;
            }
        });

        return {
            unknownCount,
            unknownPercent: Math.round((unknownCount / totalUniqueWords) * 100),
            totalWords: totalUniqueWords
        };
    };

    // Get vocabulary count for a specific text
    const getVocabCount = (textId) => {
        if (!savedVocab) return 0;
        return Object.values(savedVocab).filter(word => word.sourceTextId === textId).length;
    };

    const getDifficultyColor = (stats, isRead) => {
        // Completed stories (marked as read) get amber/gold color (MASTERED)
        if (isRead) return 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20';

        // In progress stories (have saved vocabulary) get difficulty-based colors
        if (stats.unknownCount > 0) {
            if (stats.unknownPercent < 5) return 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20'; // Easy (green)
            if (stats.unknownPercent < 15) return 'border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20'; // Medium (yellow)
            return 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/20'; // Hard (red)
        }

        // Unread/not started
        return 'border-slate-200 dark:border-slate-700';
    };

    const getDifficultyBadge = (percent, isRead) => {
        if (percent === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">MASTERED</span>;
        if (percent < 5) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">EASY</span>;
        if (percent < 15) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">MEDIUM</span>;
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">HARD</span>;
    };

    const toggleLevel = (level) => {
        if (level === 'All') {
            setSelectedLevels([]);
            return;
        }
        setSelectedLevels(prev => {
            if (prev.includes(level)) {
                return prev.filter(l => l !== level);
            } else {
                return [...prev, level];
            }
        });
    };

    const toggleStatus = (status) => {
        if (status === 'All') {
            setSelectedStatuses([]);
            return;
        }
        setSelectedStatuses(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            } else {
                return [...prev, status];
            }
        });
    };

    // GenerateBox Component
    const GenerateBox = () => {
        const [topic, setTopic] = useState('');

        const handleSubmit = (e) => {
            e.preventDefault();
            setGeneratorInitialTopic(topic);
            setShowGeneratorModal(true);
        };

        return (
            <div className="group bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-sm border-2 border-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Sparkle decorations */}
                <div className="absolute top-4 right-4">
                    <Sparkles className="text-white/30 group-hover:text-white/50 transition-colors" size={28} />
                </div>
                <div className="absolute bottom-4 left-4">
                    <Sparkles className="text-white/20 group-hover:text-white/40 transition-colors" size={20} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-white">Generate Story</h3>
                            <p className="text-white/80 text-xs">AI-powered German text</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter a topic (optional)..."
                            className="w-full p-3 bg-white/90 backdrop-blur-sm border-none rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-white focus:bg-white transition outline-none"
                        />

                        <button
                            type="submit"
                            className="w-full py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-white/90 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <Sparkles size={18} />
                            Generate
                        </button>
                    </form>

                    <p className="text-white/60 text-[10px] mt-3 text-center italic">
                        Create custom German texts at your level
                    </p>
                </div>
            </div>
        );
    };

    // --- DERIVED STATE ---
    const filteredTexts = useMemo(() => {
        let sourceTexts = activeTab === 'private' ? privateTexts : publicTexts;

        // Filter out pending/rejected for non-admins in public tab
        if (activeTab === 'public' && !isAdmin) {
            sourceTexts = sourceTexts.filter(t => t.status === 'approved');
        }

        return sourceTexts.filter(text => {
            const stats = getTextStats(text);

            // Search
            const matchesSearch =
                text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                text.content.toLowerCase().includes(searchQuery.toLowerCase());

            // Level (Multi-select)
            const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(text.level);

            // Status Filter (Multi-select)
            let matchesStatus = true;
            if (selectedStatuses.length > 0) {
                const isUnread = !text.isRead && stats.unknownCount === 0; // Not marked as read AND no saved vocabulary
                const isCompleted = text.isRead; // Marked as read (checked)
                const isInProgress = stats.unknownCount > 0; // Has saved vocabulary words
                const isPending = text.status === 'pending';

                matchesStatus = selectedStatuses.some(status => {
                    if (status === 'Unread') return isUnread;
                    if (status === 'Completed') return isCompleted;
                    if (status === 'In Progress') return isInProgress;
                    if (status === 'Pending') return isPending;
                    return false;
                });
            }

            // Hide completed stories by default UNLESS Completed status filter is selected
            if (selectedStatuses.length === 0 || !selectedStatuses.includes('Completed')) {
                if (text.isRead) {
                    return false;
                }
            }

            return matchesSearch && matchesLevel && matchesStatus;
        });
    }, [privateTexts, publicTexts, searchQuery, selectedLevels, selectedStatuses, savedVocab, activeTab, isAdmin]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Library</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and read your German texts</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowNewsModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 px-5 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-700 transition font-medium shadow-sm"
                    >
                        <Globe size={18} /> Daily News
                    </button>
                    <button
                        onClick={() => navigate('/import')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm hover:shadow-md"
                    >
                        <Plus size={18} /> Add Text
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mb-8">
                <button
                    onClick={() => setActiveTab('private')}
                    className={`pb-4 px-2 font-medium text-sm transition relative ${activeTab === 'private' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    My Library
                    {activeTab === 'private' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('public')}
                    className={`pb-4 px-2 font-medium text-sm transition relative ${activeTab === 'public' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Public Library
                    {activeTab === 'public' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
                </button>
            </div>

            {/* Filters & Search Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 flex flex-col gap-4">
                {/* Top Row: Search */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search titles or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:bg-white dark:focus:bg-slate-600 transition outline-none"
                    />
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    {/* Level Filter */}
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <span className="text-sm font-medium text-slate-400 flex items-center mr-2">Level:</span>
                        {['All', 'A1', 'A2', 'B1', 'B2', 'C1'].map(level => {
                            const isSelected = level === 'All' ? selectedLevels.length === 0 : selectedLevels.includes(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => toggleLevel(level)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${isSelected
                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar border-l pl-4 border-slate-100">
                        <span className="text-sm font-medium text-slate-400 flex items-center mr-2">Status:</span>
                        {['All', 'Unread', 'In Progress', 'Completed', ...(activeTab === 'public' && isAdmin ? ['Pending'] : [])].map(status => {
                            const isSelected = status === 'All' ? selectedStatuses.length === 0 : selectedStatuses.includes(status);
                            return (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${isSelected
                                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {status}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            {filteredTexts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-indigo-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No texts found</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        We couldn't find any texts matching your filters. Try adjusting them or add a new text.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Generate Box - First Item (Only in Private) */}
                    {activeTab === 'private' && <GenerateBox />}

                    {filteredTexts.map(text => {
                        const stats = getTextStats(text);
                        const difficultyColor = getDifficultyColor(stats, text.isRead);
                        const isPending = text.status === 'pending';

                        return (
                            <div
                                key={text.id}
                                onClick={() => navigate(`/read/${text.id}`)}
                                className={`group bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden ${difficultyColor} ${isPending ? 'opacity-75 border-dashed' : ''}`}
                            >
                                {/* Decorative Gradient Blob - Hidden on mobile */}
                                <div className="hidden md:block absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-2xl opacity-50"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-3 md:mb-4">
                                        <div className="flex gap-2 items-center">
                                            <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                {text.level}
                                            </span>
                                            {getDifficultyBadge(stats.unknownPercent, text.isRead)}
                                            {isPending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">PENDING</span>}
                                        </div>

                                        <div className="flex gap-1">
                                            {/* Share Icon (Private Only) */}
                                            {activeTab === 'private' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShareToPublic(text);
                                                    }}
                                                    className="p-1.5 md:p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition"
                                                    title="Share to Public Library"
                                                >
                                                    <Share2 size={16} className="md:w-[18px] md:h-[18px]" />
                                                </button>
                                            )}

                                            {/* Add to Library (Public Only) */}
                                            {activeTab === 'public' && !isPending && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToLibrary(text);
                                                    }}
                                                    className="p-1.5 md:p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-full transition"
                                                    title="Add to My Library"
                                                >
                                                    <Download size={16} className="md:w-[18px] md:h-[18px]" />
                                                </button>
                                            )}

                                            {/* Admin Actions */}
                                            {activeTab === 'public' && isAdmin && isPending && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApprove(text.id); }}
                                                        className="p-1.5 md:p-2 text-green-500 hover:bg-green-50 rounded-full transition"
                                                        title="Approve"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleReject(text.id); }}
                                                        className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                                                        title="Reject"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {/* Private Actions */}
                                            {activeTab === 'private' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleRead(text.id, !text.isRead);
                                                        }}
                                                        className={`p-1.5 md:p-2 rounded-full transition ${text.isRead
                                                            ? 'text-green-500 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                                                            : 'text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                            }`}
                                                        title={text.isRead ? "Mark as Incomplete" : "Mark as Complete"}
                                                    >
                                                        {text.isRead ? <CheckCircle size={16} className="md:w-[18px] md:h-[18px]" /> : <Circle size={16} className="md:w-[18px] md:h-[18px]" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => initiateDelete(e, text.id)}
                                                        className="p-1.5 md:p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                                        title="Delete Text"
                                                    >
                                                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                                                    </button>
                                                </>
                                            )}

                                            {/* Admin Delete for Public */}
                                            {activeTab === 'public' && isAdmin && (
                                                <button
                                                    onClick={(e) => initiateDelete(e, text.id)}
                                                    className="bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 py-2 px-3 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-900 transition flex items-center justify-center"
                                                    title="Delete Text"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg md:text-xl text-slate-800 dark:text-white mb-2 md:mb-3 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {text.title}
                                    </h3>

                                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm line-clamp-2 md:line-clamp-3 mb-4 md:mb-6 leading-relaxed">
                                        {text.content}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3 md:pt-4">
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-1" title="Word Count">
                                                <BookOpen size={12} className="md:w-[14px] md:h-[14px]" />
                                                {stats.totalWords}
                                            </div>
                                            <div className="flex items-center gap-1" title="Reading Time">
                                                <Clock size={12} className="md:w-[14px] md:h-[14px]" />
                                                {getReadingTime(text.content)}m
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full" title={`${stats.unknownCount} unknown words (${stats.unknownPercent}%)`}>
                                            <BarChart2 size={10} className="md:w-[12px] md:h-[12px]" />
                                            {stats.unknownCount} new words ({stats.unknownPercent}%)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title="Delete Text"
                message={deleteModal.vocabCount > 0
                    ? `Are you sure you want to delete this text?\n\nWARNING: This text has ${deleteModal.vocabCount} saved words associated with it. If you delete this text, those words will also be deleted from your vocabulary list.`
                    : "Are you sure you want to delete this text?"
                }
                confirmText="Delete"
                isDangerous={true}
            />

            {/* News Modal */}
            {showNewsModal && (
                <NewsModal
                    onClose={() => setShowNewsModal(false)}
                    onSaveText={saveText}
                />
            )}

            {showGeneratorModal && (
                <StoryGeneratorModal
                    onClose={() => {
                        setShowGeneratorModal(false);
                        setGeneratorInitialTopic('');
                    }}
                    initialTopic={generatorInitialTopic}
                />
            )}
        </div>
    );
}
