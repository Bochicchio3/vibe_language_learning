import React from 'react';
import { Check, X } from 'lucide-react';

const MultipleChoice = ({ exercise, onAnswer, userAnswer, showResult }) => {
    const { question, options, correct, explanation } = exercise;

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-6">
                {question}
            </h3>

            <div className="space-y-3">
                {options.map((option, idx) => {
                    const isSelected = userAnswer === idx;
                    const isCorrect = correct === idx;

                    let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ";

                    if (showResult) {
                        if (isCorrect) {
                            btnClass += "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-300";
                        } else if (isSelected) {
                            btnClass += "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-500 dark:text-red-300";
                        } else {
                            btnClass += "border-slate-200 dark:border-slate-700 opacity-50";
                        }
                    } else {
                        if (isSelected) {
                            btnClass += "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-300";
                        } else {
                            btnClass += "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => !showResult && onAnswer(idx)}
                            disabled={showResult}
                            className={btnClass}
                        >
                            <span className="font-medium">{option}</span>
                            {showResult && isCorrect && <Check className="text-green-600 dark:text-green-400" size={20} />}
                            {showResult && isSelected && !isCorrect && <X className="text-red-600 dark:text-red-400" size={20} />}
                        </button>
                    );
                })}
            </div>

            {showResult && explanation && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-800 dark:text-indigo-200 text-sm">
                    💡 <strong>Explanation:</strong> {explanation}
                </div>
            )}
        </div>
    );
};

export default MultipleChoice;
