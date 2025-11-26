import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { useVocab } from '../hooks/useVocab';
import { Loader2, Volume2, Brain, Sparkles, ChevronLeft, RotateCcw, BookOpen, MessageCircle, GraduationCap, Play, X } from 'lucide-react';
import { simplifyStory, fetchModels, explainText, generateComprehensionQuestions } from '../services/ollama';
import { tokenize } from '../utils/textUtils';
import { recordReadingSession } from '../services/activityTracker';

export default function ReaderView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { savedVocab, toggleWord, translatingWord } = useVocab();
    const { speak, stop, isPlaying, isLoading, isModelLoading, currentSentenceIndex, generatingSentences } = useTTS();

    const [activeText, setActiveText] = useState(null);
    const [loadingText, setLoadingText] = useState(true);

    const [selection, setSelection] = useState(null);
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [simplifiedContent, setSimplifiedContent] = useState(null);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [showingSimplified, setShowingSimplified] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState(null);
    const [showQuiz, setShowQuiz] = useState(false);

    const [explanation, setExplanation] = useState(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [explanationIndex, setExplanationIndex] = useState(null);

    // Fetch Text
    useEffect(() => {
        const fetchText = async () => {
            if (!currentUser || !id) return;
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'texts', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setActiveText({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("No such document!");
                    navigate('/library');
                }
            } catch (e) {
                console.error("Error fetching text:", e);
            } finally {
                setLoadingText(false);
            }
        };
        fetchText();
    }, [id, currentUser, navigate]);

    // Reading Session Tracker
    useEffect(() => {
        if (!activeText) return;
        const start = Date.now();
        return () => {
            const duration = Math.floor((Date.now() - start) / 1000);
            if (duration >= 10 && currentUser) {
                recordReadingSession(currentUser.uid, activeText.id, activeText.title, duration).catch(console.error);
            }
        };
    }, [activeText, currentUser]);

    // Stop TTS on unmount
    useEffect(() => {
        return () => stop();
    }, [stop]);

    // Auto-hide tooltip
    useEffect(() => {
        if (activeTooltip) {
            const timer = setTimeout(() => {
                setActiveTooltip(null);
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, [activeTooltip]);

    // Fetch Ollama models
    useEffect(() => {
        if (showQuiz || !selectedOllamaModel) {
            fetchModels().then(models => {
                setOllamaModels(models);
                if (models.length > 0 && !selectedOllamaModel) setSelectedOllamaModel(models[0].name);
            });
        }
    }, [showQuiz]);

    const handleSimplify = async () => {
        if (!selectedOllamaModel) {
            alert("Please ensure Ollama is running and a model is selected.");
            return;
        }
        setIsSimplifying(true);
        try {
            const simplified = await simplifyStory(activeText.content, "A1", selectedOllamaModel);
            setSimplifiedContent(simplified);
            setShowingSimplified(true);
        } catch (error) {
            console.error("Simplification failed:", error);
            alert("Failed to simplify story. Check console.");
        } finally {
            setIsSimplifying(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!selectedOllamaModel) return;
        setIsGeneratingQuestions(true);
        try {
            const newQuestions = await generateComprehensionQuestions(selectedOllamaModel, activeText.content);

            const updatedText = { ...activeText, questions: [...(activeText.questions || []), ...newQuestions] };
            setActiveText(updatedText); // Optimistic update

            if (currentUser) {
                const textRef = doc(db, 'users', currentUser.uid, 'texts', activeText.id);
                await updateDoc(textRef, {
                    questions: updatedText.questions
                });
            }
        } catch (error) {
            console.error("Failed to generate questions:", error);
            alert(`Failed to generate questions: ${error.message}`);
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    const segmenter = new Intl.Segmenter('de', { granularity: 'sentence' });
    const sentences = activeText ? Array.from(segmenter.segment(activeText.content)).map(s => s.segment) : [];

    const handleSelection = () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 0) {
            const selectionRange = window.getSelection().getRangeAt(0);
            const rect = selectionRange.getBoundingClientRect();
            setSelection({
                text: selectedText,
                top: rect.top,
                left: rect.left + rect.width / 2
            });
        } else {
            setSelection(null);
        }
    };

    const handleExplainText = async (template) => {
        if (!selection) return;
        const sIndex = sentences.findIndex(s => s.includes(selection.text));
        setExplanationIndex(sIndex);
        const contextSentence = sentences[sIndex] || "";

        setIsExplaining(true);
        try {
            const result = await explainText(selection.text, template, contextSentence, selectedOllamaModel);
            setExplanation({
                template,
                text: selection.text,
                data: result
            });
        } catch (error) {
            console.error("Explanation failed:", error);
            alert("Failed to generate explanation. Please try again.");
        } finally {
            setIsExplaining(false);
            setSelection(null);
            window.getSelection().removeAllRanges();
        }
    };

    const handleSpeak = () => {
        if (isPlaying) {
            stop();
        } else {
            speak(showingSimplified ? simplifiedContent : activeText.content);
        }
    };

    if (loadingText) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
    if (!activeText) return <div className="text-center p-8">Text not found.</div>;

    const tokens = tokenize(showingSimplified ? simplifiedContent : activeText.content);

    return (
        <div
            className="max-w-3xl mx-auto bg-white dark:bg-slate-900 min-h-[80vh] shadow-sm rounded-xl overflow-hidden flex flex-col relative"
            onMouseUp={handleSelection}
        >
            {/* Selection Popup */}
            {selection && (
                <div
                    className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2"
                    style={{ top: selection.top, left: selection.left }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex gap-2 animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => handleExplainText('grammar')}
                            disabled={isExplaining}
                            className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Grammar"
                        >
                            <GraduationCap size={14} />
                            Grammar
                        </button>
                        <button
                            onClick={() => handleExplainText('sentence')}
                            disabled={isExplaining}
                            className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Sentence"
                        >
                            <BookOpen size={14} />
                            Sentence
                        </button>
                        <button
                            onClick={() => handleExplainText('word')}
                            disabled={isExplaining}
                            className="text-amber-600 dark:text-amber-400 text-xs font-semibold py-2 px-3 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            title="Explain Word/Phrase"
                        >
                            <MessageCircle size={14} />
                            Word
                        </button>
                    </div>
                    <div className="w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                </div>
            )}

            {/* Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center sticky top-0 z-10">
                <button onClick={() => navigate('/library')} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
                    <ChevronLeft size={18} /> Library
                </button>
                <div className="flex gap-2 items-center">
                    {/* Simplification Controls */}
                    {simplifiedContent ? (
                        <button
                            onClick={() => setShowingSimplified(!showingSimplified)}
                            className={`p-2 rounded-full transition ${showingSimplified ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                            title={showingSimplified ? "Show Original" : "Show Simplified"}
                        >
                            <RotateCcw size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSimplify}
                            disabled={isSimplifying || ollamaModels.length === 0}
                            className={`p-2 rounded-full transition ${isSimplifying ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                            title="Simplify Text (AI)"
                        >
                            {isSimplifying ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                        </button>
                    )}

                    {/* Model Selector */}
                    {ollamaModels.length > 0 && !showQuiz && (
                        <select
                            value={selectedOllamaModel}
                            onChange={(e) => setSelectedOllamaModel(e.target.value)}
                            className="text-xs p-1 border border-slate-200 rounded bg-white max-w-[100px] hidden md:block"
                        >
                            {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </select>
                    )}

                    {isModelLoading && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 mr-2">
                            <Loader2 size={12} className="animate-spin" /> Loading Model...
                        </span>
                    )}

                    <button
                        onClick={handleSpeak}
                        className={`p-2 rounded-full transition ${isPlaying
                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 animate-pulse'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                        title={isPlaying ? "Stop Reading" : "Read Aloud"}
                        disabled={isModelLoading}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                    </button>
                    <button
                        onClick={() => setShowQuiz(!showQuiz)}
                        className={`p-2 rounded-full transition ${showQuiz ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                        title="Comprehension Questions"
                    >
                        <Brain size={20} />
                    </button>
                </div >
            </div >

            {/* Content Area */}
            <div className="p-8 md:p-12 flex-grow overflow-y-auto" >
                {
                    showQuiz ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300" >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Brain className="text-indigo-600" /> Comprehension Check
                                </h3>

                                {/* Generator Controls */}
                                <div className="flex gap-2 items-center">
                                    {ollamaModels.length > 0 && (
                                        <select
                                            value={selectedOllamaModel}
                                            onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                            className="text-sm p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                                        </select>
                                    )}
                                    <button
                                        onClick={handleGenerateQuestions}
                                        disabled={isGeneratingQuestions || ollamaModels.length === 0}
                                        className="text-sm bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isGeneratingQuestions ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        Generate
                                    </button>
                                </div>
                            </div>

                            {activeText.questions && activeText.questions.length > 0 ? activeText.questions.map((q, idx) => (
                                <div key={idx} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                    <p className="font-semibold text-slate-800 mb-3">{q.q}</p>
                                    <details className="text-slate-600">
                                        <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 text-sm font-medium">Show Answer</summary>
                                        <div className="mt-2 pl-4 border-l-2 border-indigo-200 italic">
                                            {q.a}
                                        </div>
                                    </details>
                                </div>
                            )) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Brain className="mx-auto text-slate-300 mb-3" size={48} />
                                    <p className="text-slate-500 italic mb-4">No questions available for this text.</p>
                                    {ollamaModels.length > 0 ? (
                                        <button
                                            onClick={handleGenerateQuestions}
                                            disabled={isGeneratingQuestions}
                                            className="text-indigo-600 font-medium hover:underline"
                                        >
                                            Generate some with AI?
                                        </button>
                                    ) : (
                                        <p className="text-xs text-slate-400">Make sure Ollama is running to generate questions.</p>
                                    )}
                                </div>
                            )
                            }
                        </div >
                    ) : (
                        <div>
                            <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
                                {tokenize(activeText.title).map((token, index) => {
                                    const isWord = /\w/.test(token);
                                    if (!isWord) return <span key={index}>{token}</span>;
                                    const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                                    const isSaved = savedVocab.hasOwnProperty(cleanToken);

                                    return (
                                        <span
                                            key={index}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const uniqueId = `title-${index}`;
                                                const hasHover = window.matchMedia('(hover: hover)').matches;

                                                if (isSaved && savedVocab[cleanToken]) {
                                                    if (hasHover) {
                                                        await toggleWord(token, "Title", activeText.id, activeText.title);
                                                        setActiveTooltip(null);
                                                    } else {
                                                        if (activeTooltip === uniqueId) {
                                                            await toggleWord(token, "Title", activeText.id, activeText.title);
                                                            setActiveTooltip(null);
                                                        } else {
                                                            setActiveTooltip(uniqueId);
                                                        }
                                                    }
                                                    return;
                                                }

                                                const translation = await toggleWord(token, "Title", activeText.id, activeText.title);
                                                if (translation) {
                                                    setActiveTooltip(uniqueId);
                                                }
                                            }}
                                            className={`group relative cursor-pointer transition-colors duration-200 rounded px-0.5
                                ${isSaved ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400' : 'hover:bg-indigo-100 active:bg-indigo-200'}`}
                                        >
                                            {token}

                                            {/* Tooltip for Title */}
                                            {isSaved && savedVocab[cleanToken] && (
                                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] ${activeTooltip === `title-${index}` ? 'block' : 'hidden group-hover:block'
                                                    }`}>
                                                    <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                                                        {savedVocab[cleanToken].definition}
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                </div>
                                            )}
                                        </span>
                                    );
                                })}
                            </h1>
                            <div className="text-xl leading-loose text-slate-800 dark:text-slate-200 font-serif">
                                {sentences.map((sentence, sIndex) => {
                                    const isCurrentSentence = sIndex === currentSentenceIndex;
                                    const isGenerating = generatingSentences.has(sIndex);
                                    const tokens = tokenize(sentence);

                                    return (
                                        <React.Fragment key={sIndex}>
                                            <div className={`group relative transition-colors duration-300 rounded-lg py-2 px-1 -mx-1 ${isCurrentSentence ? 'bg-yellow-100 dark:bg-yellow-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                {/* Sentence Play Button - larger hit area */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        speak(activeText.content, sIndex);
                                                    }}
                                                    className={`absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition opacity-0 group-hover:opacity-100 ${isCurrentSentence ? 'opacity-100 text-indigo-600' : ''}`}
                                                    title="Play from here"
                                                    disabled={isGenerating}
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Play size={16} className={isCurrentSentence && isPlaying ? "fill-current" : ""} />
                                                    )}
                                                </button>

                                                {tokens.map((token, tIndex) => {
                                                    const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                                                    const isSaved = savedVocab.hasOwnProperty(cleanToken);
                                                    const isTranslating = translatingWord === cleanToken;
                                                    const isWord = /\w/.test(token);
                                                    const uniqueId = `${sIndex}-${tIndex}`;

                                                    if (!isWord) return <span key={tIndex}>{token}</span>;

                                                    return (
                                                        <span
                                                            key={tIndex}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const hasHover = window.matchMedia('(hover: hover)').matches;

                                                                // If already saved
                                                                if (isSaved && savedVocab[cleanToken]) {
                                                                    if (hasHover) {
                                                                        // Desktop: Click always removes (un-highlights)
                                                                        // Tooltip is handled by hover
                                                                        await toggleWord(token, sentence, activeText.id, activeText.title);
                                                                        setActiveTooltip(null);
                                                                    } else {
                                                                        // Mobile: Click shows tooltip, or removes if already shown
                                                                        if (activeTooltip === uniqueId) {
                                                                            await toggleWord(token, sentence, activeText.id, activeText.title);
                                                                            setActiveTooltip(null);
                                                                        } else {
                                                                            setActiveTooltip(uniqueId);
                                                                        }
                                                                    }
                                                                    return;
                                                                }

                                                                // If not saved, translate and save
                                                                const translation = await toggleWord(token, sentence, activeText.id, activeText.title);

                                                                // Show tooltip after saving (for both mobile and desktop feedback)
                                                                if (translation) {
                                                                    setActiveTooltip(uniqueId);
                                                                }
                                                            }}
                                                            className={`group/word relative cursor-pointer transition-colors duration-200 rounded px-0.5
                                      ${isSaved
                                                                    ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400'
                                                                    : 'hover:bg-indigo-100 active:bg-indigo-200'}
                                      ${isTranslating ? 'opacity-70 cursor-wait' : ''}`}
                                                        >
                                                            {token}
                                                            {isTranslating && <span className="inline-block w-1.5 h-1.5 ml-0.5 rounded-full bg-indigo-500 animate-pulse"></span>}

                                                            {/* Hover Tooltip (desktop) + Click Tooltip (mobile) */}
                                                            {isSaved && savedVocab[cleanToken] && (
                                                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] ${activeTooltip === uniqueId ? 'block' : 'hidden group-hover/word:block'
                                                                    }`}>
                                                                    <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                                                                        {savedVocab[cleanToken].definition}
                                                                    </div>
                                                                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                                </div>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            {/* Inline Explanation Card */}
                                            {(isExplaining || explanation) && explanationIndex === sIndex && (
                                                <div className="mt-4 mb-2 animate-in slide-in-from-top duration-300">
                                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-l-4 border-indigo-500 rounded-lg p-4 shadow-md">
                                                        {isExplaining ? (
                                                            <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                                                                <Loader2 size={20} className="animate-spin" />
                                                                <span className="text-sm font-medium">Generating explanation...</span>
                                                            </div>
                                                        ) : explanation ? (
                                                            <div className="space-y-3">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {explanation.template === 'grammar' && <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                                                        {explanation.template === 'sentence' && <BookOpen size={18} className="text-emerald-600 dark:text-emerald-400" />}
                                                                        {explanation.template === 'word' && <MessageCircle size={18} className="text-amber-600 dark:text-amber-400" />}
                                                                        <h3 className="font-bold text-slate-800 dark:text-slate-200">
                                                                            {explanation.template.charAt(0).toUpperCase() + explanation.template.slice(1)} Explanation
                                                                        </h3>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setExplanation(null)}
                                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                                    >
                                                                        <X size={18} />
                                                                    </button>
                                                                </div>

                                                                <div className="text-sm bg-white/50 dark:bg-slate-800/50 rounded p-2 font-medium text-slate-700 dark:text-slate-300 italic">
                                                                    "{explanation.text}"
                                                                </div>

                                                                {/* Grammar Template */}
                                                                {explanation.template === 'grammar' && (
                                                                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                        {explanation.data.summary && (
                                                                            <p className="font-medium">{explanation.data.summary}</p>
                                                                        )}
                                                                        {explanation.data.structures && explanation.data.structures.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Structures:</p>
                                                                                {explanation.data.structures.map((struct, idx) => (
                                                                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2">
                                                                                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{struct.element}</span>
                                                                                        {' → '}
                                                                                        <span>{struct.explanation}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {explanation.data.tips && explanation.data.tips.length > 0 && (
                                                                            <div className="mt-2 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2">
                                                                                <p className="font-semibold text-xs uppercase text-indigo-700 dark:text-indigo-300 mb-1">Tips:</p>
                                                                                <ul className="list-disc list-inside space-y-0.5 text-xs">
                                                                                    {explanation.data.tips.map((tip, idx) => (
                                                                                        <li key={idx}>{tip}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Sentence Template */}
                                                                {explanation.template === 'sentence' && (
                                                                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                        {explanation.data.translation && (
                                                                            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded p-2">
                                                                                <p className="font-semibold text-xs uppercase text-emerald-700 dark:text-emerald-300 mb-1">Translation:</p>
                                                                                <p className="text-emerald-900 dark:text-emerald-100">{explanation.data.translation}</p>
                                                                            </div>
                                                                        )}
                                                                        {explanation.data.breakdown && explanation.data.breakdown.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Breakdown:</p>
                                                                                {explanation.data.breakdown.map((part, idx) => (
                                                                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2">
                                                                                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{part.part}</span>
                                                                                        {' → '}
                                                                                        <span>{part.meaning}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {explanation.data.notes && (
                                                                            <div className="bg-white dark:bg-slate-800 rounded p-2 text-xs italic">
                                                                                <strong>Note:</strong> {explanation.data.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Word Template */}
                                                                {explanation.template === 'word' && (
                                                                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                                        {explanation.data.translation && (
                                                                            <div className="bg-amber-50 dark:bg-amber-900/30 rounded p-2">
                                                                                <p className="font-semibold text-xs uppercase text-amber-700 dark:text-amber-300 mb-1">Translation:</p>
                                                                                <p className="text-amber-900 dark:text-amber-100 font-medium">{explanation.data.translation}</p>
                                                                            </div>
                                                                        )}
                                                                        {explanation.data.explanation && (
                                                                            <p>{explanation.data.explanation}</p>
                                                                        )}
                                                                        {explanation.data.examples && explanation.data.examples.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <p className="font-semibold text-xs uppercase text-slate-500 dark:text-slate-400">Examples:</p>
                                                                                {explanation.data.examples.map((ex, idx) => (
                                                                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded p-2 space-y-1">
                                                                                        <p className="font-mono text-amber-600 dark:text-amber-400">{ex.german}</p>
                                                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{ex.english}</p>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {explanation.data.tips && (
                                                                            <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-2 text-xs italic">
                                                                                <strong>Tips:</strong> {explanation.data.tips}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <p className="mt-8 text-sm text-slate-400 italic text-center">
                                Click any word to highlight it and add it to your vocabulary list.
                            </p>


                        </div>
                    )
                }
            </div >
        </div >
    );
}
