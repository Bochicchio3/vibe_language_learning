import React, { useState } from 'react';
import { BookOpen, AlertTriangle, Check, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const ConceptCard = ({ data }) => {
    if (!data) return null;

    const { overview, form, usage, examples, common_mistakes, mini_quiz } = data;

    return (
        <div className="space-y-8">
            {/* Overview Section */}
            <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Overview</h3>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
                    {overview}
                </p>
            </section>

            {/* Form / Structure Section */}
            {form && (
                <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Structure</h3>
                    {form.type === 'table' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        {form.headers.map((header, i) => (
                                            <th key={i} className="p-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.rows.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            {form.headers.map((_, j) => {
                                                // Handle both array rows (legacy/local) and dict rows (Firestore)
                                                const cellContent = Array.isArray(row) ? row[j] : row[String(j)];
                                                return (
                                                    <td key={j} className="p-3 text-slate-700 dark:text-slate-300">
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* Usage Section */}
            {usage && usage.length > 0 && (
                <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">When to use</h3>
                    <ul className="space-y-3">
                        {usage.map((point, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Examples Section */}
            {examples && examples.length > 0 && (
                <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Examples</h3>
                    <div className="grid gap-4">
                        {examples.map((ex, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="font-medium text-slate-900 dark:text-white text-lg mb-1">
                                    {ex.german}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {ex.english}
                                </div>
                                {ex.note && (
                                    <div className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <HelpCircle size={14} />
                                        {ex.note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Common Mistakes Section */}
            {common_mistakes && common_mistakes.length > 0 && (
                <section className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 shadow-sm border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-500">
                        <AlertTriangle size={24} />
                        <h3 className="text-lg font-bold">Common Mistakes</h3>
                    </div>
                    <div className="space-y-4">
                        {common_mistakes.map((mistake, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                                <div className="flex items-start gap-3 mb-2">
                                    <X className="text-red-500 mt-1 flex-shrink-0" size={18} />
                                    <div className="text-red-600 dark:text-red-400 line-through decoration-2 decoration-red-500/30">
                                        {mistake.mistake}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="text-green-500 mt-1 flex-shrink-0" size={18} />
                                    <div className="text-green-600 dark:text-green-400 font-medium">
                                        {mistake.correction}
                                    </div>
                                </div>
                                <div className="mt-2 ml-8 text-sm text-slate-500 dark:text-slate-400 italic">
                                    — {mistake.explanation}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Mini Quiz Section */}
            {mini_quiz && mini_quiz.length > 0 && (
                <MiniQuiz quizData={mini_quiz} />
            )}
        </div>
    );
};

const MiniQuiz = ({ quizData }) => {
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleSelect = (qIndex, optionIndex) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
    };

    const checkAnswers = () => {
        setShowResults(true);
    };

    const resetQuiz = () => {
        setAnswers({});
        setShowResults(false);
    };

    return (
        <section className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Quick Check</h3>
                {expanded ? <ChevronUp className="text-indigo-500" /> : <ChevronDown className="text-indigo-500" />}
            </div>

            {expanded && (
                <div className="mt-6 space-y-6">
                    {quizData.map((item, qIndex) => (
                        <div key={qIndex} className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                            <p className="font-medium text-slate-900 dark:text-white mb-3">
                                {item.question}
                            </p>
                            <div className="space-y-2">
                                {item.options.map((opt, oIndex) => {
                                    const isSelected = answers[qIndex] === oIndex;
                                    const isCorrect = item.correct === oIndex;

                                    let btnClass = "w-full text-left p-3 rounded-lg border transition-all ";

                                    if (showResults) {
                                        if (isCorrect) btnClass += "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300";
                                        else if (isSelected) btnClass += "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300";
                                        else btnClass += "border-slate-200 dark:border-slate-700 opacity-50";
                                    } else {
                                        if (isSelected) btnClass += "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300";
                                        else btnClass += "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50";
                                    }

                                    return (
                                        <button
                                            key={oIndex}
                                            onClick={() => handleSelect(qIndex, oIndex)}
                                            className={btnClass}
                                        >
                                            {opt}
                                            {showResults && isCorrect && <Check size={16} className="inline ml-2" />}
                                            {showResults && isSelected && !isCorrect && <X size={16} className="inline ml-2" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-2">
                        {!showResults ? (
                            <button
                                onClick={checkAnswers}
                                disabled={Object.keys(answers).length < quizData.length}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Check Answers
                            </button>
                        ) : (
                            <button
                                onClick={resetQuiz}
                                className="px-6 py-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default ConceptCard;
