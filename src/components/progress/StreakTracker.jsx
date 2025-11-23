import React from 'react';
import { Flame, Award, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreakTracker({ streak, sessions, goals }) {
    const getStreakEmoji = (days) => {
        if (days === 0) return '💤';
        if (days < 3) return '🔥';
        if (days < 7) return '🔥🔥';
        if (days < 14) return '🔥🔥🔥';
        if (days < 30) return '🔥🔥🔥🔥';
        return '🔥🔥🔥🔥🔥';
    };

    const getStreakMessage = (days) => {
        if (days === 0) return "Start reading today to begin your streak!";
        if (days === 1) return "Great start! Keep it going tomorrow!";
        if (days < 3) return "You're building momentum!";
        if (days < 7) return "Amazing! You're on a roll!";
        if (days < 14) return "Incredible dedication!";
        if (days < 30) return "You're unstoppable!";
        return "Legendary! You're a reading machine!";
    };

    // Get last 30 days of reading activity
    const getLast30Days = () => {
        const days = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Check if there were sessions on this day
            const daySessions = sessions.filter(s => s.date === dateStr);
            const totalMinutes = daySessions.reduce((sum, s) => sum + (s.durationSeconds || 0) / 60, 0);
            const hasReading = totalMinutes >= (goals?.streakMinimum || 5);

            days.push({
                date: dateStr,
                hasReading,
                minutes: Math.round(totalMinutes)
            });
        }

        return days;
    };

    const last30Days = getLast30Days();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Flame className="text-orange-500" />
                Reading Streak
            </h3>

            {/* Main Streak Display */}
            <div className="text-center mb-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    className="text-7xl mb-2"
                >
                    {getStreakEmoji(streak.currentStreak)}
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-2"
                >
                    {streak.currentStreak}
                </motion.div>
                <div className="text-slate-600 font-medium">
                    day{streak.currentStreak !== 1 ? 's' : ''} in a row
                </div>
                <p className="text-sm text-slate-500 mt-2">{getStreakMessage(streak.currentStreak)}</p>
            </div>

            {/* Personal Best */}
            {streak.longestStreak > streak.currentStreak && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="text-amber-600" size={20} />
                        <span className="text-sm font-medium text-amber-800">Personal Best</span>
                    </div>
                    <span className="text-lg font-bold text-amber-600">{streak.longestStreak} days</span>
                </div>
            )}

            {/* Mini Calendar (Last 30 Days) */}
            <div>
                <div className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Last 30 Days
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                    {last30Days.map((day, index) => (
                        <div
                            key={index}
                            className={`aspect-square rounded-sm transition-all cursor-pointer group relative ${day.hasReading
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200'
                                }`}
                            title={`${day.date}: ${day.hasReading ? `${day.minutes} min` : 'No reading'}`}
                        >
                            {/* Tooltip on hover */}
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10">
                                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                    {day.hasReading ? `${day.minutes}m` : 'No reading'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>30 days ago</span>
                    <span>Today</span>
                </div>
            </div>

            {/* Streak Info */}
            {goals && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    💡 Read at least {goals.streakMinimum} minutes daily to maintain your streak
                </div>
            )}
        </div>
    );
}
