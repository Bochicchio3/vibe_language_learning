import React from 'react';
import { BarChart2, BookOpen, Clock, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORY_META } from '../../services/activityTracker';

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
            label: 'Total Time',
            value: formatTime(stats.totalMinutes),
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
        },
        {
            icon: BookOpen,
            label: 'Total Sessions',
            value: stats.totalSessions,
            color: 'from-indigo-500 to-purple-500',
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600'
        },
        {
            icon: Target,
            label: 'Avg Session',
            value: `${stats.averageSessionMinutes}m`,
            color: 'from-emerald-500 to-teal-500',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <BarChart2 className="text-indigo-600" />
                Activity Statistics
            </h3>

            {/* Overall Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
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

            {/* Category Breakdown */}
            <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">By Category</h4>
                <div className="space-y-3">
                    {Object.entries(stats.byCategory || {}).map(([category, catStats]) => {
                        if (catStats.sessions === 0) return null;

                        const meta = CATEGORY_META[category];
                        if (!meta) return null;

                        return (
                            <div key={category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{meta.icon}</span>
                                    <div>
                                        <div className="font-medium text-slate-800">{meta.label}</div>
                                        <div className="text-xs text-slate-500">
                                            {catStats.sessions} session{catStats.sessions !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-800">
                                        {formatTime(catStats.minutes)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
