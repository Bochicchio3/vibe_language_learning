import React, { useState } from 'react';
import { Target, TrendingUp, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { updateReadingGoals } from '../../services/readingTracker';

export default function ReadingGoals({ goals, todayProgress, weekProgress, onUpdate }) {
    const { currentUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(goals || {});

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateReadingGoals(currentUser.uid, formData);
            setEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error saving goals:', error);
            alert('Failed to save goals');
        } finally {
            setSaving(false);
        }
    };

    const getDailyProgressPercent = () => {
        if (!goals?.dailyMinutes) return 0;
        return Math.min((todayProgress.minutes / goals.dailyMinutes) * 100, 100);
    };

    const getWeeklyProgressPercent = () => {
        if (!goals?.weeklyMinutes) return 0;
        return Math.min((weekProgress.minutes / goals.weeklyMinutes) * 100, 100);
    };

    const getProgressColor = (percent) => {
        if (percent >= 100) return 'text-emerald-600 bg-emerald-500';
        if (percent >= 80) return 'text-emerald-600 bg-emerald-500';
        if (percent >= 50) return 'text-yellow-600 bg-yellow-500';
        return 'text-slate-600 bg-slate-400';
    };

    const getMotivationalMessage = (percent) => {
        if (percent >= 100) return "🎉 Goal achieved! You're crushing it!";
        if (percent >= 80) return "💪 Almost there! Keep going!";
        if (percent >= 50) return "🌟 Halfway there! Great progress!";
        if (percent > 0) return "🚀 Great start! Keep it up!";
        return "📖 Start reading to make progress!";
    };

    const dailyPercent = getDailyProgressPercent();
    const weeklyPercent = getWeeklyProgressPercent();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Target className="text-indigo-600" />
                    Reading Goals
                </h3>
                {!editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Edit Goals
                    </button>
                )}
            </div>

            {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Daily Goal (minutes)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.dailyMinutes || 30}
                            onChange={(e) => setFormData({ ...formData, dailyMinutes: parseInt(e.target.value) })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Weekly Goal (minutes)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.weeklyMinutes || 210}
                            onChange={(e) => setFormData({ ...formData, weeklyMinutes: parseInt(e.target.value) })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Minimum minutes for streak (per day)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.streakMinimum || 5}
                            onChange={(e) => setFormData({ ...formData, streakMinimum: parseInt(e.target.value) })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEditing(false);
                                setFormData(goals);
                            }}
                            className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-6">
                    {/* Daily Goal */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Daily Goal</span>
                            <span className="text-sm font-bold text-slate-900">
                                {todayProgress.minutes} / {goals?.dailyMinutes || 30} min
                            </span>
                        </div>
                        <div className="relative">
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dailyPercent}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className={`h-full rounded-full transition-colors ${getProgressColor(dailyPercent).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{getMotivationalMessage(dailyPercent)}</p>
                    </div>

                    {/* Weekly Goal */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Weekly Goal</span>
                            <span className="text-sm font-bold text-slate-900">
                                {weekProgress.minutes} / {goals?.weeklyMinutes || 210} min
                            </span>
                        </div>
                        <div className="relative">
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${weeklyPercent}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                    className={`h-full rounded-full transition-colors ${getProgressColor(weeklyPercent).split(' ')[1]}`}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{getMotivationalMessage(weeklyPercent)}</p>
                    </div>

                    {/* Info */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mt-6">
                        <p className="text-xs text-indigo-800 leading-relaxed">
                            💡 <strong>Tip:</strong> Consistency is key! Reading {goals?.dailyMinutes || 30} minutes daily helps build habits and accelerate learning.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
