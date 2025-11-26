import { useState, useEffect, useRef, useCallback } from 'react';

export const useTTS = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
    const [currentSentenceText, setCurrentSentenceText] = useState('');
    const [generatingSentences, setGeneratingSentences] = useState(new Set()); // Track which sentences are being generated
    const [selectedLanguage, setSelectedLanguage] = useState(() => {
        return localStorage.getItem('tts-language') || 'de';
    });

    const workerRef = useRef(null);
    const audioContextRef = useRef(null);
    const sentenceQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);
    const scheduledAudioEndTimeRef = useRef(0);
    const isPlayingRef = useRef(false);
    const activeSourcesRef = useRef([]); // Track all active audio sources
    const currentSessionIdRef = useRef(0); // Track current generation session

    const timeoutsRef = useRef([]);

    useEffect(() => {
        // Initialize Sherpa Worker
        workerRef.current = new Worker(new URL('../workers/sherpa.worker.js', import.meta.url), {
            type: 'classic'
        });

        workerRef.current.onmessage = (event) => {
            const { type, audio, sampling_rate, error, text, index, sessionId } = event.data;

            if (type === 'runtime-ready') {
                // Worker is ready, initialize TTS with current language
                workerRef.current.postMessage({ type: 'init', language: selectedLanguage });
            } else if (type === 'init-start') {
                setIsModelLoading(true);
            } else if (type === 'init-complete') {
                setIsModelLoading(false);
                console.log('TTS Model loaded');
            } else if (type === 'audio') {
                // Only play if we are still supposed to be playing AND this is from the current session
                if (isPlayingRef.current && sessionId === currentSessionIdRef.current) {
                    // Remove from generating set
                    setGeneratingSentences(prev => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                    });
                    playAudioChunk(audio, sampling_rate, text, index);
                } else {
                    console.log(`Ignoring audio from old session (${sessionId} vs ${currentSessionIdRef.current})`);
                }
            } else if (type === 'error') {
                console.error('TTS Worker Error:', error);
                setIsLoading(false);
                setIsPlaying(false);
                isPlayingRef.current = false;
                setGeneratingSentences(new Set());
            }
        };

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            // Clear timeouts
            timeoutsRef.current.forEach(clearTimeout);
            // Stop all active sources
            activeSourcesRef.current.forEach(source => {
                try {
                    source.stop();
                } catch (e) {
                    // Ignore if already stopped
                }
            });
        };
    }, []); // Empty dependency array - worker is stable

    // Handle language change
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'init', language: selectedLanguage });
        }
    }, [selectedLanguage]);

    const playAudioChunk = (audioData, sampleRate, text, index) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        const buffer = ctx.createBuffer(1, audioData.length, sampleRate);
        buffer.getChannelData(0).set(audioData);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Track this source
        activeSourcesRef.current.push(source);

        // Schedule playback
        const currentTime = ctx.currentTime;
        // If scheduled time is in the past, reset it to now
        if (scheduledAudioEndTimeRef.current < currentTime) {
            scheduledAudioEndTimeRef.current = currentTime;
        }

        const startTime = scheduledAudioEndTimeRef.current;
        source.start(startTime);

        // Schedule UI update
        const delay = (startTime - currentTime) * 1000;
        const timeoutId = setTimeout(() => {
            if (index !== undefined) setCurrentSentenceIndex(index);
            if (text !== undefined) setCurrentSentenceText(text);
        }, Math.max(0, delay));

        timeoutsRef.current.push(timeoutId);

        // Update scheduled time for next chunk + small pause
        scheduledAudioEndTimeRef.current += buffer.duration + 0.2; // 0.2s pause between sentences

        // Handle sentence completion (approximate)
        source.onended = () => {
            // Remove from active sources
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);

            // If queue is empty and audio finished, we are done
            if (sentenceQueueRef.current.length === 0 && ctx.currentTime >= scheduledAudioEndTimeRef.current - 0.3) {
                setIsPlaying(false);
                isPlayingRef.current = false;
                setCurrentSentenceIndex(-1);
                setCurrentSentenceText('');
            }
        };

        // Process next sentence in queue
        processNextSentence();
    };

    const processNextSentence = () => {
        if (sentenceQueueRef.current.length > 0 && isPlayingRef.current) {
            const nextItem = sentenceQueueRef.current.shift();

            // Mark as generating
            setGeneratingSentences(prev => new Set(prev).add(nextItem.index));

            // Don't update state here anymore
            workerRef.current.postMessage({
                type: 'speak',
                text: nextItem.text,
                index: nextItem.index,
                sessionId: currentSessionIdRef.current
            });
        }
    };

    const stop = useCallback(() => {
        // Increment session ID to invalidate any pending audio
        currentSessionIdRef.current += 1;

        // Stop all currently playing/scheduled audio sources immediately
        activeSourcesRef.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        });
        activeSourcesRef.current = [];

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        sentenceQueueRef.current = [];
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsLoading(false);
        setIsPaused(false);
        setCurrentSentenceIndex(-1);
        setCurrentSentenceText('');
        setGeneratingSentences(new Set());
        scheduledAudioEndTimeRef.current = 0;
    }, []);

    const speak = useCallback((text, startIndex = 0) => {
        if (!text || isModelLoading) return;

        // Reset state
        stop();
        setIsPlaying(true);
        isPlayingRef.current = true;
        setIsLoading(true);

        // Split text into sentences
        const segmenter = new Intl.Segmenter(selectedLanguage, { granularity: 'sentence' });
        const sentences = Array.from(segmenter.segment(text)).map((s, i) => ({
            text: s.segment,
            index: i
        }));

        // Start from the requested index
        sentenceQueueRef.current = sentences.slice(startIndex);
        processNextSentence();
    }, [isModelLoading, stop, selectedLanguage]);

    const pause = useCallback(() => {
        if (audioContextRef.current) {
            audioContextRef.current.suspend();
            setIsPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (audioContextRef.current) {
            audioContextRef.current.resume();
            setIsPaused(false);
        }
    }, []);

    const setLanguage = useCallback((lang) => {
        if (lang !== selectedLanguage) {
            stop();
            setSelectedLanguage(lang);
            localStorage.setItem('tts-language', lang);
        }
    }, [selectedLanguage, stop]);

    return {
        speak,
        stop,
        pause,
        resume,
        isPlaying,
        isPaused,
        isLoading,
        isModelLoading,
        currentSentenceIndex,
        currentSentenceText,
        generatingSentences,
        selectedLanguage,
        setLanguage
    };
};
