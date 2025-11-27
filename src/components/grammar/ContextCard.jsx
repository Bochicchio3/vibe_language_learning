import React, { useState } from 'react';
import { BookOpen, Info, X } from 'lucide-react';

const ContextCard = ({ data }) => {
    const { title, text, glossary, grammar_spotting } = data;
    const [selectedSpot, setSelectedSpot] = useState(null);

    // Helper to highlight grammar spots in the text
    const renderTextWithHighlights = () => {
        if (!grammar_spotting || grammar_spotting.length === 0) return <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{text}</p>;

        let parts = [];
        let lastIndex = 0;

        // Sort spots by position in text to avoid overlap issues (simple approach)
        // Since we don't have indices, we have to find them.
        // This is tricky if phrases repeat. We'll just replace the first occurrence found after lastIndex.

        // A better approach for this MVP:
        // We will iterate through the text and try to match phrases.
        // But for simplicity and robustness, let's just highlight all occurrences or use a library.
        // Given the constraints, let's try a simple split/replace approach but be careful.

        // Actually, let's just render the text and let the user click on a list of spots below, 
        // OR try to highlight. Highlighting is cooler.

        // Let's use a simple strategy: Find all unique phrases and replace them with a span.
        // We need to be careful about overlapping phrases.

        // Let's just iterate through the text and build segments.
        // To keep it simple: We will just highlight the phrases found in the text.

        // 1. Create a map of phrase -> rule
        const spotMap = {};
        grammar_spotting.forEach(spot => {
            spotMap[spot.phrase.toLowerCase()] = spot;
        });

        // 2. Split text by spaces and check for matches (simplistic)
        // This breaks for multi-word phrases.

        // Alternative: Use a regex to find all phrases.
        const phrases = grammar_spotting.map(s => s.phrase).sort((a, b) => b.length - a.length); // Longest first
        if (phrases.length === 0) return <p>{text}</p>;

        const pattern = new RegExp(`(${phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

        const splitText = text.split(pattern);

        return (
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                {splitText.map((part, i) => {
                    const lowerPart = part.toLowerCase();
                    const spot = grammar_spotting.find(s => s.phrase.toLowerCase() === lowerPart);

                    if (spot) {
                        return (
                            <span
                                key={i}
                                onClick={() => setSelectedSpot(spot)}
                                className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors border-b-2 border-yellow-300 dark:border-yellow-700"
                            >
                                {part}
                            </span>
                        );
                    }
                    return part;
                })}
            </p>
        );
    };

    return (
        <div className="space-y-8">
            {/* Story Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <BookOpen className="text-emerald-600 dark:text-emerald-400" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                </div>

                <div className="prose dark:prose-invert max-w-none mb-8">
                    {renderTextWithHighlights()}
                </div>

                {/* Selected Spot Detail */}
                {selectedSpot && (
                    <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <Info className="text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" size={20} />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                    "{selectedSpot.phrase}"
                                </h4>
                                <button
                                    onClick={() => setSelectedSpot(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-sm">
                                {selectedSpot.rule}
                            </p>
                        </div>
                    </div>
                )}

                {/* Glossary */}
                {glossary && glossary.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Glossary
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {glossary.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.word}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">{item.definition}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grammar Spotting List (Backup/Overview) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info size={20} className="text-indigo-500" />
                    Grammar in Context
                </h3>
                <div className="space-y-3">
                    {grammar_spotting.map((spot, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                {spot.phrase}
                            </span>
                            <span className="hidden sm:block text-slate-300 dark:text-slate-600">|</span>
                            <span className="text-slate-600 dark:text-slate-400 text-sm">
                                {spot.rule}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContextCard;
