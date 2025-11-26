import React, { useState, useMemo } from 'react';
import {
    Search,
    Filter,
    ArrowUpDown,
    Brain,
    CheckCircle,
    Clock,
    TrendingUp,
    MoreVertical,
    Trash2,
    Edit2,
    X,
    ChevronRight,
    ChevronDown,
    Sparkles,
    Loader2,
    Volume2
} from 'lucide-react';
import { isDue } from '../services/srs';
import { generateWordDeepDive } from '../services/gemini';
import { useTTS } from '../hooks/useTTS';
import { useVocab } from '../hooks/useVocab';

const VocabDashboard = () => {
    const { savedVocab: vocab, deleteWord: onDelete, updateDefinition: onUpdate } = useVocab();
    const { speak } = useTTS();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, due, learning, mastered
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, a-z, z-a
    const [selectedWord, setSelectedWord] = useState(null);
    const [deepDiveData, setDeepDiveData] = useState(null);
    const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);

    // Reset deep dive when word changes
    React.useEffect(() => {
        setDeepDiveData(null);
        setIsLoadingDeepDive(false);
    }, [selectedWord]);

    const handleDeepDive = async () => {
        if (!selectedWord) return;
        setIsLoadingDeepDive(true);
        try {
            const data = await generateWordDeepDive(selectedWord.word, selectedWord.context);
            setDeepDiveData(data);
        } catch (error) {
            console.error("Deep dive failed:", error);
            alert("Failed to generate deep dive analysis.");
        } finally {
            setIsLoadingDeepDive(false);
        }
    };

    // --- DERIVED DATA ---
    const words = useMemo(() => Object.entries(vocab).map(([word, data]) => ({
        word,
        ...data,
        // Add derived fields for sorting/filtering if needed
        isDue: isDue(data.srs),
        mastery: data.srs?.interval || 0
    })), [vocab]);

    const stats = useMemo(() => {
        const total = words.length;
        const due = words.filter(w => w.isDue).length;
        const mastered = words.filter(w => w.mastery > 21).length; // Arbitrary threshold for "Mastered" (e.g. > 3 weeks)
        const learning = total - mastered;
        return { total, due, mastered, learning };
    }, [words]);

    const filteredWords = useMemo(() => {
        return words
            .filter(w => {
                const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (w.definition && w.definition.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesStatus =
                    filterStatus === 'all' ? true :
                        filterStatus === 'due' ? w.isDue :
                            filterStatus === 'mastered' ? w.mastery > 21 :
                                filterStatus === 'learning' ? w.mastery <= 21 : true;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                if (sortBy === 'oldest') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                if (sortBy === 'a-z') return a.word.localeCompare(b.word);
                if (sortBy === 'z-a') return b.word.localeCompare(a.word);
                return 0;
            });
    }, [words, searchQuery, filterStatus, sortBy]);

    // --- RENDERERS ---

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* HEADER & STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Words"
                    value={stats.total}
                    icon={Brain}
                    color="bg-indigo-100 text-indigo-600"
                />
                <StatCard
                    title="Due for Review"
                    value={stats.due}
                    icon={Clock}
                    color="bg-amber-100 text-amber-600"
                    subtitle="Words to practice now"
                />
                <StatCard
                    title="Mastered"
                    value={stats.mastered}
                    icon={CheckCircle}
                    color="bg-emerald-100 text-emerald-600"
                    subtitle="Interval > 21 days"
                />
                <StatCard
                    title="Learning"
                    value={stats.learning}
                    icon={TrendingUp}
                    color="bg-blue-100 text-blue-600"
                />
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search words or definitions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="due">Due for Review</option>
                        <option value="learning">Learning</option>
                        <option value="mastered">Mastered</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="a-z">A-Z</option>
                        <option value="z-a">Z-A</option>
                    </select>
                </div>
            </div>

            {/* WORD LIST */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="p-4 font-semibold">Word</th>
                                <th className="p-4 font-semibold">Definition</th>
                                <th className="p-4 font-semibold">Context</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredWords.length > 0 ? (
                                filteredWords.map((word) => (
                                    <tr
                                        key={word.word}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-700 transition group cursor-pointer"
                                        onClick={() => setSelectedWord(word)}
                                    >
                                        <td className="p-4 font-bold text-slate-800 dark:text-white">{word.word}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={word.definition}>{word.definition}</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm max-w-xs truncate italic" title={word.context}>
                                            "{word.context}"
                                        </td>
                                        <td className="p-4">
                                            {word.isDue ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Due
                                                </span>
                                            ) : word.mastery > 21 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    Mastered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Learning
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(word.word); }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                                                title="Delete Word"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <Search size={48} className="text-slate-300" />
                                            <p className="text-lg font-medium">No words found</p>
                                            <p className="text-sm">Try adjusting your filters or search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL MODAL (Placeholder for next step) */}
            {selectedWord && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedWord(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    {selectedWord.word}
                                    <button
                                        onClick={() => speak(selectedWord.word)}
                                        className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition"
                                        title="Listen"
                                    >
                                        <Volume2 size={24} />
                                    </button>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Added on {selectedWord.createdAt?.toDate()?.toLocaleDateString() || 'Unknown Date'}</p>
                            </div>
                            <button onClick={() => setSelectedWord(null)} className="p-2 hover:bg-slate-100 rounded-full transition">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Definition</label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 text-lg text-slate-800 dark:text-white">
                                    {selectedWord.definition}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Context</label>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 text-slate-700 dark:text-slate-300 italic">
                                    "{selectedWord.context}"
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                {!deepDiveData ? (
                                    <button
                                        onClick={handleDeepDive}
                                        disabled={isLoadingDeepDive}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-200"
                                    >
                                        {isLoadingDeepDive ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                        {isLoadingDeepDive ? "Analyzing Word..." : "Generate AI Deep Dive"}
                                    </button>
                                ) : (
                                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                        {/* Deep Dive Content */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                                                    <Clock size={16} /> Etymology
                                                </h4>
                                                <p className="text-sm text-amber-900 leading-relaxed">{deepDiveData.etymology}</p>
                                            </div>
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                                    <Brain size={16} /> Mnemonics
                                                </h4>
                                                <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
                                                    {deepDiveData.mnemonics.map((m, i) => <li key={i}>{m}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <Sparkles size={16} className="text-indigo-500" /> Usage Examples
                                            </h4>
                                            <div className="space-y-3">
                                                {deepDiveData.examples.map((ex, i) => (
                                                    <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 transition">
                                                        <p className="text-slate-800 font-medium">{ex.german}</p>
                                                        <p className="text-slate-500 text-sm">{ex.english}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                            <h4 className="font-bold text-purple-800 mb-2">Usage Notes</h4>
                                            <p className="text-sm text-purple-900 leading-relaxed">{deepDiveData.usage_notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocabDashboard;
