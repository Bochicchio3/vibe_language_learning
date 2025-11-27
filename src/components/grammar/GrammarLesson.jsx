import React, { useState } from 'react';
import { ArrowLeft, Volume2, BookOpen, Play, CheckCircle, Lightbulb, Sparkles, Layers } from 'lucide-react';
import ConceptCard from './ConceptCard';
import ContextCard from './ContextCard';
import { generateContextCard } from '../../services/api/grammar';

const GrammarLesson = ({ topic, level, lessonData, onBack, onStartExercises }) => {
    const [activeTab, setActiveTab] = useState('concept');
    const [contextData, setContextData] = useState(lessonData.context || null);
    const [loadingContext, setLoadingContext] = useState(false);

    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        if (tab === 'context' && !contextData) {
            setLoadingContext(true);
            try {
                const data = await generateContextCard(topic.title, level);
                setContextData(data);
                // Ideally save to parent/firestore here
            } catch (error) {
                console.error("Failed to load context:", error);
            } finally {
                setLoadingContext(false);
            }
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

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 
                             dark:text-indigo-300 rounded-full text-sm font-medium">
                                {level}
                            </span>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                                {topic.title}
                            </h1>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            {topic.description}
                        </p>
                    </div>

                    <button
                        onClick={onStartExercises}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 
                       text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700
                       transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        <Play size={18} />
                        Start Practice
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => handleTabChange('concept')}
                        className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors
                            ${activeTab === 'concept'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <Lightbulb size={16} />
                        Concept
                    </button>
                    <button
                        onClick={() => handleTabChange('context')}
                        className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors
                            ${activeTab === 'context'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <BookOpen size={16} />
                        Context
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'concept' && (
                    <ConceptCard data={lessonData} />
                )}

                {activeTab === 'context' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {loadingContext ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                <p className="text-slate-500 dark:text-slate-400">Generating story context...</p>
                            </div>
                        ) : contextData ? (
                            <ContextCard data={contextData} />
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500">Failed to load context.</p>
                                <button
                                    onClick={() => handleTabChange('context')}
                                    className="mt-4 text-indigo-600 hover:underline"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarLesson;
