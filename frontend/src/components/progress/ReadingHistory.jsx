import React, { useState } from 'react';
import { BookOpen, Clock, Calendar, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_META } from '../../services/activityTracker';

export default function ReadingHistory({ sessions }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Filter sessions
    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.referenceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        const matchesCategory = selectedCategory === 'all' || session.category === selectedCategory;

        if (selectedMonth === 'all') return matchesSearch && matchesCategory;

        const sessionMonth = new Date(session.date).toISOString().slice(0, 7); // YYYY-MM
        return matchesSearch && matchesCategory && sessionMonth === selectedMonth;
    });

    // Group sessions by date
    const groupedSessions = {};
    filteredSessions.forEach(session => {
        if (!groupedSessions[session.date]) {
            groupedSessions[session.date] = [];
        }
        groupedSessions[session.date].push(session);
    });

    const dates = Object.keys(groupedSessions).sort().reverse();

    // Get unique months for filter
    const availableMonths = [...new Set(sessions.map(s => s.date.slice(0, 7)))].sort().reverse();

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) return 'Today';
        if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const getDayTotal = (sessions) => {
        const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        return formatDuration(totalSeconds);
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Clock className="text-indigo-600" />
                Activity History
            </h3>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border-none rounded-lg text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none cursor-pointer"
                >
                    <option value="all">All Categories</option>
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                </select>

                {/* Month Filter */}
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none cursor-pointer"
                >
                    <option value="all">All Months</option>
                    {availableMonths.map(month => {
                        const date = new Date(month + '-01');
                        const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                        return <option key={month} value={month}>{label}</option>;
                    })}
                </select>
            </div>

            {/* Session List */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {dates.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <BookOpen className="mx-auto mb-3 text-slate-300" size={48} />
                        <p className="text-slate-500">No sessions found</p>
                        {(searchQuery || selectedCategory !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                className="text-indigo-600 text-sm mt-2 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    dates.map((date, dateIndex) => {
                        const daySessions = groupedSessions[date];
                        return (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: dateIndex * 0.05 }}
                            >
                                {/* Date Header */}
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        <h4 className="font-semibold text-slate-800">{formatDate(date)}</h4>
                                    </div>
                                    <span className="text-sm font-medium text-indigo-600">
                                        {getDayTotal(daySessions)}
                                    </span>
                                </div>

                                {/* Sessions for this day */}
                                <div className="space-y-2 pl-6">
                                    {daySessions.map((session, index) => {
                                        const meta = CATEGORY_META[session.category];
                                        return (
                                            <div
                                                key={session.id || index}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="text-xl flex-shrink-0">{meta?.icon || '📝'}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-slate-700 font-medium truncate">
                                                            {session.referenceTitle || meta?.label || 'Activity'}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {meta?.label}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-600 font-medium">
                                                        {session.category === 'vocab'
                                                            ? `${session.cardsReviewed || 0} cards`
                                                            : formatDuration(session.durationSeconds)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Summary */}
            {filteredSessions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-500 text-center">
                    Showing {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} across {dates.length} day{dates.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
