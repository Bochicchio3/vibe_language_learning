import React, { useState, useEffect } from 'react';
import {
    PenTool,
    Sparkles,
    Save,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Loader2,
    BookOpen,
    Wand2,
    Lightbulb
} from 'lucide-react';
import { analyzeWriting as analyzeOllama, fetchModels } from '../../services/ollama';
import { analyzeWriting as analyzeGemini } from '../../services/gemini';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const TOPICS = [
    "My daily routine",
    "A memorable vacation",
    "Why I am learning German",
    "My favorite food",
    "A dream I had",
    "My hometown",
    "A funny misunderstanding",
    "Plans for the future",
    "If I won the lottery",
    "My best friend"
];

export default function WritingPractice({ savedVocab, onSave }) {
    const { currentUser } = useAuth();
    const [text, setText] = useState('');
    const [topic, setTopic] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [provider, setProvider] = useState('gemini');
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
    const [randomVocab, setRandomVocab] = useState([]);

    useEffect(() => {
        if (provider === 'ollama') {
            fetchModels().then(models => {
                setOllamaModels(models);
                if (models.length > 0 && !selectedOllamaModel) {
                    setSelectedOllamaModel(models[0].name);
                }
            });
        }
    }, [provider]);

    useEffect(() => {
        // Pick 5 random words from saved vocab to suggest
        if (savedVocab) {
            const words = Object.keys(savedVocab);
            const shuffled = words.sort(() => 0.5 - Math.random());
            setRandomVocab(shuffled.slice(0, 5));
        }
    }, [savedVocab]);

    const handleRandomTopic = () => {
        const random = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        setTopic(random);
    };

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setIsAnalyzing(true);
        setFeedback(null);
        try {
            let result;
            if (provider === 'gemini') {
                result = await analyzeGemini(text);
            } else {
                if (!selectedOllamaModel) throw new Error("No Ollama model selected");
                result = await analyzeOllama(text, selectedOllamaModel);
            }
            setFeedback(result);
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Failed to analyze writing. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveToLibrary = async () => {
        if (!currentUser || !text.trim()) return;

        const titleToSave = topic || "Writing Practice " + new Date().toLocaleDateString();

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'texts'), {
                title: titleToSave,
                content: feedback?.correctedText || text, // Save corrected version if available? Or maybe original? Let's save corrected if available, or ask user. For now, let's save the corrected one if they accepted it, but here we just have feedback. Let's save the current text in the textarea.
                // Actually, let's save what's in the textarea. If they want to save corrected, they should copy it over or we provide a button "Apply Corrections".
                // Let's stick to saving the current text state.
                level: feedback?.rating || "Unrated",
                questions: [],
                createdAt: serverTimestamp(),
                isUserGenerated: true
            });
            alert("Saved to Library!");
            if (onSave) onSave();
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to save.");
        }
    };

    const applyCorrection = () => {
        if (feedback?.correctedText) {
            setText(feedback.correctedText);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Left Column: Writing Area */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm flex-grow flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <PenTool className="text-indigo-600 dark:text-indigo-400" /> Writing Practice
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRandomTopic}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 px-3 py-1 rounded-full transition flex items-center gap-1"
                            >
                                <Lightbulb size={16} /> New Topic
                            </button>
                        </div>
                    </div>

                    {topic && (
                        <div className="bg-indigo-50 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 p-3 rounded-lg mb-4 text-sm font-medium flex justify-between items-center animate-in fade-in">
                            <span>Topic: {topic}</span>
                            <button onClick={() => setTopic('')} className="hover:text-indigo-900 dark:hover:text-indigo-100"><RotateCcw size={14} /></button>
                        </div>
                    )}

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Start writing in German here..."
                        className="flex-grow w-full p-4 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans text-lg leading-relaxed placeholder-slate-400 dark:placeholder-slate-500"
                    />

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-slate-400 dark:text-slate-500 text-sm">
                            {text.trim().split(/\s+/).filter(w => w.length > 0).length} words
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2 outline-none"
                            >
                                <option value="gemini">Gemini</option>
                                <option value="ollama">Ollama</option>
                            </select>

                            {provider === 'ollama' && (
                                <select
                                    value={selectedOllamaModel}
                                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                    className="text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-2 outline-none max-w-[100px]"
                                >
                                    {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                                </select>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !text.trim()}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                Analyze
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Feedback & Tools */}
            <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
                {/* Vocabulary Hints */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <BookOpen size={18} className="text-amber-500 dark:text-amber-400" /> Vocabulary Challenge
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Try to use these words from your list:</p>
                    <div className="flex flex-wrap gap-2">
                        {randomVocab.length > 0 ? randomVocab.map(word => (
                            <span key={word} className="bg-amber-50 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded text-sm border border-amber-100 dark:border-amber-800">
                                {word}
                            </span>
                        )) : (
                            <span className="text-slate-400 dark:text-slate-500 text-sm italic">No saved words yet.</span>
                        )}
                    </div>
                </div>

                {/* Feedback Area */}
                {feedback ? (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm flex-grow animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CheckCircle className="text-green-500 dark:text-green-400" size={20} /> AI Feedback
                            </h3>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                                {feedback.rating || "N/A"}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 italic">
                                "{feedback.feedback}"
                            </div>

                            {feedback.corrections && feedback.corrections.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Corrections</h4>
                                    <div className="space-y-2">
                                        {feedback.corrections.map((c, i) => (
                                            <div key={i} className="text-sm border-l-2 border-red-400 pl-3 py-1">
                                                <div className="text-red-500 line-through text-xs">{c.original}</div>
                                                <div className="text-green-600 font-medium">{c.correction}</div>
                                                <div className="text-slate-400 text-xs">{c.explanation}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {feedback.suggestions && feedback.suggestions.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Suggestions</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                        {feedback.suggestions.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-4 flex gap-2">
                                <button
                                    onClick={applyCorrection}
                                    className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition flex justify-center items-center gap-2"
                                >
                                    <Wand2 size={16} /> Apply Fixes
                                </button>
                                <button
                                    onClick={handleSaveToLibrary}
                                    className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition flex justify-center items-center gap-2"
                                >
                                    <Save size={16} /> Save Text
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm flex-grow flex flex-col justify-center items-center text-center text-slate-400 dark:text-slate-500">
                        <Sparkles size={48} className="mb-4 text-slate-200 dark:text-slate-700" />
                        <p>Write something and click "Analyze" to get AI feedback on your grammar and style.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
