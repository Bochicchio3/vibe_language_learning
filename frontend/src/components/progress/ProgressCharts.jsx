import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, PieChart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CATEGORY_META } from '../../services/activityTracker';

export default function ProgressCharts({ sessions }) {
    // Prepare data for reading time trend (last 30 days)
    const trendData = useMemo(() => {
        const dailyData = {};
        const today = new Date();

        // Initialize last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = { date: dateStr, minutes: 0, label: '' };
        }

        // Fill in actual reading data
        sessions.forEach(session => {
            if (dailyData[session.date]) {
                dailyData[session.date].minutes += Math.round((session.durationSeconds || 0) / 60);
            }
        });

        // Format labels
        return Object.values(dailyData).map(day => {
            const date = new Date(day.date);
            day.label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return day;
        });
    }, [sessions]);

    // Prepare data for day of week distribution
    const dayOfWeekData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const distribution = days.map(day => ({ day, minutes: 0 }));

        sessions.forEach(session => {
            const date = new Date(session.date);
            const dayIndex = date.getDay();
            distribution[dayIndex].minutes += Math.round((session.durationSeconds || 0) / 60);
        });

        return distribution;
    }, [sessions]);

    // Prepare data for category distribution (pie chart-ish data)
    const categoryData = useMemo(() => {
        const catMinutes = {};

        sessions.forEach(session => {
            const category = session.category || 'unknown';
            catMinutes[category] = (catMinutes[category] || 0) + Math.round((session.durationSeconds || 0) / 60);
        });

        return Object.entries(catMinutes)
            .filter(([_, minutes]) => minutes > 0)
            .map(([category, minutes]) => ({
                category,
                minutes,
                label: CATEGORY_META[category]?.label || category,
                icon: CATEGORY_META[category]?.icon || '📝',
                color: CATEGORY_META[category]?.color || 'slate'
            }))
            .sort((a, b) => b.minutes - a.minutes);
    }, [sessions]);

    const colorMap = {
        indigo: '#6366f1',
        blue: '#3b82f6',
        purple: '#a855f7',
        emerald: '#10b981',
        amber: '#f59e0b',
        pink: '#ec4899',
        slate: '#64748b'
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 text-white text-xs rounded px-3 py-2 shadow-lg">
                    <p className="font-medium">{payload[0].payload.label || payload[0].payload.day}</p>
                    <p className="text-indigo-300">{payload[0].value} minutes</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Activity Time Trend */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <TrendingUp className="text-indigo-600" size={20} />
                    Activity Trend (Last 30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            interval="preserveStartEnd"
                            tickMargin={8}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickMargin={8}
                            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="minutes"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ fill: '#6366f1', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Day of Week Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <BarChart2 className="text-indigo-600" size={20} />
                        By Day of Week
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dayOfWeekData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickMargin={8}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickMargin={8}
                                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="minutes"
                                fill="#6366f1"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <PieChart className="text-indigo-600" size={20} />
                        By Category
                    </h3>
                    {categoryData.length > 0 ? (
                        <div className="space-y-3">
                            {categoryData.map((cat, index) => {
                                const total = categoryData.reduce((sum, c) => sum + c.minutes, 0);
                                const percentage = Math.round((cat.minutes / total) * 100);

                                return (
                                    <div key={cat.category} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{cat.icon}</span>
                                                <span className="font-medium text-slate-700">{cat.label}</span>
                                            </div>
                                            <span className="font-bold text-slate-800">{cat.minutes}m ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: colorMap[cat.color]
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <PieChart className="mx-auto mb-2" size={32} />
                            <p className="text-sm">No data yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
