import React, { useState, useMemo } from 'react';
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
    AlertCircle
} from 'lucide-react';

export default function LibraryView({
    texts,
    savedVocab,
    onSelect,
    onDelete,
    onToggleRead,
    onSeed,
    onAdd
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]); 

    // --- HELPERS ---
    const getWordCount = (text) => text.split(/\s+/).length;
    const getReadingTime = (text) => Math.ceil(getWordCount(text) / 200); // ~200 wpm

    // Calculate stats for a text
    const getTextStats = (text) => {
        if (!text.content) return { unknownCount: 0, unknownPercent: 0, totalWords: 0 };

        // Simple tokenization to match App.jsx logic roughly
        const words = text.content.split(/([^\wäöüÄÖÜß]+)/).filter(w => /\w/.test(w));
        const totalWords = words.length;

        if (totalWords === 0) return { unknownCount: 0, unknownPercent: 0, totalWords: 0 };

        let unknownCount = 0;
        words.forEach(word => {
            const cleanWord = word.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
            if (savedVocab && savedVocab.hasOwnProperty(cleanWord)) {
                unknownCount++;
            }
        });

        return {
            unknownCount,
            unknownPercent: Math.round((unknownCount / totalWords) * 100),
            totalWords
        };
    };

    const getDifficultyColor = (percent, isRead) => {
        if (!isRead) return 'border-slate-200'; // Default for unread
        if (percent === 0) return 'border-amber-400 bg-amber-50'; // Completed (Gold)
        if (percent < 5) return 'border-green-400 bg-green-50'; // Easy
        if (percent < 15) return 'border-yellow-400 bg-yellow-50'; // Medium
        return 'border-red-400 bg-red-50'; // Hard
    };

    const getDifficultyBadge = (percent, isRead) => {
        if (!isRead) return null;
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

    // --- DERIVED STATE ---
    const filteredTexts = useMemo(() => {
        return texts.filter(text => {
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
                const isUnread = !text.isRead;
                const isCompleted = text.isRead && stats.unknownPercent === 0;
                const isInProgress = text.isRead && stats.unknownPercent > 0;

                matchesStatus = selectedStatuses.some(status => {
                    if (status === 'Unread') return isUnread;
                    if (status === 'Completed') return isCompleted;
                    if (status === 'In Progress') return isInProgress;
                    return false;
                });
            }

            return matchesSearch && matchesLevel && matchesStatus;
        });
    }, [texts, searchQuery, selectedLevels, selectedStatuses, savedVocab]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Your Library</h2>
                    <p className="text-slate-500 mt-1">Manage and read your German texts</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={onSeed}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition font-medium shadow-sm"
                    >
                        <Book size={18} /> Seed Samples
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm hover:shadow-md"
                    >
                        <Plus size={18} /> Add Text
                    </button>
                </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col gap-4">
                {/* Top Row: Search */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search titles or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none"
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
                                            ? 'bg-slate-800 text-white shadow-md'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
                        {['All', 'Unread', 'In Progress', 'Completed'].map(status => {
                            const isSelected = status === 'All' ? selectedStatuses.length === 0 : selectedStatuses.includes(status);
                            return (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${isSelected
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-indigo-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No texts found</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        We couldn't find any texts matching your filters. Try adjusting them or add a new text.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTexts.map(text => {
                        const stats = getTextStats(text);
                        const difficultyColor = getDifficultyColor(stats.unknownPercent, text.isRead);

                        return (
                            <div
                                key={text.id}
                                onClick={() => onSelect(text.id)}
                                className={`group bg-white rounded-2xl p-6 shadow-sm border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden ${difficultyColor}`}
                            >
                                {/* Decorative Gradient Blob */}
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-2xl opacity-50"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-2 items-center">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                {text.level}
                                            </span>
                                            {getDifficultyBadge(stats.unknownPercent, text.isRead)}
                                        </div>

                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleRead(text.id, !text.isRead);
                                                }}
                                                className={`p-2 rounded-full transition ${text.isRead
                                                        ? 'text-green-500 bg-green-50 hover:bg-green-100'
                                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                title={text.isRead ? "Mark as Unread" : "Mark as Read"}
                                            >
                                                {text.isRead ? <CheckCircle size={18} /> : <Circle size={18} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('Are you sure you want to delete this text?')) {
                                                        onDelete(text.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                                title="Delete Text"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-xl text-slate-800 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        {text.title}
                                    </h3>

                                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                                        {text.content}
                                    </p>

                                    <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-t border-slate-100 pt-4">
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-1.5" title="Word Count">
                                                <BookOpen size={14} />
                                                {stats.totalWords}
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Reading Time">
                                                <Clock size={14} />
                                                {getReadingTime(text.content)}m
                                            </div>
                                        </div>

                                        {/* Stats Display */}
                                        {text.isRead && (
                                            <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full" title={`${stats.unknownCount} unknown words`}>
                                                <BarChart2 size={12} />
                                                {stats.unknownPercent}% New
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
