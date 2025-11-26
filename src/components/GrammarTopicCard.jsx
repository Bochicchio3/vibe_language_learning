import React from 'react';
import { Sparkles, Lock, CheckCircle } from 'lucide-react';

const GrammarTopicCard = ({ topic, progress, hasContent, onClick, onGenerate, generating }) => {
    const progressPercent = Math.round(progress);

    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 
                 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 cursor-pointer
                 border-2 border-purple-200/50 hover:border-purple-400 dark:border-purple-700/50
                 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
        >
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-indigo-100/30 
                      dark:to-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Content */}
            <div className="relative z-10">
                {/* Icon */}
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {topic.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    {topic.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {topic.description}
                </p>

                {/* Progress Bar */}
                <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div
                        className="absolute h-full bg-gradient-to-r from-purple-500 to-indigo-500 
                       transition-all duration-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                        {progressPercent}% complete
                    </span>

                    {hasContent ? (
                        <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} />
                            <span className="font-medium">Started</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                            <Lock size={14} />
                            <span>Not started</span>
                        </div>
                    )}
                </div>

                {/* Category Badge */}
                <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-white/80 dark:bg-slate-800/80 rounded-full 
                         text-xs font-medium text-slate-600 dark:text-slate-300 
                         backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                        {topic.category}
                    </span>
                </div>

                {/* Hover overlay with action button */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/90 to-purple-600/90 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        flex items-center justify-center rounded-2xl">
                    <div className="text-center text-white">
                        <Sparkles className="mx-auto mb-2" size={32} />
                        <p className="font-bold text-lg">Start Learning</p>
                        {!hasContent && (
                            <p className="text-sm mt-1 opacity-90">Generate content first</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrammarTopicCard;
