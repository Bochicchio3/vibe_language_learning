import React from 'react';
import { JOURNEY_NODES } from '../data/journeyData';
import { CheckCircle, Lock, Star, BookOpen, MessageCircle, GraduationCap } from 'lucide-react';

const NodeIcon = ({ type, locked }) => {
    if (locked) return <Lock size={20} className="text-slate-400" />;

    switch (type) {
        case 'story': return <BookOpen size={20} className="text-white" />;
        case 'vocab': return <Star size={20} className="text-white" />;
        case 'checkpoint': return <Trophy size={20} className="text-white" />;
        default: return <GraduationCap size={20} className="text-white" />;
    }
};

// Helper to check if a node is unlocked based on completed nodes
const isNodeUnlocked = (node, completedNodeIds) => {
    if (node.unlockCriteria.length === 0) return true;
    return node.unlockCriteria.every(criteriaId => completedNodeIds.includes(criteriaId));
};

export default function JourneyView({ completedNodes = [], onNodeClick }) {
    // Mock completed nodes if none provided (for prototype)
    const safeCompletedNodes = completedNodes.length > 0 ? completedNodes : ['start'];

    return (
        <div className="relative w-full max-w-md mx-auto min-h-[80vh] p-8 pb-24">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 -translate-x-1/2 z-0" />

            <div className="relative z-10 flex flex-col gap-12 items-center">
                {JOURNEY_NODES.map((node, index) => {
                    const unlocked = isNodeUnlocked(node, safeCompletedNodes);
                    const completed = safeCompletedNodes.includes(node.id);

                    // Simple layout logic: alternate left/right for branching, center for main
                    // For this prototype, we'll just stack them but use the position data if we were doing a canvas
                    // Let's stick to a vertical list for simplicity and robustness first

                    return (
                        <div
                            key={node.id}
                            className={`group relative flex flex-col items-center transition-all duration-300 ${unlocked ? 'opacity-100 cursor-pointer' : 'opacity-60 grayscale'}`}
                            onClick={() => unlocked && onNodeClick(node)}
                        >
                            {/* Node Circle */}
                            <div
                                className={`
                  w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 transition-transform hover:scale-110
                  ${completed ? 'bg-green-500 border-green-200' : unlocked ? 'bg-indigo-600 border-indigo-200' : 'bg-slate-300 border-slate-100'}
                `}
                            >
                                {completed ? <CheckCircle size={32} className="text-white" /> : <NodeIcon type={node.type} locked={!unlocked} />}
                            </div>

                            {/* Label */}
                            <div className="absolute top-24 w-40 text-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{node.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{node.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                More levels coming soon!
            </div>
        </div>
    );
}

import { Trophy } from 'lucide-react';
