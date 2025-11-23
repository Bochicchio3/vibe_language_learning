import React, { useMemo } from 'react';
import { BarChart2, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
            {/* Reading Time Trend */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <TrendingUp className="text-indigo-600" size={20} />
                    Reading Time Trend (Last 30 Days)
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

            {/* Day of Week Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <BarChart2 className="text-indigo-600" size={20} />
                    Reading by Day of Week
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
        </div>
    );
}
