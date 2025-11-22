import { useState, useEffect, useRef, useCallback } from 'react';

export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSpeechIndex, setCurrentSpeechIndex] = useState(-1);
    const utteranceRef = useRef(null);

    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const cancel = useCallback(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setCurrentSpeechIndex(-1);
        }
    }, []);

    const speak = useCallback((text, lang = 'de-DE', rate = 0.9) => {
        if (!('speechSynthesis' in window)) {
            console.warn("Browser does not support Text-to-Speech");
            return;
        }

        // Cancel any current speech
        window.speechSynthesis.cancel();

        // If we were already speaking, we just stopped it (toggle behavior if called with same text, 
        // but here we just stop. The toggle logic should be in the component if desired).
        // Actually, let's just start the new speech. The component can handle the toggle logic.

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utteranceRef.current = utterance;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setCurrentSpeechIndex(0);
        };

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                setCurrentSpeechIndex(event.charIndex);
            }
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentSpeechIndex(-1);
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error", event);
            setIsSpeaking(false);
            setCurrentSpeechIndex(-1);
        };

        window.speechSynthesis.speak(utterance);
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        currentSpeechIndex,
        supported: 'speechSynthesis' in window
    };
};
