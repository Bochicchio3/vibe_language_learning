import React, { useState, useEffect, useRef } from 'react';
import { pipeline, env } from '@xenova/transformers';
import { Mic, MicOff, Play, Download, Loader2, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { recordActivitySession, CATEGORIES } from '../services/activityTracker';

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

const SpeakingPractice = () => {
    // State
    const [status, setStatus] = useState('idle'); // idle, loading, ready, recording, processing, error
    const [statusMessage, setStatusMessage] = useState('Model Not Loaded');
    const [transcript, setTranscript] = useState([]);
    const [progress, setProgress] = useState(0);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [activeSentence, setActiveSentence] = useState(null);
    const [useFallback, setUseFallback] = useState(false);
    const { currentUser } = useAuth();
    const [sessionStart] = useState(Date.now());

    // Refs for non-render state
    const transcriberRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isRecordingRef = useRef(false); // Fix for closure staleness
    const recognitionRef = useRef(null); // For fallback

    // --- Auto-Load ---
    useEffect(() => {
        const hasLoadedBefore = localStorage.getItem('whisper_model_cached');
        if (hasLoadedBefore === 'true') {
            loadModel();
        }
    }, []);

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
            localStorage.setItem('whisper_model_cached', 'true'); // Mark as cached
            // Removed initAudioContext() to prevent false positives if autoplay is blocked
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
        setIsModelLoaded(true); // Fake it for UI
    };

    // --- Audio Logic ---
    // We don't init context globally anymore, we do it per recording session to handle mic changes

    const startRecording = async () => {
        if (isRecordingRef.current) return;
        if (!transcriberRef.current && !useFallback) return;

        try {
            // 1. Re-initialize AudioContext to ensure we match the current mic's sample rate
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

            // 3. Start Fallback Recognition if enabled
            if (useFallback) {
                recognitionRef.current = new window.webkitSpeechRecognition();
                recognitionRef.current.lang = 'de-DE'; // Default to German
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

        // Cleanup Audio
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.source.disconnect();
            audioWorkletNodeRef.current.scriptNode.disconnect();
        }

        // Stop Fallback Recognition
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
                    processAudio(""); // Fallback failed or no speech detected
                    resolve();
                };
                recognitionRef.current.onend = () => {
                    if (!hasResult) { // If onresult didn't fire, process with empty text
                        processAudio("");
                    }
                    resolve();
                };
                recognitionRef.current.stop();
            });
        }

        // Yield to UI to prevent freeze
        setTimeout(async () => {
            await processAudio();
        }, 50);
    };

    // --- Processing ---
    const processAudio = async (fallbackText = null) => {
        if (audioChunksRef.current.length === 0) {
            setStatus('ready');
            setStatusMessage(useFallback ? 'Ready (Online Mode)' : 'Ready');
            return;
        }

        // 1. Flatten Audio
        const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const rawAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
            rawAudio.set(chunk, offset);
            offset += chunk.length;
        }

        // 2. Create Playback Blob (WAV)
        const playbackBlob = encodeWAV(rawAudio, audioContextRef.current.sampleRate);
        const playbackUrl = URL.createObjectURL(playbackBlob);

        try {
            let text = "";

            if (useFallback) {
                text = fallbackText || ""; // Use text from webkitSpeechRecognition
            } else {
                // 3. Resample for Whisper (16kHz)
                const targetAudio = resampleAudio(rawAudio, audioContextRef.current.sampleRate, 16000);
                // 4. Run Inference
                const output = await transcriberRef.current(targetAudio);
                text = output.text;
            }

            // 5. Update State
            setTranscript(prev => [...prev, {
                text: text,
                audioUrl: playbackUrl,
                timestamp: new Date(),
                target: activeSentence
            }]);

            setStatus('ready');
            setStatusMessage(useFallback ? 'Ready (Online Mode)' : 'Ready');
            setActiveSentence(null); // Reset active sentence after attempt

        } catch (err) {
            console.error("Transcription Error:", err);
            setStatus('error');
            setStatusMessage('Transcription Failed');
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
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Speaking Practice</h1>
                        <div className="flex items-center gap-2 text-slate-500">
                            <p>Improve your pronunciation with AI feedback</p>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                Multilingual Model (German Supported)
                            </span>
                        </div>
                    </div>        </div>
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

            {/* Main Interaction Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: Practice Sentences */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
                        Practice Sentences
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                        {PRACTICE_SENTENCES.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => isModelLoaded && setActiveSentence(item.text)}
                                className={`p-4 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group ${activeSentence === item.text ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''
                                    }`}
                            >
                                <div>
                                    <p className="text-slate-800 font-medium">{item.text}</p>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                                        {item.level}
                                    </span>
                                </div>
                                <button className="text-slate-300 group-hover:text-indigo-600 transition-colors">
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-h-[200px]">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Attempts</h3>
                        <div className="space-y-4">
                            {transcript.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-8 italic">No recordings yet.</p>
                            ) : (
                                transcript.slice().reverse().map((t, i) => (
                                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        {t.target && (
                                            <p className="text-xs text-slate-500 mb-1">Target: "{t.target}"</p>
                                        )}
                                        <p className="text-slate-800 font-medium mb-2">"{t.text}"</p>
                                        <audio controls src={t.audioUrl} className="w-full h-8" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SpeakingPractice;
