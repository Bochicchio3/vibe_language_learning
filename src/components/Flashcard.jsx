import React, { useState } from 'react';
import { RotateCcw, CheckCircle, Brain } from 'lucide-react';

export default function Flashcard({ word, onGrade }) {
    const [isFlipped, setIsFlipped] = useState(false);

    // Reset flip state when word changes
    React.useEffect(() => {
        setIsFlipped(false);
    }, [word]);

    if (!word) return null;

    return (
        <div className="max-w-md mx-auto perspective-1000 w-full">
            <div
                className={`relative w-full min-h-[400px] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => !isFlipped && setIsFlipped(true)}
            >
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center p-8 hover:shadow-xl transition">
                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-4">German</div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-800 text-center">{word.id}</h2>
                    <p className="mt-8 text-slate-400 text-sm">Click to reveal</p>
                </div>

                {/* Back */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-50 rounded-2xl shadow-lg border border-indigo-100 flex flex-col p-8">
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Meaning</div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">{word.definition}</h3>

                        {word.context && (
                            <div className="bg-white p-4 rounded-xl border border-indigo-100 w-full">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Context</div>
                                <p className="text-slate-600 italic">"{word.context}"</p>
                            </div>
                        )}
                    </div>

                    {/* Grading Buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-6">
                        <button
                            onClick={(e) => { e.stopPropagation(); onGrade('again'); }}
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                        >
                            <span className="font-bold text-sm">Again</span>
                            <span className="text-[10px] opacity-70">&lt; 1m</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onGrade('hard'); }}
                            className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
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
                </div>
            </div>
        </div>
    );
}
