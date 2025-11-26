import React, { useState } from 'react';
import { ArrowLeft, Volume2, BookOpen, Play, CheckCircle, Lightbulb } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

const GrammarLesson = ({ topic, level, lessonData, onBack, onStartExercises }) => {
    const { speak, stop, isPlaying } = useTTS();
    const [playingExample, setPlayingExample] = useState(null);

    const handlePlayExample = (text, index) => {
        if (isPlaying && playingExample === index) {
            stop();
            setPlayingExample(null);
        } else {
            setPlayingExample(index);
            speak([text], () => setPlayingExample(null));
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 
                     hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Levels</span>
                </button>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 
                             dark:text-indigo-300 rounded-full text-sm font-medium">
                                {level}
                            </span>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                                {lessonData.title}
                            </h1>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            {topic.title}
                        </p>
                    </div>

                    {lessonData.exercises && lessonData.exercises.length > 0 && (
                        <button
                            onClick={onStartExercises}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 
                       text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700
                       transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Play size={18} />
                            Start Practice
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Explanation */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Explanation Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="text-indigo-600" size={20} />
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Explanation
                            </h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                            {lessonData.explanation?.split('\n\n').map((paragraph, idx) => (
                                <p key={idx} className="mb-4 leading-relaxed">
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Examples Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="text-yellow-600" size={20} />
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Examples
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {lessonData.examples?.map((example, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border 
                           border-slate-200 dark:border-slate-700 hover:border-indigo-300 
                           dark:hover:border-indigo-600 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {/* German */}
                                            <p className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                                                {example.german}
                                            </p>
                                            {/* English */}
                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic mb-1">
                                                {example.english}
                                            </p>
                                            {/* Note */}
                                            {example.note && (
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 
                                    bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded inline-block">
                                                    💡 {example.note}
                                                </p>
                                            )}
                                        </div>

                                        {/* Audio button */}
                                        <button
                                            onClick={() => handlePlayExample(example.german, idx)}
                                            className={`p-2 rounded-lg transition-colors ${playingExample === idx
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                                }`}
                                        >
                                            <Volume2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Points */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 
                        dark:to-indigo-900/20 rounded-xl p-6 shadow-sm border-2 
                        border-purple-200 dark:border-purple-700 sticky top-4">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="text-purple-600" size={20} />
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                Key Points
                            </h2>
                        </div>
                        <ul className="space-y-3">
                            {lessonData.keyPoints?.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white 
                                 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* Exercise prompt */}
                        {lessonData.exercises && lessonData.exercises.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 text-center">
                                    Ready to test your knowledge?
                                </p>
                                <button
                                    onClick={onStartExercises}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                           text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700
                           transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <Play size={18} />
                                    {lessonData.exercises.length} Exercises
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrammarLesson;
