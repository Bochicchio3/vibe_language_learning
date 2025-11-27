import React from 'react';
import { ArrowLeft, Lock, CheckCircle, Sparkles, Circle } from 'lucide-react';
import { GRAMMAR_LEVELS } from '../../services/grammarGenerator';

const GrammarLevelSelector = ({ topic, topicData, onLevelClick, onBack, onGenerateLevel, generating }) => {
    // Group levels by main level (A1, A2, etc.)
    const groupedLevels = GRAMMAR_LEVELS.reduce((acc, level) => {
        const mainLevel = level.split('_')[0]; // 'A1', 'A2', etc.
        if (!acc[mainLevel]) acc[mainLevel] = [];
        acc[mainLevel].push(level);
        return acc;
    }, {});

    const getLevelStatus = (level) => {
        if (!topicData || !topicData.levels || !topicData.levels[level]) {
            return 'locked';
        }
        return topicData.levels[level].completed ? 'completed' : 'available';
    };

    const getLevelColor = (mainLevel) => {
        const colors = {
            A1: 'from-green-400 to-emerald-500',
            A2: 'from-blue-400 to-cyan-500',
            B1: 'from-yellow-400 to-orange-500',
            B2: 'from-orange-400 to-red-500',
            C1: 'from-purple-400 to-pink-500',
            C2: 'from-indigo-400 to-violet-500'
        };
        return colors[mainLevel] || 'from-slate-400 to-slate-500';
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
                    <span>Back to Topics</span>
                </button>

                <div className="flex items-center gap-3 mb-2">
                    <span className="text-5xl">{topic.icon}</span>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            {topic.title}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300">
                            {topic.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Level Groups */}
            <div className="space-y-8">
                {Object.entries(groupedLevels).map(([mainLevel, levels]) => (
                    <div key={mainLevel}>
                        {/* Main Level Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getLevelColor(mainLevel)} 
                              text-white font-bold text-lg shadow-md`}>
                                {mainLevel}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                {mainLevel === 'A1' && 'Beginner'}
                                {mainLevel === 'A2' && 'Elementary'}
                                {mainLevel === 'B1' && 'Intermediate'}
                                {mainLevel === 'B2' && 'Upper Intermediate'}
                                {mainLevel === 'C1' && 'Advanced'}
                                {mainLevel === 'C2' && 'Mastery'}
                            </div>
                        </div>

                        {/* Sub-levels */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {levels.map(level => {
                                const status = getLevelStatus(level);
                                const levelData = topicData?.levels?.[level];

                                return (
                                    <div
                                        key={level}
                                        onClick={() => status !== 'locked' && onLevelClick(level)}
                                        className={`
                      relative p-6 rounded-xl border-2 transition-all duration-300
                      ${status === 'locked'
                                                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                                                : 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-700 hover:border-purple-400 hover:scale-102 cursor-pointer shadow-sm hover:shadow-lg'
                                            }
                      ${status === 'completed' ? 'ring-2 ring-green-400' : ''}
                    `}
                                    >
                                        {/* Status Icon */}
                                        <div className="absolute top-4 right-4">
                                            {status === 'completed' && (
                                                <CheckCircle className="text-green-600" size={24} />
                                            )}
                                            {status === 'locked' && (
                                                <Lock className="text-slate-400" size={24} />
                                            )}
                                            {status === 'available' && (
                                                <Circle className="text-purple-400" size={24} />
                                            )}
                                        </div>

                                        {/* Level Info */}
                                        <div className="pr-8">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                                                {level}
                                            </h3>

                                            {levelData ? (
                                                <>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                                                        {levelData.title}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <span>{levelData.examples?.length || 0} examples</span>
                                                        <span>{levelData.exercises?.length || 0} exercises</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        Content not generated yet
                                                    </p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onGenerateLevel(level);
                                                        }}
                                                        disabled={generating}
                                                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg 
                                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center gap-2 transition-colors"
                                                    >
                                                        <Sparkles size={14} />
                                                        Generate
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress bar for available levels */}
                                        {levelData && status !== 'locked' && (
                                            <div className="mt-4 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${getLevelColor(mainLevel)} transition-all duration-500`}
                                                    style={{ width: `${levelData.score || 0}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info box */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                      rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Complete each level in order to build a solid foundation.
                    Each level builds on concepts from the previous ones.
                </p>
            </div>
        </div>
    );
};

export default GrammarLevelSelector;
