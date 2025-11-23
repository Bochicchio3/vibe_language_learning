import React from 'react';
import { BarChart2, BookOpen, Clock, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReadingStats({ stats, sessions }) {
    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const statCards = [
        {
            icon: Clock,
            label: 'Total Reading Time',
            value: formatTime(stats.totalMinutes),
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        },
        {
            icon: BookOpen,
            label: 'Sessions Completed',
            value: stats.totalSessions,
            color: 'from-indigo-500 to-purple-500',
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600'
        },
        {
            icon: Target,
            label: 'Avg Session Length',
            value: `${stats.averageSessionMinutes}m`,
            color: 'from-emerald-500 to-teal-500',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        },
        {
            icon: TrendingUp,
            label: 'Longest Session',
            value: `${stats.longestSessionMinutes}m`,
            color: 'from-amber-500 to-orange-500',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600'
        }
    ];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <BarChart2 className="text-indigo-600" />
                Reading Statistics
            </h3>

            <div className="grid grid-cols-2 gap-4">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`${stat.bgColor} rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow`}
                    >
                        <div className={`${stat.textColor} mb-2`}>
                            <stat.icon size={20} />
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">
                            {stat.value}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            {stat.label}
                        </div>
                    </motion.div>
                ))}
            </div>

            {stats.totalTexts > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Texts Read</span>
                        <span className="text-lg font-bold text-indigo-600">{stats.totalTexts}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
