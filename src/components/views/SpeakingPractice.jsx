import React, { useState, useEffect, useRef } from 'react';
import { pipeline, env } from '@xenova/transformers';
import { Mic, MicOff, Play, Download, Loader2, CheckCircle, AlertCircle, Volume2, MessageSquare, User, Bot, Sparkles, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { recordActivitySession, CATEGORIES } from '../../services/activityTracker';
import { fetchModels, generateRolePlayResponse, generateHint } from '../../services/ollama';
import { useTTS } from '../../hooks/useTTS';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const PRACTICE_SENTENCES = [
    { text: "Hallo, wie geht es dir?", level: "A1" },
    { text: "Ich möchte gerne einen Kaffee bestellen.", level: "A1" },
    { text: "Entschuldigung, können Sie mir helfen?", level: "A1" },
    { text: "Das Wetter ist heute sehr schön.", level: "A2" },
    { text: "Ich lerne Deutsch, weil ich in Berlin arbeiten möchte.", level: "A2" },
    { text: "Können wir uns morgen um 14 Uhr treffen?", level: "B1" },
    { text: "Es ist wichtig, regelmäßig Sport zu treiben.", level: "B1" }
];

const SCENARIOS = [
    { id: 'pharmacy', name: 'Apotheke (Pharmacy)', icon: '💊', description: 'Ask for medicine or advice.' },
    { id: 'bakery', name: 'Bäckerei (Bakery)', icon: '🥖', description: 'Order bread and pastries.' },
    { id: 'restaurant', name: 'Restaurant', icon: '🍽️', description: 'Order food and pay the bill.' },
    { id: 'doctor', name: 'Arzt (Doctor)', icon: '🩺', description: 'Describe your symptoms.' },
    { id: 'train_station', name: 'Bahnhof (Train Station)', icon: '🚆', description: 'Buy a ticket and ask for info.' },
];

const SpeakingPractice = () => {
    // State
    const [mode, setMode] = useState('sentences'); // 'sentences' | 'roleplay'
    const [status, setStatus] = useState('idle'); // idle, loading, ready, recording, processing, error
    const [statusMessage, setStatusMessage] = useState('Model Not Loaded');
    const [transcript, setTranscript] = useState([]); // For sentences mode
    const [progress, setProgress] = useState(0);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [activeSentence, setActiveSentence] = useState(null);
    const [useFallback, setUseFallback] = useState(false);
    const { currentUser } = useAuth();
    const [sessionStart] = useState(Date.now());

    // Role Play State
    const [scenario, setScenario] = useState(SCENARIOS[0]);
    const [chatHistory, setChatHistory] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [isWaitingForAI, setIsWaitingForAI] = useState(false);
    const [hints, setHints] = useState([]);
    const [showHints, setShowHints] = useState(false);

    // TTS Hook
    const { speak, stop: stopTTS, isPlaying: isTTSPlaying, isModelLoading: isTTSLoading } = useTTS();

    // Refs for non-render state
    const transcriberRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isRecordingRef = useRef(false);
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);

    // --- Auto-Load ---
    useEffect(() => {
        const hasLoadedBefore = localStorage.getItem('whisper_model_cached');
        if (hasLoadedBefore === 'true') {
            loadModel();
        }
        fetchOllamaModels();
    }, []);

    useEffect(() => {
        if (mode === 'roleplay') {
            scrollToBottom();
        }
    }, [chatHistory, mode]);

    // Record speaking session on unmount
    useEffect(() => {
        return () => {
            if (sessionStart && currentUser) {
                const duration = Math.floor((Date.now() - sessionStart) / 1000);
                if (duration >= 10) {
                    recordActivitySession(currentUser.uid, CATEGORIES.SPEAKING, duration)
                        .catch(err => console.error('Error recording speaking session:', err));
                }
            }
        };
    }, [sessionStart, currentUser]);

    const fetchOllamaModels = async () => {
        const models = await fetchModels();
        setModels(models);
        if (models.length > 0) setSelectedModel(models[0].name);
    };

    const setModels = (models) => {
        setOllamaModels(models);
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // --- Model Loading ---
    const loadModel = async () => {
        setStatus('loading');
        setStatusMessage('Loading Whisper Model...');

        try {
            transcriberRef.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
                progress_callback: (data) => {
                    if (data.status === 'progress') {
                        setProgress(Math.round(data.progress || 0));
                    }
                }
            });

            setStatus('ready');
            setStatusMessage('Ready to Record');
            setIsModelLoaded(true);
            localStorage.setItem('whisper_model_cached', 'true');
        } catch (err) {
            console.error(err);
            setStatus('error');
            setStatusMessage('Failed to load model');
        }
    };

    const enableFallback = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Browser speech recognition is not supported in this browser.");
            return;
        }
        setUseFallback(true);
        setStatus('ready');
        setStatusMessage('Ready (Online Mode)');
        setIsModelLoaded(true);
    };

    // --- Audio Logic ---
    const startRecording = async () => {
        stopTTS(); // Stop TTS when user starts speaking
        if (isRecordingRef.current) return;
        if (!transcriberRef.current && !useFallback) return;

        try {
            if (audioContextRef.current) {
                await audioContextRef.current.close();
            }
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

            isRecordingRef.current = true;
            setStatus('recording');
            setStatusMessage(useFallback ? 'Listening (Online)...' : 'Listening...');
            audioChunksRef.current = [];

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            const bufferSize = 4096;
            const scriptNode = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

            scriptNode.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                audioChunksRef.current.push(new Float32Array(inputData));
            };

            source.connect(scriptNode);
            scriptNode.connect(audioContextRef.current.destination);

            audioWorkletNodeRef.current = { source, scriptNode };

            if (useFallback) {
                recognitionRef.current = new window.webkitSpeechRecognition();
                recognitionRef.current.lang = 'de-DE';
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.start();
            }

        } catch (err) {
            console.error("Mic Error:", err);
            setStatus('error');
            setStatusMessage('Microphone Error');
            isRecordingRef.current = false;
        }
    };

    const stopRecording = async () => {
        if (!isRecordingRef.current) return;
        isRecordingRef.current = false;

        setStatus('processing');
        setStatusMessage('Transcribing...');

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.source.disconnect();
            audioWorkletNodeRef.current.scriptNode.disconnect();
        }

        if (useFallback && recognitionRef.current) {
            return new Promise((resolve) => {
                let hasResult = false;
                recognitionRef.current.onresult = (event) => {
                    hasResult = true;
                    const text = event.results[0][0].transcript;
                    processAudio(text);
                    resolve();
                };
                recognitionRef.current.onerror = (event) => {
                    console.error("Fallback recognition error:", event.error);
                    processAudio("");
                    resolve();
                };
                recognitionRef.current.onend = () => {
                    if (!hasResult) processAudio("");
                    resolve();
                };
                recognitionRef.current.stop();
            });
        }

        setTimeout(async () => {
            await processAudio();
        }, 50);
    };

    const processAudio = async (fallbackText = null) => {
        if (audioChunksRef.current.length === 0 && !fallbackText) {
            setStatus('ready');
            setStatusMessage(useFallback ? 'Ready (Online Mode)' : 'Ready');
            return;
        }

        let playbackUrl = null;
        if (audioChunksRef.current.length > 0) {
            const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
            const rawAudio = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunksRef.current) {
                rawAudio.set(chunk, offset);
                offset += chunk.length;
            }
            const playbackBlob = encodeWAV(rawAudio, audioContextRef.current.sampleRate);
            playbackUrl = URL.createObjectURL(playbackBlob);
        }

        try {
            let text = "";

            if (useFallback) {
                text = fallbackText || "";
            } else {
                // Whisper Logic
                const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
                const rawAudio = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunksRef.current) {
                    rawAudio.set(chunk, offset);
                    offset += chunk.length;
                }
                const targetAudio = resampleAudio(rawAudio, audioContextRef.current.sampleRate, 16000);
                const output = await transcriberRef.current(targetAudio);
                text = output.text;
            }

            // Handle Result based on Mode
            if (mode === 'sentences') {
                setTranscript(prev => [...prev, {
                    text: text,
                    audioUrl: playbackUrl,
                    timestamp: new Date(),
                    target: activeSentence
                }]);
                setActiveSentence(null);
            } else {
                // Role Play Mode: Put text in input box
                setCurrentInput(text);
            }

            setStatus('ready');
            setStatusMessage(useFallback ? 'Ready (Online Mode)' : 'Ready');

        } catch (err) {
            console.error("Transcription Error:", err);
            setStatus('error');
            setStatusMessage('Transcription Failed');
        }
    };

    // --- Role Play Logic ---
    const startScenario = () => {
        setChatHistory([{ role: 'assistant', content: `Hallo! Willkommen in der ${scenario.name}. Wie kann ich Ihnen helfen?` }]);
        setHints([]);
        setShowHints(false);
    };

    const handleSendMessage = async () => {
        if (!currentInput.trim() || !selectedModel) return;

        const userMsg = { role: 'user', content: currentInput };
        setChatHistory(prev => [...prev, userMsg]);
        setCurrentInput('');
        setIsWaitingForAI(true);
        setHints([]);
        setShowHints(false);

        try {
            const aiResponseText = await generateRolePlayResponse([...chatHistory, userMsg], scenario.name, selectedModel);
            setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponseText }]);
            speak(aiResponseText); // Auto-play AI response
        } catch (error) {
            console.error("Roleplay error:", error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "(Error: Could not connect to AI)" }]);
        } finally {
            setIsWaitingForAI(false);
        }
    };

    const handleGetHint = async () => {
        if (!selectedModel) return;
        try {
            const newHints = await generateHint(chatHistory, scenario.name, selectedModel);
            setHints(newHints);
            setShowHints(true);
        } catch (error) {
            console.error("Hint error:", error);
        }
    };

    // --- Helpers ---
    const resampleAudio = (audioBuffer, oldSampleRate, newSampleRate) => {
        if (oldSampleRate === newSampleRate) return audioBuffer;
        const ratio = oldSampleRate / newSampleRate;
        const newLength = Math.round(audioBuffer.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            const originalIndex = i * ratio;
            const index1 = Math.floor(originalIndex);
            const index2 = Math.min(index1 + 1, audioBuffer.length - 1);
            const weight = originalIndex - index1;
            result[i] = audioBuffer[index1] * (1 - weight) + audioBuffer[index2] * weight;
        }
        return result;
    };

    const encodeWAV = (samples, sampleRate) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(offset, s, true);
            offset += 2;
        }
        return new Blob([view], { type: 'audio/wav' });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Speaking Practice</h1>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <p>Improve your pronunciation and conversation skills</p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border ${status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    status === 'recording' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                        status === 'loading' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                    {status === 'recording' && <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    {statusMessage}
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button
                    onClick={() => setMode('sentences')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'sentences' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Sentences
                </button>
                <button
                    onClick={() => setMode('roleplay')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'roleplay' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Role Play
                </button>
            </div>

            {/* Main Content */}
            {mode === 'sentences' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Practice Sentences */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                            Practice Sentences
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
                            {PRACTICE_SENTENCES.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => isModelLoaded && setActiveSentence(item.text)}
                                    className={`p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900 cursor-pointer transition-colors flex justify-between items-center group ${activeSentence === item.text ? 'bg-indigo-50 dark:bg-indigo-900 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700' : ''
                                        }`}
                                >
                                    <div>
                                        <p className="text-slate-800 dark:text-white font-medium">{item.text}</p>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
                                            {item.level}
                                        </span>
                                    </div>
                                    <button className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        <Volume2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Recording & Feedback */}
                    <div className="space-y-6">
                        {/* Recorder */}
                        <div className="bg-slate-900 rounded-2xl p-8 text-center relative overflow-hidden shadow-xl">
                            {/* Background Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

                            {!isModelLoaded ? (
                                <div className="relative z-10 space-y-4">
                                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center mb-4">
                                        <Download className="text-indigo-400" size={32} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg">Load Speech Model</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                        Download the Whisper model (~80MB) to enable real-time transcription in your browser.
                                    </p>

                                    {status === 'loading' ? (
                                        <div className="w-full max-w-xs mx-auto mt-4">
                                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                <span>Downloading...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={loadModel}
                                            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold transition-all shadow-lg shadow-indigo-500/25"
                                        >
                                            Load Model
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="relative z-10 space-y-6">
                                    <div className="h-12 flex items-center justify-center">
                                        {activeSentence ? (
                                            <p className="text-indigo-200 font-medium text-lg animate-in fade-in slide-in-from-bottom-2">
                                                "{activeSentence}"
                                            </p>
                                        ) : (
                                            <p className="text-slate-500 text-sm">Select a sentence to practice</p>
                                        )}
                                    </div>

                                    <button
                                        onMouseDown={startRecording}
                                        onMouseUp={stopRecording}
                                        onMouseLeave={stopRecording}
                                        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                        disabled={status === 'processing'}
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${status === 'recording'
                                            ? 'bg-red-500 text-white scale-110 shadow-[0_0_0_10px_rgba(239,68,68,0.2)]'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-2 border-slate-700'
                                            }`}
                                    >
                                        <Mic size={40} />
                                    </button>

                                    <p className="text-slate-400 text-sm">
                                        {status === 'recording' ? 'Release to transcribe' : 'Hold to speak'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Recent Transcripts */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 min-h-[200px]">
                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Recent Attempts</h3>
                            <div className="space-y-4">
                                {transcript.length === 0 ? (
                                    <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8 italic">No recordings yet.</p>
                                ) : (
                                    transcript.slice().reverse().map((t, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                            {t.target && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Target: "{t.target}"</p>
                                            )}
                                            <p className="text-slate-800 dark:text-white font-medium mb-2">"{t.text}"</p>
                                            <audio controls src={t.audioUrl} className="w-full h-8" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- ROLE PLAY MODE ---
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    {/* Left: Settings & Scenarios */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Scenario</h3>
                            <div className="space-y-2">
                                {SCENARIOS.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setScenario(s); setChatHistory([]); }}
                                        className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${scenario.id === s.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-700'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                                            }`}
                                    >
                                        <span className="text-2xl">{s.icon}</span>
                                        <div>
                                            <p className={`font-medium ${scenario.id === s.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{s.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{s.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">AI Model</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                            >
                                {ollamaModels.length === 0 && <option>Loading models...</option>}
                                {ollamaModels.map(m => (
                                    <option key={m.name} value={m.name}>{m.name}</option>
                                ))}
                            </select>
                            {ollamaModels.length === 0 && (
                                <p className="text-xs text-red-500 mt-2">Ensure Ollama is running!</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Chat Interface */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        {/* Chat History */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {chatHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <span className="text-4xl">{scenario.icon}</span>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-slate-700">Start Role Play</h3>
                                        <p className="text-sm">Practice a conversation at the {scenario.name}.</p>
                                    </div>
                                    <button
                                        onClick={startScenario}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition"
                                    >
                                        Start Conversation
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <Bot size={18} className="text-indigo-600" />
                                                </div>
                                            )}
                                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                                                }`}>
                                                {msg.content}
                                                {msg.role === 'assistant' && (
                                                    <button
                                                        onClick={() => speak(msg.content)}
                                                        className="ml-2 p-1 text-indigo-400 hover:text-indigo-600 transition opacity-50 hover:opacity-100"
                                                        title="Replay"
                                                    >
                                                        <Volume2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isWaitingForAI && (
                                        <div className="flex gap-3 justify-start">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <Bot size={18} className="text-indigo-600" />
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm">
                                                <Loader2 size={16} className="animate-spin text-indigo-600" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </>
                            )}
                        </div>

                        {/* Hints Area */}
                        {showHints && (
                            <div className="bg-yellow-50 border-t border-yellow-100 p-3 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-2 text-yellow-800 font-medium text-sm">
                                    <Sparkles size={14} /> Suggestions:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {hints.map((hint, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentInput(hint)}
                                            className="text-xs bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900 transition"
                                        >
                                            {hint}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex gap-2 items-end">
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                                    disabled={!isModelLoaded || isWaitingForAI}
                                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${status === 'recording'
                                        ? 'bg-red-500 text-white shadow-lg scale-105'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    <Mic size={20} />
                                </button>

                                <div className="flex-grow relative">
                                    <textarea
                                        value={currentInput}
                                        onChange={(e) => setCurrentInput(e.target.value)}
                                        placeholder={status === 'recording' ? 'Listening...' : "Type or speak your response..."}
                                        className="w-full p-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-[50px] py-3"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleGetHint}
                                        disabled={isWaitingForAI || chatHistory.length === 0}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-500 transition p-1"
                                        title="Get a hint"
                                    >
                                        <Sparkles size={18} />
                                    </button>
                                </div>

                                <button
                                    onClick={handleSendMessage}
                                    disabled={!currentInput.trim() || isWaitingForAI}
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                            <div className="text-xs text-center text-slate-400 mt-2">
                                {status === 'recording' ? 'Release to finish speaking' : 'Hold mic to speak'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeakingPractice;
