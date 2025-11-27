import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Lightbulb, Trophy, MoveRight, RefreshCw } from 'lucide-react';

// --- Sub-Components for Exercise Types ---

const MultipleChoice = ({ exercise, onAnswer, showFeedback, selectedAnswer }) => {
    return (
        <div className="space-y-3 mb-6">
            {exercise.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = exercise.correctIndex === index;
                const showCorrect = showFeedback && isCorrect;
                const showIncorrect = showFeedback && isSelected && !isCorrect;

                return (
                    <button
                        key={index}
                        onClick={() => onAnswer(index)}
                        disabled={showFeedback}
                        className={`
              w-full p-4 rounded-lg border-2 text-left transition-all duration-200
              ${!showFeedback && isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ''}
              ${!showFeedback && !isSelected ? 'border-slate-200 dark:border-slate-700 hover:border-indigo-300' : ''}
              ${showCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
              ${showIncorrect ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
              ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
            `}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-slate-800 dark:text-white font-medium">
                                {option}
                            </span>
                            {showCorrect && <CheckCircle className="text-green-600" size={24} />}
                            {showIncorrect && <XCircle className="text-red-600" size={24} />}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

const GapFill = ({ exercise, onAnswer, showFeedback, selectedAnswer }) => {
    const [input, setInput] = useState('');

    useEffect(() => {
        if (selectedAnswer) setInput(selectedAnswer);
    }, [selectedAnswer]);

    const handleChange = (e) => {
        setInput(e.target.value);
        onAnswer(e.target.value);
    };

    const parts = exercise.question.split('___');

    return (
        <div className="mb-8">
            <div className="text-xl text-slate-800 dark:text-white leading-relaxed">
                {parts[0]}
                <input
                    type="text"
                    value={input}
                    onChange={handleChange}
                    disabled={showFeedback}
                    className={`mx-2 px-3 py-1 border-b-2 outline-none bg-transparent font-bold w-32 text-center
                        ${showFeedback
                            ? (input.toLowerCase().trim() === exercise.answer.toLowerCase().trim()
                                ? 'border-green-500 text-green-600'
                                : 'border-red-500 text-red-600')
                            : 'border-indigo-300 focus:border-indigo-600'
                        }`}
                    placeholder="..."
                />
                {parts[1]}
            </div>
            {showFeedback && input.toLowerCase().trim() !== exercise.answer.toLowerCase().trim() && (
                <div className="mt-4 text-green-600 font-medium">
                    Correct answer: {exercise.answer}
                </div>
            )}
        </div>
    );
};

const Matching = ({ exercise, onAnswer, showFeedback, selectedAnswer }) => {
    // selectedAnswer is an object { leftIndex: rightIndex }
    const [pairs, setPairs] = useState({});
    const [selectedLeft, setSelectedLeft] = useState(null);

    useEffect(() => {
        if (selectedAnswer) setPairs(selectedAnswer);
    }, [selectedAnswer]);

    const handleLeftClick = (index) => {
        if (showFeedback || pairs[index] !== undefined) return;
        setSelectedLeft(index);
    };

    const handleRightClick = (index) => {
        if (showFeedback || selectedLeft === null) return;

        // Check if this right item is already paired
        if (Object.values(pairs).includes(index)) return;

        const newPairs = { ...pairs, [selectedLeft]: index };
        setPairs(newPairs);
        setSelectedLeft(null);
        onAnswer(newPairs);
    };

    const resetPair = (leftIndex) => {
        if (showFeedback) return;
        const newPairs = { ...pairs };
        delete newPairs[leftIndex];
        setPairs(newPairs);
        onAnswer(newPairs);
    };

    return (
        <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-3">
                {exercise.pairs.map((pair, idx) => {
                    const isPaired = pairs[idx] !== undefined;
                    const isSelected = selectedLeft === idx;

                    let borderColor = 'border-slate-200 dark:border-slate-700';
                    if (isSelected) borderColor = 'border-indigo-500 bg-indigo-50';
                    if (isPaired) borderColor = 'border-indigo-300 bg-indigo-50/50';

                    if (showFeedback) {
                        const rightIdx = pairs[idx];
                        // Assuming simple index matching for correctness check if not specified
                        // But usually matching exercises need specific logic. 
                        // For simplicity, let's assume the pairs array is the correct mapping (0->0, 1->1)
                        // In a real app, we might shuffle one side.
                        const isCorrect = rightIdx === idx;
                        borderColor = isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
                    }

                    return (
                        <button
                            key={`left-${idx}`}
                            onClick={() => isPaired ? resetPair(idx) : handleLeftClick(idx)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${borderColor}`}
                        >
                            {pair.left}
                        </button>
                    );
                })}
            </div>
            <div className="space-y-3">
                {exercise.pairs.map((pair, idx) => {
                    // Find which left item is paired with this right item
                    const leftPaired = Object.keys(pairs).find(key => pairs[key] === idx);
                    const isPaired = leftPaired !== undefined;

                    let borderColor = 'border-slate-200 dark:border-slate-700';
                    if (isPaired) borderColor = 'border-indigo-300 bg-indigo-50/50';

                    if (showFeedback && isPaired) {
                        const isCorrect = parseInt(leftPaired) === idx;
                        borderColor = isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
                    }

                    return (
                        <button
                            key={`right-${idx}`}
                            onClick={() => handleRightClick(idx)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${borderColor}`}
                        >
                            {pair.right}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const Reorder = ({ exercise, onAnswer, showFeedback, selectedAnswer }) => {
    const [currentOrder, setCurrentOrder] = useState([]);
    const [availableWords, setAvailableWords] = useState([]);

    useEffect(() => {
        if (!selectedAnswer) {
            // Initialize
            setAvailableWords(exercise.segments.map((word, idx) => ({ word, id: idx })));
            setCurrentOrder([]);
        }
    }, [exercise]);

    const handleAddWord = (wordObj) => {
        if (showFeedback) return;
        const newOrder = [...currentOrder, wordObj];
        const newAvailable = availableWords.filter(w => w.id !== wordObj.id);

        setCurrentOrder(newOrder);
        setAvailableWords(newAvailable);
        onAnswer(newOrder.map(w => w.id));
    };

    const handleRemoveWord = (wordObj) => {
        if (showFeedback) return;
        const newOrder = currentOrder.filter(w => w.id !== wordObj.id);
        const newAvailable = [...availableWords, wordObj].sort((a, b) => a.id - b.id); // Keep original order roughly

        setCurrentOrder(newOrder);
        setAvailableWords(newAvailable);
        onAnswer(newOrder.map(w => w.id));
    };

    return (
        <div className="mb-8">
            {/* Answer Area */}
            <div className="min-h-[60px] p-4 border-b-2 border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-2">
                {currentOrder.map((wordObj) => (
                    <button
                        key={wordObj.id}
                        onClick={() => handleRemoveWord(wordObj)}
                        className={`px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium hover:bg-red-100 hover:text-red-700 transition
                            ${showFeedback
                                ? (JSON.stringify(currentOrder.map(w => w.id)) === JSON.stringify(exercise.correctOrder)
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700')
                                : ''}`}
                    >
                        {wordObj.word}
                    </button>
                ))}
                {currentOrder.length === 0 && (
                    <span className="text-slate-400 italic">Tap words to build the sentence...</span>
                )}
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap gap-3 justify-center">
                {availableWords.map((wordObj) => (
                    <button
                        key={wordObj.id}
                        onClick={() => handleAddWord(wordObj)}
                        className="px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition"
                    >
                        {wordObj.word}
                    </button>
                ))}
            </div>

            {showFeedback && (
                <div className="mt-4 text-center text-slate-500">
                    Correct order: {exercise.correctOrder.map(idx => exercise.segments[idx]).join(' ')}
                </div>
            )}
        </div>
    );
};

// --- Main Component ---

const GrammarExercise = ({ topic, level, lessonData, onBack, onComplete }) => {
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);

    const exercises = lessonData.exercises || [];
    const currentExercise = exercises[currentExerciseIndex];
    const isLastExercise = currentExerciseIndex === exercises.length - 1;

    const handleAnswerUpdate = (answer) => {
        if (showFeedback) return;
        setSelectedAnswer(answer);
    };

    const checkAnswer = () => {
        if (!currentExercise) return false;

        switch (currentExercise.type) {
            case 'multiple-choice':
                return selectedAnswer === currentExercise.correctIndex;
            case 'gap-fill':
                return selectedAnswer.toLowerCase().trim() === currentExercise.answer.toLowerCase().trim();
            case 'matching':
                // Check if all pairs match the index (assuming 0->0, 1->1 mapping for simplicity of generation)
                // In a real scenario, the exercise data should define the correct pairs explicitly.
                // For now, we assume the generated pairs are aligned (left[0] matches right[0])
                const pairs = selectedAnswer;
                if (Object.keys(pairs).length !== currentExercise.pairs.length) return false;
                return Object.keys(pairs).every(key => parseInt(pairs[key]) === parseInt(key));
            case 'reorder':
                return JSON.stringify(selectedAnswer) === JSON.stringify(currentExercise.correctOrder);
            default:
                return false;
        }
    };

    const handleSubmit = () => {
        if (selectedAnswer === null) return;

        setShowFeedback(true);

        if (checkAnswer()) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (isLastExercise) {
            const isCorrect = checkAnswer();
            const finalScore = ((score + (isCorrect ? 1 : 0)) / exercises.length) * 100;
            setCompleted(true);
            if (onComplete) {
                onComplete(finalScore);
            }
        } else {
            setCurrentExerciseIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowFeedback(false);
        }
    };

    if (!exercises || exercises.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-800">
                        No exercises available for this level yet.
                    </p>
                    <button
                        onClick={onBack}
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Back to Lesson
                    </button>
                </div>
            </div>
        );
    }

    // Completion screen
    if (completed) {
        const finalScore = (score / exercises.length) * 100;
        const passed = finalScore >= 70;

        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border-2 
                      border-purple-200 dark:border-purple-700 text-center">
                    <div className="mb-6">
                        {passed ? (
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 
                            rounded-full flex items-center justify-center">
                                <Trophy className="text-white" size={48} />
                            </div>
                        ) : (
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-red-500 
                            rounded-full flex items-center justify-center">
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
                        <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 
                          bg-clip-text text-transparent">
                            {Math.round(finalScore)}%
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 
                       dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600
                       transition-colors"
                        >
                            Back to Lesson
                        </button>
                        <button
                            onClick={() => {
                                setCurrentExerciseIndex(0);
                                setSelectedAnswer(null);
                                setShowFeedback(false);
                                setScore(0);
                                setCompleted(false);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                       text-white rounded-lg hover:from-purple-700 hover:to-indigo-700
                       transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Exercise screen
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 
                     hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border-2 
                    border-purple-200 dark:border-purple-700">

                {/* Question Header */}
                <div className="mb-6">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                        {currentExercise.type || 'Multiple Choice'}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {currentExercise.question}
                    </h2>
                </div>

                {/* Render specific exercise type */}
                {(!currentExercise.type || currentExercise.type === 'multiple-choice') && (
                    <MultipleChoice
                        exercise={currentExercise}
                        onAnswer={handleAnswerUpdate}
                        showFeedback={showFeedback}
                        selectedAnswer={selectedAnswer}
                    />
                )}
                {currentExercise.type === 'gap-fill' && (
                    <GapFill
                        exercise={currentExercise}
                        onAnswer={handleAnswerUpdate}
                        showFeedback={showFeedback}
                        selectedAnswer={selectedAnswer}
                    />
                )}
                {currentExercise.type === 'matching' && (
                    <Matching
                        exercise={currentExercise}
                        onAnswer={handleAnswerUpdate}
                        showFeedback={showFeedback}
                        selectedAnswer={selectedAnswer}
                    />
                )}
                {currentExercise.type === 'reorder' && (
                    <Reorder
                        exercise={currentExercise}
                        onAnswer={handleAnswerUpdate}
                        showFeedback={showFeedback}
                        selectedAnswer={selectedAnswer}
                    />
                )}

                {/* Feedback */}
                {showFeedback && (
                    <div className={`p-4 rounded-lg mb-6 ${checkAnswer()
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}>
                        <p className={`text-sm font-medium mb-2 ${checkAnswer()
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                            }`}>
                            {checkAnswer() ? '✓ Correct!' : '✗ Incorrect'}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                            {currentExercise.explanation}
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    {!showFeedback ? (
                        <button
                            onClick={handleSubmit}
                            disabled={selectedAnswer === null}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                       text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Check Answer
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                       text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700
                       transition-all"
                        >
                            {isLastExercise ? 'See Results' : 'Next Question'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrammarExercise;
