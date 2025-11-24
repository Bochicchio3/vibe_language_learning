import React from 'react';
import { Flame, Trophy, Star } from 'lucide-react';

export const StreakCounter = ({ streak }) => {
    return (
        <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-600 rounded-full font-bold text-sm" title="Current Streak">
            <Flame size={16} className={streak > 0 ? "fill-orange-500 animate-pulse" : "text-slate-400"} />
            <span>{streak}</span>
        </div>
    );
};

export const XPBar = ({ xp, level, nextLevelXp }) => {
    const progress = Math.min(100, (xp / nextLevelXp) * 100);

    return (
        <div className="flex flex-col w-32 md:w-48">
            <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                <span>Lvl {level}</span>
                <span>{xp}/{nextLevelXp} XP</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export const LevelBadge = ({ level }) => {
    return (
        <div className="relative flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-sm shadow-md border-2 border-indigo-200">
            {level}
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                <Star size={8} className="text-yellow-900 fill-yellow-900" />
            </div>
        </div>
    );
};
