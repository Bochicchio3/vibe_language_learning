import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Target, Calendar, Clock, Award, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    getAllReadingSessions,
    getReadingGoals,
    calculateStatistics,
    calculateStreak,
    getTodayProgress,
    getWeekProgress,
    CATEGORY_META
} from '../services/readingTracker';
import ReadingGoals from './progress/ReadingGoals';
import ReadingStats from './progress/ReadingStats';
import StreakTracker from './progress/StreakTracker';
import ReadingHeatmap from './progress/ReadingHeatmap';
import ReadingHistory from './progress/ReadingHistory';
import ProgressCharts from './progress/ProgressCharts';
import { motion } from 'framer-motion';

export default function ProgressView() {
    const { currentUser } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [goals, setGoals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'history', 'goals'

    useEffect(() => {
        if (!currentUser) return;

        loadData();
    }, [currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sessionsData, goalsData] = await Promise.all([
                getAllReadingSessions(currentUser.uid, 365), // Last year
                getReadingGoals(currentUser.uid)
            ]);
            setSessions(sessionsData);
            setGoals(goalsData);
        } catch (error) {
            console.error('Error loading progress data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <TrendingUp className="mx-auto mb-4 text-indigo-400 dark:text-indigo-500 animate-pulse" size={48} />
                    <p className="text-slate-500 dark:text-slate-400">Loading your progress...</p>
                </div>
            </div>
        );
    }

    const stats = calculateStatistics(sessions);
    const streakConfig = goals?.streakMinimum || { totalMinutes: 15, categories: 2 };
    const streak = calculateStreak(sessions, streakConfig);
    const todayProgress = getTodayProgress(sessions);
    const weekProgress = getWeekProgress(sessions);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <TrendingUp className="text-indigo-600 dark:text-indigo-400" />
                    Your Learning Progress
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Track all your language learning activities and build consistent habits</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'history'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    History
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === 'goals'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Goals
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Hero Stats - Multi-Category */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(CATEGORY_META).map(([category, meta], index) => {
                            const categoryProgress = todayProgress.byCategory[category];
                            if (!categoryProgress || (categoryProgress.minutes === 0 && categoryProgress.sessions === 0)) {
                                return null; // Hide categories with no activity
                            }

                            const colorMap = {
                                indigo: 'from-indigo-500 to-purple-600',
                                blue: 'from-blue-500 to-cyan-600',
                                purple: 'from-purple-500 to-pink-600',
                                emerald: 'from-emerald-500 to-teal-600',
                                amber: 'from-amber-500 to-orange-600',
                                pink: 'from-pink-500 to-rose-600'
                            };

                            return (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`bg-gradient-to-br ${colorMap[meta.color] || 'from-slate-500 to-slate-600'} rounded-2xl p-5 text-white shadow-lg`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">{meta.icon}</span>
                                        <span className="text-xs font-medium opacity-80">{meta.label}</span>
                                    </div>
                                    <div className="text-3xl font-bold mb-1">
                                        {category === 'vocab' ? categoryProgress.sessions : `${categoryProgress.minutes}m`}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        {category === 'vocab' ? 'cards today' : 'today'}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Overall Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Today */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Clock size={24} className="opacity-80" />
                                <span className="text-sm font-medium opacity-80">Total Today</span>
                            </div>
                            <div className="text-4xl font-bold mb-1">{todayProgress.totalMinutes}</div>
                            <div className="text-sm opacity-90">minutes across all activities</div>
                            <div className="mt-4 text-xs opacity-75">{todayProgress.totalSessions} total sessions</div>
                        </motion.div>

                        {/* Current Streak */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Flame size={24} className="opacity-80" />
                                <span className="text-sm font-medium opacity-80">Streak</span>
                            </div>
                            <div className="text-4xl font-bold mb-1">{streak.currentStreak}</div>
                            <div className="text-sm opacity-90">day{streak.currentStreak !== 1 ? 's' : ''} in a row</div>
                            <div className="mt-4 text-xs opacity-75">Best: {streak.longestStreak} days</div>
                        </motion.div>

                        {/* Weekly Progress */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-6 text-white shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Calendar size={24} className="opacity-80" />
                                <span className="text-sm font-medium opacity-80">This Week</span>
                            </div>
                            <div className="text-4xl font-bold mb-1">{weekProgress.totalMinutes}</div>
                            <div className="text-sm opacity-90">minutes total</div>
                            <div className="mt-4 text-xs opacity-75">{weekProgress.totalSessions} sessions</div>
                        </motion.div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-8">
                            <StreakTracker streak={streak} sessions={sessions} goals={goals} />
                            <ReadingStats stats={stats} sessions={sessions} />
                        </div>

                        {/* Right Column */}
                        <div className="space-y-8">
                            <ReadingHeatmap sessions={sessions} />
                            <ProgressCharts sessions={sessions} />
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <ReadingHistory sessions={sessions} />
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
                <ReadingGoals
                    goals={goals}
                    todayProgress={todayProgress}
                    weekProgress={weekProgress}
                    onUpdate={loadData}
                />
            )}
        </div>
    );
}
