import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, Brain } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export default function Flashcard({ word, onGrade }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showContext, setShowContext] = useState(false);

    // Motion values for drag
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-10, 10]); // Reduced rotation
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Dynamic background color based on drag position
    const backgroundColor = useTransform([x, y], ([latestX, latestY]) => {
        const threshold = 150;
        const absX = Math.abs(latestX);
        const absY = Math.abs(latestY);

        if (absX > absY) {
            // Horizontal
            if (latestX > 0) {
                // Right (Green) -> Easy
                return `rgba(74, 222, 128, ${Math.min(absX / threshold * 0.2, 0.2)})`;
            } else {
                // Left (Red) -> Again
                return `rgba(244, 63, 94, ${Math.min(absX / threshold * 0.2, 0.2)})`;
            }
        } else {
            // Vertical
            if (latestY < 0) {
                // Up (Yellow) -> Hard
                return `rgba(234, 179, 8, ${Math.min(absY / threshold * 0.2, 0.2)})`;
            } else {
                // Down (Blue) -> Good
                return `rgba(59, 130, 246, ${Math.min(absY / threshold * 0.2, 0.2)})`;
            }
        }
    });

    // Reset state when word changes
    useEffect(() => {
        setIsFlipped(false);
        setShowContext(false);
        x.set(0);
        y.set(0);
    }, [word]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFlipped) {
                if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    setIsFlipped(true);
                }
                return;
            }

            switch (e.key) {
                case 'ArrowLeft': onGrade('again'); break;
                case 'ArrowRight': onGrade('easy'); break; // Right is now Easy
                case 'ArrowUp': onGrade('hard'); break;    // Up is now Hard
                case 'ArrowDown': onGrade('good'); break;  // Down is now Good
                case ' ': setIsFlipped(false); break; // Space to flip back
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, onGrade]);

    const handleDragEnd = (event, info) => {
        const threshold = 50;
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;

        // Prioritize the axis with larger movement
        if (Math.abs(xOffset) > Math.abs(yOffset)) {
            if (xOffset > threshold) {
                onGrade('easy'); // Right -> Easy
            } else if (xOffset < -threshold) {
                onGrade('again'); // Left -> Again
            } else {
                animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
                animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
            }
        } else {
            if (yOffset < -threshold) { // Up -> Hard
                onGrade('hard');
            } else if (yOffset > threshold) { // Down -> Good
                onGrade('good');
            } else {
                animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
                animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
            }
        }
    };

    if (!word) return null;

    return (
        <div className="max-w-md mx-auto perspective-1000 w-full h-[60vh] min-h-[400px] max-h-[600px] flex items-center justify-center relative">
            {/* Background indicators for swipe */}
            <div className="absolute inset-0 flex justify-between items-center px-8 pointer-events-none z-0">
                <div className={`text-4xl font-bold text-rose-500 transition-opacity duration-200 ${x.get() < -50 ? 'opacity-100' : 'opacity-0'}`}>AGAIN</div>
                <div className={`text-4xl font-bold text-green-500 transition-opacity duration-200 ${x.get() > 50 ? 'opacity-100' : 'opacity-0'}`}>EASY</div>
            </div>
            <div className="absolute inset-0 flex flex-col justify-between items-center py-8 pointer-events-none z-0">
                <div className={`text-4xl font-bold text-yellow-500 transition-opacity duration-200 ${y.get() < -50 ? 'opacity-100' : 'opacity-0'}`}>HARD</div>
                <div className={`text-4xl font-bold text-blue-500 transition-opacity duration-200 ${y.get() > 50 ? 'opacity-100' : 'opacity-0'}`}>GOOD</div>
            </div>

            <motion.div
                style={{ x, y, rotate, opacity }}
                drag
                onDragEnd={handleDragEnd}
                className="relative w-full h-full cursor-grab active:cursor-grabbing z-10 touch-none"
            >
                <motion.div
                    className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                    onTap={(e) => {
                        // Don't flip if clicking on context button or its container
                        const target = e.target;
                        if (target.closest('[data-context-area]')) {
                            return;
                        }
                        if (!isFlipped) {
                            setIsFlipped(true);
                        }
                    }}
                >
                    {/* Front */}
                    <motion.div
                        className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-8 overflow-hidden"
                        style={{ zIndex: 1 }}
                    >
                        {/* Color Overlay */}
                        <motion.div
                            style={{ backgroundColor }}
                            className="absolute inset-0 z-0"
                        />

                        <div className="relative z-10 text-xs font-bold text-indigo-500 uppercase tracking-wider mb-4 flex-shrink-0">German</div>

                        <div className="relative z-10 flex-grow flex flex-col justify-center w-full overflow-y-auto custom-scrollbar">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 text-center mb-6 break-words">{word.id}</h2>

                            {/* Context Toggle */}
                            {word.context && (
                                <motion.div
                                    data-context-area
                                    className="w-full mt-4 z-10"
                                    onTapStart={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowContext(!showContext); }}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-800 dark:hover:text-indigo-300 transition flex items-center justify-center gap-1 mx-auto mb-2"
                                    >
                                        {showContext ? 'Hide Context' : 'Show Context'}
                                    </button>

                                    {showContext && (
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 w-full animate-in fade-in slide-in-from-bottom-2 max-h-32 overflow-y-auto">
                                            <p className="text-slate-600 dark:text-slate-300 italic text-center text-sm">"{word.context}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        <p className="mt-auto text-slate-400 text-sm pt-4 flex-shrink-0">Tap to flip • Drag to grade</p>
                    </motion.div>

                    {/* Back */}
                    <motion.div
                        className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-indigo-200 dark:border-slate-700 flex flex-col p-8 overflow-hidden"
                        style={{ opacity: 1, zIndex: 1 }}
                    >
                        {/* Flip Back Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                            className="absolute top-4 right-4 p-2 text-indigo-300 hover:text-indigo-600 transition z-20"
                            title="Flip Back"
                        >
                            <RotateCcw size={20} />
                        </button>

                        <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto custom-scrollbar w-full">
                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex-shrink-0">Meaning</div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-6 break-words">{word.definition}</h3>

                            {word.context && (
                                <div className="bg-white p-4 rounded-xl border border-indigo-100 w-full flex-shrink-0">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Context</div>
                                    <p className="text-slate-600 italic text-sm break-words">"{word.context}"</p>
                                </div>
                            )}
                        </div>

                        {/* Grading Buttons (Still useful for precise grading) */}
                        <div className="grid grid-cols-4 gap-2 mt-6 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onGrade('again'); }}
                                className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                            >
                                <span className="font-bold text-sm">Again</span>
                                <span className="text-[10px] opacity-70">&lt; 1m</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onGrade('hard'); }}
                                className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                            >
                                <span className="font-bold text-sm">Hard</span>
                                <span className="text-[10px] opacity-70">2d</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onGrade('good'); }}
                                className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                            >
                                <span className="font-bold text-sm">Good</span>
                                <span className="text-[10px] opacity-70">4d</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onGrade('easy'); }}
                                className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                            >
                                <span className="font-bold text-sm">Easy</span>
                                <span className="text-[10px] opacity-70">7d</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
