import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { prepareHeatmapData, CATEGORY_META } from '../../services/activityTracker';

export default function ReadingHeatmap({ sessions }) {
    const [selectedCategory, setSelectedCategory] = useState(null);

    const heatmapData = prepareHeatmapData(sessions, 6, selectedCategory);

    const getIntensityColor = (minutes, categoryCounts) => {
        if (minutes === 0) return 'bg-slate-100';

        // If filtering by category, use that category's color
        if (selectedCategory) {
            const meta = CATEGORY_META[selectedCategory];
            const colorMap = {
                indigo: ['bg-indigo-100', 'bg-indigo-300', 'bg-indigo-500', 'bg-indigo-700'],
                blue: ['bg-blue-100', 'bg-blue-300', 'bg-blue-500', 'bg-blue-700'],
                purple: ['bg-purple-100', 'bg-purple-300', 'bg-purple-500', 'bg-purple-700'],
                emerald: ['bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-700'],
                amber: ['bg-amber-100', 'bg-amber-300', 'bg-amber-500', 'bg-amber-700'],
                pink: ['bg-pink-100', 'bg-pink-300', 'bg-pink-500', 'bg-pink-700']
            };
            const colors = colorMap[meta?.color] || colorMap.emerald;
            if (minutes < 15) return colors[0];
            if (minutes < 30) return colors[1];
            if (minutes < 60) return colors[2];
            return colors[3];
        }

        // Default green for all activities
        if (minutes < 15) return 'bg-emerald-200';
        if (minutes < 30) return 'bg-emerald-400';
        if (minutes < 60) return 'bg-emerald-600';
        return 'bg-emerald-700';
    };

    // Group by week for better layout
    const groupByWeek = (data) => {
        const weeks = [];
        let currentWeek = [];

        data.forEach((day, index) => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();

            // Start new week on Sunday
            if (index > 0 && dayOfWeek === 0 && currentWeek.length > 0) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }

            currentWeek.push(day);
        });

        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return weeks;
    };

    const weeks = groupByWeek(heatmapData);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="text-indigo-600 dark:text-indigo-400" />
                    Activity Heatmap
                </h3>

                {/* Category Filter */}
                <select
                    value={selectedCategory || 'all'}
                    onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : e.target.value)}
                    className="px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none cursor-pointer"
                >
                    <option value="all">All Activities</option>
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                </select>
            </div>

            {/* Heatmap */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    <div className="flex gap-1">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {week.map((day, dayIndex) => {
                                    const date = new Date(day.date);
                                    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                    // Build tooltip content
                                    const categoryInfo = selectedCategory
                                        ? `${day.minutes} min`
                                        : Object.entries(day.categoryCounts || {})
                                            .map(([cat, count]) => `${CATEGORY_META[cat]?.icon} ${count}`)
                                            .join(' | ');

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-3 h-3 rounded-sm ${getIntensityColor(day.minutes, day.categoryCounts)} cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all group relative`}
                                            title={`${dayLabel}: ${day.minutes} min`}
                                        >
                                            {/* Tooltip */}
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 pointer-events-none">
                                                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                                    <div className="font-medium">{dayLabel}</div>
                                                    <div className="text-slate-300">{day.minutes} minutes</div>
                                                    {!selectedCategory && categoryInfo && (
                                                        <div className="text-slate-400 text-[10px] mt-0.5">{categoryInfo}</div>
                                                    )}
                                                </div>
                                                <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">Last 6 months</div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-slate-100 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">More</span>
                </div>
            </div>
        </div>
    );
}
