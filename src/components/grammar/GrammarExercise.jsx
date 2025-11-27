import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import ExerciseRenderer from './exercises/ExerciseRenderer';
import { generateExercises } from '../../services/api/grammar';

const GrammarExercise = ({ topic, level, lessonData, onBack, onComplete }) => {
    const [exercises, setExercises] = useState([]);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // Map of index -> answer
    const [showResult, setShowResult] = useState(false); // Show result for current question
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);

    // Loading states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // If lessonData has exercises (e.g. saved previously), use them
        // Otherwise, we might need to generate them.
        // For now, let's assume we start empty and user clicks "Generate" or we auto-generate.
        // But wait, the previous code assumed lessonData.exercises.
        // Let's check if we have them.
        if (lessonData?.exercises && lessonData.exercises.length > 0) {
            setExercises(lessonData.exercises);
        }
    }, [lessonData]);

    const handleGenerateExercises = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await generateExercises(topic.title, level);
            // response.exercises should be the array
            if (response && response.exercises) {
                setExercises(response.exercises);
                // Optionally save these exercises to Firestore here or in parent
            } else {
                throw new Error("Invalid response format");
            }
        } catch (err) {
            console.error("Failed to generate exercises:", err);
            setError("Failed to generate exercises. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (answer) => {
        setUserAnswers(prev => ({
            ...prev,
            [currentExerciseIndex]: answer
        }));
    };

    const handleCheck = () => {
        const currentExercise = exercises[currentExerciseIndex];
        const answer = userAnswers[currentExerciseIndex];

        if (answer === undefined || answer === null) return;

        let isCorrect = false;
        if (currentExercise.type === 'multiple_choice') {
            isCorrect = answer === currentExercise.correct;
        } else if (currentExercise.type === 'gap_fill') {
            isCorrect = answer.toLowerCase().trim() === currentExercise.answer.toLowerCase().trim();
        } else if (currentExercise.type === 'reorder') {
            isCorrect = JSON.stringify(answer) === JSON.stringify(currentExercise.correct_order);
        }

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setShowResult(true);
    };

    const handleNext = () => {
        if (currentExerciseIndex < exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);
            setShowResult(false);
        } else {
            setCompleted(true);
            const finalScore = score + (checkCurrentCorrect() ? 0 : 0); // Score already updated in handleCheck
            // Actually score is updated when checking.
            // Wait, if I click "Next" (which is "See Results" on last step), I am done.
            if (onComplete) {
                onComplete((score / exercises.length) * 100);
            }
        }
    };

    // Helper to check correctness without updating state (for logic if needed)
    const checkCurrentCorrect = () => {
        const currentExercise = exercises[currentExerciseIndex];
        const answer = userAnswers[currentExerciseIndex];
        if (!currentExercise || answer === undefined) return false;

        if (currentExercise.type === 'multiple_choice') {
            return answer === currentExercise.correct;
        } else if (currentExercise.type === 'gap_fill') {
            return answer.toLowerCase().trim() === currentExercise.answer.toLowerCase().trim();
        } else if (currentExercise.type === 'reorder') {
            return JSON.stringify(answer) === JSON.stringify(currentExercise.correct_order);
        }
        return false;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Generating custom exercises for {topic.title}...
                </p>
            </div>
        );
    }

    if (exercises.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="text-indigo-600 dark:text-indigo-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                        Ready to Practice?
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                        Generate a personalized exercise pack for <strong>{topic.title}</strong> ({level}) to test your knowledge.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={handleGenerateExercises}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Sparkles size={18} />
                            Generate Exercises
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (completed) {
        const percentage = Math.round((score / exercises.length) * 100);
        const passed = percentage >= 70;

        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border-2 border-purple-200 dark:border-purple-700 text-center">
                    <div className="mb-6">
                        {passed ? (
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <Trophy className="text-white" size={48} />
                            </div>
                        ) : (
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                                <Lightbulb className="text-white" size={48} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
                        {passed ? 'Great Job!' : 'Keep Practicing!'}
                    </h2>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        You scored {score} out of {exercises.length}
                    </p>

                    <div className="mb-8">
                        <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {percentage}%
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            Back to Lesson
                        </button>
                        <button
                            onClick={() => {
                                setCurrentExerciseIndex(0);
                                setUserAnswers({});
                                setShowResult(false);
                                setScore(0);
                                setCompleted(false);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentExercise = exercises[currentExerciseIndex];
    const userAnswer = userAnswers[currentExerciseIndex];

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Lesson</span>
                </button>

                {/* Progress bar */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {currentExerciseIndex + 1} / {exercises.length}
                    </span>
                </div>
            </div>

            {/* Exercise Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border-2 border-purple-200 dark:border-purple-700">
                <div className="mb-6">
                    <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                        {currentExercise.type.replace('_', ' ')}
                    </span>
                </div>

                <ExerciseRenderer
                    exercise={currentExercise}
                    onAnswer={handleAnswer}
                    userAnswer={userAnswer}
                    showResult={showResult}
                />

                {/* Action buttons */}
                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                    {!showResult ? (
                        <button
                            onClick={handleCheck}
                            disabled={userAnswer === undefined || userAnswer === null}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                            Check Answer
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md hover:shadow-lg"
                        >
                            {currentExerciseIndex === exercises.length - 1 ? 'See Results' : 'Next Question'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrammarExercise;

