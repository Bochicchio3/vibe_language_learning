import React from 'react';
import { Check, X } from 'lucide-react';

const GapFill = ({ exercise, onAnswer, userAnswer, showResult }) => {
    const { question, answer, hint } = exercise;

    // Split question by '___' to insert input
    const parts = question.split('___');

    const handleChange = (e) => {
        onAnswer(e.target.value);
    };

    const isCorrect = showResult && userAnswer?.toLowerCase().trim() === answer.toLowerCase().trim();

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                {parts[0]}
                <span className="inline-block mx-2 relative">
                    <input
                        type="text"
                        value={userAnswer || ''}
                        onChange={handleChange}
                        disabled={showResult}
                        className={`
                            w-32 px-3 py-1 border-b-2 bg-transparent text-center focus:outline-none transition-colors
                            ${showResult
                                ? isCorrect
                                    ? 'border-green-500 text-green-600 dark:text-green-400'
                                    : 'border-red-500 text-red-600 dark:text-red-400'
                                : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 text-slate-900 dark:text-white'
                            }
                        `}
                        placeholder="?"
                    />
                    {showResult && (
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                            {isCorrect ? (
                                <Check className="text-green-500" size={20} />
                            ) : (
                                <X className="text-red-500" size={20} />
                            )}
                        </div>
                    )}
                </span>
                {parts[1]}
            </h3>

            {hint && !showResult && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Hint: {hint}
                </p>
            )}

            {showResult && !isCorrect && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-200">
                    Correct answer: <strong>{answer}</strong>
                </div>
            )}
        </div>
    );
};

export default GapFill;
