import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

const Reorder = ({ exercise, onAnswer, userAnswer, showResult }) => {
    const { segments, correct_order } = exercise;

    // Initialize userAnswer with empty array if null
    // userAnswer here will be an array of indices representing the current order
    const currentOrder = userAnswer || [];

    // Available segments are those not yet in currentOrder
    const availableIndices = segments.map((_, i) => i).filter(i => !currentOrder.includes(i));

    const handleAdd = (index) => {
        onAnswer([...currentOrder, index]);
    };

    const handleRemove = (indexToRemove) => {
        onAnswer(currentOrder.filter(idx => idx !== indexToRemove));
    };

    const isCorrect = showResult && JSON.stringify(currentOrder) === JSON.stringify(correct_order);

    return (
        <div className="space-y-8">
            <h3 className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                Reorder the words to form a correct sentence:
            </h3>

            {/* Drop Zone (Current Sentence) */}
            <div className={`
                min-h-[80px] p-4 rounded-xl border-2 border-dashed transition-colors flex flex-wrap gap-2 items-center
                ${showResult
                    ? isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/10'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30'
                }
            `}>
                {currentOrder.length === 0 && !showResult && (
                    <span className="text-slate-400 italic w-full text-center">Tap words to build sentence</span>
                )}

                {currentOrder.map((segIndex, i) => (
                    <button
                        key={`${segIndex}-${i}`}
                        onClick={() => !showResult && handleRemove(segIndex)}
                        disabled={showResult}
                        className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-900 text-slate-800 dark:text-white font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors"
                    >
                        {segments[segIndex]}
                    </button>
                ))}

                {showResult && (
                    <div className="ml-auto">
                        {isCorrect ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                    </div>
                )}
            </div>

            {/* Word Bank */}
            {!showResult && (
                <div className="flex flex-wrap gap-3 justify-center">
                    {availableIndices.map((segIndex) => (
                        <button
                            key={segIndex}
                            onClick={() => handleAdd(segIndex)}
                            className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium hover:border-indigo-500 hover:text-indigo-600 transition-all transform hover:-translate-y-0.5"
                        >
                            {segments[segIndex]}
                        </button>
                    ))}
                </div>
            )}

            {showResult && !isCorrect && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium mb-2">Correct Order:</p>
                    <div className="flex flex-wrap gap-2">
                        {correct_order.map((idx) => (
                            <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-800 rounded border border-indigo-200 dark:border-indigo-800 text-slate-700 dark:text-slate-300">
                                {segments[idx]}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reorder;
