import React, { useState, useEffect } from 'react';
import { X, Globe, ChevronRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { fetchNewsByCategory, getCategories } from '../../services/news';
import { adaptContent, fetchModels } from '../../services/ollama';

export default function NewsModal({ onClose, onSaveText }) {
    const [category, setCategory] = useState('General');
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adaptingId, setAdaptingId] = useState(null); // ID (link) of article being adapted
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [error, setError] = useState(null);

    const categories = getCategories();

    useEffect(() => {
        loadNews(category);
        loadModels();
    }, []);

    const loadModels = async () => {
        try {
            const m = await fetchModels();
            setModels(m);
            if (m.length > 0) setSelectedModel(m[0].name);
        } catch (e) {
            console.error("Failed to load models", e);
        }
    };

    const loadNews = async (cat) => {
        setLoading(true);
        setError(null);
        try {
            const news = await fetchNewsByCategory(cat);
            setArticles(news);
        } catch (err) {
            setError("Failed to fetch news. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = (cat) => {
        setCategory(cat);
        loadNews(cat);
    };

    const handleAdapt = async (article) => {
        if (!selectedModel) {
            alert("Please select an AI model first.");
            return;
        }

        setAdaptingId(article.link);
        try {
            // 1. Adapt the content
            const result = await adaptContent(article.content, "A2", selectedModel);
            const adaptedContent = typeof result === 'object' ? result.content : result;

            // 2. Save to library
            await onSaveText({
                title: article.title,
                content: adaptedContent,
                level: "A2" // Defaulting to A2 for now as per prompt "simplified... to correct level" (assuming A2 is good default or user pref)
            });

            alert("Article adapted and added to your library!");
            onClose(); // Close modal on success
        } catch (err) {
            console.error("Adaptation failed", err);
            alert("Failed to adapt article. Check console.");
        } finally {
            setAdaptingId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Globe className="text-indigo-600" /> Daily German News
                        </h2>
                        <p className="text-slate-500 text-sm">Read current events simplified for you</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${category === cat
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-48"
                        >
                            {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                            {models.length === 0 && <option>Loading models...</option>}
                        </select>
                        <button
                            onClick={() => loadNews(category)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition"
                            title="Refresh News"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 size={48} className="animate-spin mb-4 text-indigo-400" />
                            <p>Fetching latest news...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-500">
                            <p>{error}</p>
                            <button onClick={() => loadNews(category)} className="mt-4 text-indigo-600 hover:underline">Try Again</button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {articles.map((article, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{article.source}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(article.pubDate).toLocaleDateString()}</span>
                                    </div>

                                    <h3 className="font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                        {article.title.replace(/^(heise\+|ZEIT ONLINE \|)\s*\|?\s*/i, '').replace(/WTF:\s*/i, '')}
                                    </h3>

                                    <div className="mb-4">
                                        <p className={`text-sm text-slate-500 ${article.expanded ? '' : 'line-clamp-3'}`}>
                                            {article.content.replace(/<[^>]*>/g, '')}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setArticles(prev => prev.map((a, i) => i === idx ? { ...a, expanded: !a.expanded } : a));
                                            }}
                                            className="text-xs text-indigo-600 font-medium mt-1 hover:underline"
                                        >
                                            {article.expanded ? 'Show Less' : 'Read More'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleAdapt(article)}
                                        disabled={adaptingId !== null}
                                        className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${adaptingId === article.link
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                                            }`}
                                    >
                                        {adaptingId === article.link ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Simplifying...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} />
                                                Simplify & Read
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
