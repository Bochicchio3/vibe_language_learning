import React from 'react';
import { Calendar } from 'lucide-react';
import { prepareHeatmapData } from '../../services/readingTracker';

export default function ReadingHeatmap({ sessions }) {
    const heatmapData = prepareHeatmapData(sessions, 6);

    const getIntensityColor = (minutes) => {
        if (minutes === 0) return 'bg-slate-100';
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
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Calendar className="text-indigo-600" />
                Reading Activity
            </h3>

            {/* Heatmap */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    <div className="flex gap-1">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {week.map((day, dayIndex) => {
                                    const date = new Date(day.date);
                                    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-3 h-3 rounded-sm ${getIntensityColor(day.minutes)} cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all group relative`}
                                            title={`${dayLabel}: ${day.minutes} min`}
                                        >
                                            {/* Tooltip */}
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 pointer-events-none">
                                                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                                    <div className="font-medium">{dayLabel}</div>
                                                    <div className="text-slate-300">{day.minutes} minutes</div>
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
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">Last 6 months</div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-slate-100 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                        <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
                    </div>
                    <span className="text-xs text-slate-500">More</span>
                </div>
            </div>
        </div>
    );
}
