import React from 'react';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibraryFilters({
    searchQuery,
    setSearchQuery,
    selectedLevels,
    toggleLevel,
    selectedStatuses,
    toggleStatus,
    sortBy,
    setSortBy
}) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const statuses = ['Unread', 'In Progress', 'Completed'];

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 space-y-6">
            {/* Top Row: Search & Sort */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search titles or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 min-w-[200px]">
                    <div className="relative w-full">
                        <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition outline-none font-medium appearance-none cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="easiest">Easiest First</option>
                            <option value="hardest">Hardest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Filters */}
            <div className="flex flex-col lg:flex-row gap-6 pt-2 border-t border-slate-50">
                {/* Level Filter */}
                <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Filter size={12} /> Level
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => toggleLevel('All')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedLevels.length === 0
                                    ? 'bg-slate-800 text-white shadow-md scale-105'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            All
                        </button>
                        {levels.map(level => {
                            const isSelected = selectedLevels.includes(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => toggleLevel(level)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Filter */}
                <div className="flex-1 lg:border-l lg:pl-6 border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Filter size={12} /> Status
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => toggleStatus('All')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedStatuses.length === 0
                                    ? 'bg-slate-800 text-white shadow-md scale-105'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            All
                        </button>
                        {statuses.map(status => {
                            const isSelected = selectedStatuses.includes(status);
                            return (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSelected
                                            ? 'bg-emerald-600 text-white shadow-md scale-105'
                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {status}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
