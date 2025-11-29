import React, { useState, useEffect } from 'react';
import {
    Brain,
    Sparkles,
    Lock,
    CheckCircle,
    Loader2,
    Play,
    BookOpen,
    Settings,
    GraduationCap,
    ChevronRight
} from 'lucide-react';
import { generateConceptCard } from '../../services/api/grammar';
import { GRAMMAR_CURRICULUM } from '../../services/grammarGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot
} from 'firebase/firestore';
import GrammarLesson from '../grammar/GrammarLesson';
import GrammarExercise from '../grammar/GrammarExercise';

const GrammarView = ({ selectedModel }) => {
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState('levels'); // 'levels', 'topics', 'lesson', 'exercises'
    const [selectedLevel, setSelectedLevel] = useState(null); // 'A1', 'A2', etc.
    const [selectedTopic, setSelectedTopic] = useState(null); // The specific topic object
    const [grammarData, setGrammarData] = useState({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(null);

    // Load grammar data from Firestore
    useEffect(() => {
        if (!currentUser) return;

        const grammarRef = collection(db, 'users', currentUser.uid, 'grammar');

        const unsubscribe = onSnapshot(grammarRef, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = { id: doc.id, ...doc.data() };
            });
            setGrammarData(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Calculate progress for a specific level (A1, A2...)
    const getLevelProgress = (level) => {
        const topics = GRAMMAR_CURRICULUM[level] || [];
        if (topics.length === 0) return 0;

        let completedTopics = 0;
        topics.forEach(topic => {
            // Check if this topic is completed in Firestore
            // Data structure: grammarData[topic.id].completed
            if (grammarData[topic.id]?.completed) {
                completedTopics++;
            }
        });

        return (completedTopics / topics.length) * 100;
    };

    // Handle Level selection (A1, A2...)
    const handleLevelClick = (level) => {
        setSelectedLevel(level);
        setViewMode('topics');
    };

    // Handle Topic selection within a level
    const handleTopicClick = (topic) => {
        setSelectedTopic(topic);
        setViewMode('lesson');
    };

    // Generate content for a specific topic
    // Generate content for a specific topic
    const handleGenerateContent = async (topic) => {
        // Use the selected model from props, or fallback to a default if not set
        const modelToUse = selectedModel || 'qwq:latest';

        setGenerating(true);
        setGenerationProgress({ topicId: topic.id, status: 'generating' });

        try {
            // Call the new backend API
            // We pass topic.title because the prompt needs the topic name, not just ID
            const content = await generateConceptCard(topic.title, selectedLevel, modelToUse);

            // Save to Firestore
            const topicRef = doc(db, 'users', currentUser.uid, 'grammar', topic.id);

            await setDoc(topicRef, {
                ...topic,
                level: selectedLevel,
                content: content,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            setGenerationProgress({ topicId: topic.id, status: 'completed' });
        } catch (error) {
            console.error('Generation failed:', error);
            setGenerationProgress({ topicId: topic.id, status: 'error', error: error.message });
        } finally {
            setGenerating(false);
        }
    };

    // Back navigation
    const handleBack = () => {
        if (viewMode === 'lesson' || viewMode === 'exercises') {
            setViewMode('topics');
            setSelectedTopic(null);
        } else if (viewMode === 'topics') {
            setViewMode('levels');
            setSelectedLevel(null);
        }
    };

    // Handle exercise completion
    const handleExerciseComplete = async (score) => {
        if (!currentUser || !selectedTopic) return;

        try {
            const topicRef = doc(db, 'users', currentUser.uid, 'grammar', selectedTopic.id);
            await updateDoc(topicRef, {
                completed: score >= 70,
                score: score,
                lastAccessed: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    // 1. Levels Grid View (A1, A2, B1...)
    if (viewMode === 'levels') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Brain className="text-indigo-600" size={32} />
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            Grammar Mastery
                        </h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                        Select your CEFR level to begin
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(GRAMMAR_CURRICULUM).map(level => (
                        <div
                            key={level}
                            onClick={() => handleLevelClick(level)}
                            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer border border-slate-200 dark:border-slate-700 group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                                    {level}
                                </div>
                                <div className="text-slate-400 group-hover:text-indigo-500 transition">
                                    <ChevronRight size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                {level} Level
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                {GRAMMAR_CURRICULUM[level].length} topics
                            </p>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${getLevelProgress(level)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Topics List View (for selected level)
    if (viewMode === 'topics') {
        const topics = GRAMMAR_CURRICULUM[selectedLevel];

        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition"
                >
                    <ChevronRight className="rotate-180" size={20} />
                    Back to Levels
                </button>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                    {selectedLevel} Grammar Topics
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    {topics.map(topic => {
                        const isGenerated = !!grammarData[topic.id]?.content;
                        const isCompleted = grammarData[topic.id]?.completed;
                        const isGenerating = generating && generationProgress?.topicId === topic.id;

                        return (
                            <div
                                key={topic.id}
                                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                        {isCompleted ? <CheckCircle size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                                            {topic.title}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                                            {topic.description}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    {isGenerated ? (
                                        <button
                                            onClick={() => handleTopicClick(topic)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            Start Lesson
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleGenerateContent(topic)}
                                            disabled={generating}
                                            className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    Generate Content
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 3. Lesson View
    if (viewMode === 'lesson') {
        const topicData = grammarData[selectedTopic.id];

        // Note: The structure of lessonData might need adjustment based on how we save it
        // In handleGenerateContent, we saved it as 'content' field
        const lessonData = topicData?.content;

        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <GrammarLesson
                    topic={selectedTopic} // Pass the full topic object
                    level={selectedLevel}
                    lessonData={lessonData}
                    onBack={handleBack}
                    onStartExercises={() => setViewMode('exercises')}
                />
            </div>
        );
    }

    // 4. Exercises View
    if (viewMode === 'exercises') {
        const topicData = grammarData[selectedTopic.id];
        const lessonData = topicData?.content;

        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <GrammarExercise
                    topic={selectedTopic}
                    level={selectedLevel}
                    lessonData={lessonData}
                    onBack={handleBack}
                    onComplete={(score) => {
                        handleExerciseComplete(score);
                        setViewMode('lesson');
                    }}
                />
            </div>
        );
    }

    return null;
};

export default GrammarView;
