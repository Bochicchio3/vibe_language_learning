import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateStory as generateGeminiStory } from '../../services/gemini';
import { generateStory as generateOllamaStory, fetchModels as fetchOllamaModels } from '../../services/ollama';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';

export default function GeneratorView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [topic, setTopic] = useState('');
    const [theme, setTheme] = useState('');
    const [level, setLevel] = useState('A2');
    const [length, setLength] = useState('Medium');
    const [provider, setProvider] = useState('gemini');
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState(null);

    // Check for pre-filled topic from library generate box
    useEffect(() => {
        const savedTopic = localStorage.getItem('generatorTopic');
        if (savedTopic) {
            setTopic(savedTopic);
            localStorage.removeItem('generatorTopic'); // Clear it after using
        }
    }, []);

    useEffect(() => {
        if (provider === 'ollama') {
            fetchOllamaModels().then(models => {
                setOllamaModels(models);
                if (models.length > 0 && !selectedOllamaModel) {
                    setSelectedOllamaModel(models[0].name);
                }
            });
        }
    }, [provider]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenerating(true);
        setGeneratedStory(null);
        try {
            let story;
            if (provider === 'gemini') {
                story = await generateGeminiStory(topic, level, length, theme);
            } else {
                if (!selectedOllamaModel) throw new Error("No Ollama model selected");
                story = await generateOllamaStory(topic, level, length, theme, selectedOllamaModel);
            }
            setGeneratedStory(story);
        } catch (error) {
            console.error("Generation error:", error);
            alert(`Failed to generate story: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveGenerated = async () => {
        if (!generatedStory || !currentUser) return;
        console.log("Saving story:", generatedStory);

        try {
            const newDocRef = doc(collection(db, 'users', currentUser.uid, 'texts'));
            await setDoc(newDocRef, {
                title: generatedStory.title,
                level: level,
                content: generatedStory.content,
                questions: [],
                createdAt: serverTimestamp()
            });

            console.log("Story saved successfully with ID:", newDocRef.id);
            alert("Story saved to library!");
            navigate('/library');
        } catch (error) {
            console.error("Error preparing save:", error);
            alert("Failed to save story.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Sparkles className="text-indigo-600" /> AI Story Generator
            </h2>

            {!generatedStory ? (
                <form onSubmit={handleGenerate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                        <input
                            required
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., A day at the beach, Space travel, Cooking dinner..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Theme (Optional)</label>
                            <input
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g., Mystery, Sci-Fi..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Model Provider</label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="gemini">Gemini (Cloud)</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </div>
                    </div>

                    {provider === 'ollama' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ollama Model</label>
                            <select
                                value={selectedOllamaModel}
                                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {ollamaModels.length === 0 && <option value="">Loading models...</option>}
                                {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                            </select>
                            {ollamaModels.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Make sure Ollama is running!</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="A1">A1 (Beginner)</option>
                                <option value="A2">A2 (Elementary)</option>
                                <option value="B1">B1 (Intermediate)</option>
                                <option value="B2">B2 (Upper Intermediate)</option>
                                <option value="C1">C1 (Advanced)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Length</label>
                            <select
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="Short">Short (~100 words)</option>
                                <option value="Medium">Medium (~250 words)</option>
                                <option value="Long">Long (~500 words)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={generating}
                        className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="animate-spin" /> Generating Magic...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} /> Generate Story
                            </>
                        )}
                    </button>
                </form>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">{generatedStory.title}</h3>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{generatedStory.content}</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setGeneratedStory(null)}
                            className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-lg font-medium hover:bg-slate-200 transition"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSaveGenerated}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                        >
                            <CheckCircle size={20} /> Save to Library
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
