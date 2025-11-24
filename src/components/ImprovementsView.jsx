import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, Filter, Bug, Lightbulb, Sparkles, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeFeedback, updateFeedbackStatus, deleteFeedback, exportFeedbackAsMarkdown } from '../services/feedbackService';

export default function ImprovementsView() {
    const { currentUser } = useAuth();
    const { theme } = useTheme();
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeFeedback(currentUser.uid, (items) => {
            setFeedbackItems(items);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleExport = () => {
        const markdown = exportFeedbackAsMarkdown(feedbackItems);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `improvements-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (feedbackId) => {
        if (!confirm('Delete this feedback item?')) return;
        try {
            await deleteFeedback(currentUser.uid, feedbackId);
        } catch (error) {
            console.error('Error deleting feedback:', error);
            alert('Failed to delete feedback');
        }
    };

    const handleToggleStatus = async (feedbackId, currentStatus) => {
        const newStatus = currentStatus === 'resolved' ? 'open' : 'resolved';
        try {
            await updateFeedbackStatus(currentUser.uid, feedbackId, newStatus);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const filteredItems = feedbackItems.filter(item => {
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (filterStatus !== 'all' && item.status !== filterStatus) return false;
        return true;
    });

    const typeIcons = {
        bug: Bug,
        suggestion: Lightbulb,
        feature: Sparkles,
        other: AlertCircle
    };

    const typeColors = {
        bug: 'red',
        suggestion: 'yellow',
        feature: 'purple',
        other: 'gray'
    };

    const stats = {
        total: feedbackItems.length,
        open: feedbackItems.filter(i => i.status === 'open').length,
        resolved: feedbackItems.filter(i => i.status === 'resolved').length,
        bugs: feedbackItems.filter(i => i.type === 'bug').length,
    };

    return (
        <div className={`max-w-5xl mx-auto ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} p-8 rounded-xl shadow-sm`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                        <AlertCircle className="text-indigo-600" />
                        Improvements
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                        Track bugs, suggestions, and feature requests
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={feedbackItems.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                    <Download size={16} />
                    Export for Agent
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total</div>
                </div>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.open}</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Open</div>
                </div>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.resolved}</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Resolved</div>
                </div>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{stats.bugs}</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Bugs</div>
                </div>
            </div>

            {/* Filters */}
            <div className={`flex gap-4 mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                    <Filter size={16} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Filter:</span>
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`px-3 py-1 rounded-lg border text-sm ${theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                >
                    <option value="all">All Types</option>
                    <option value="bug">Bugs</option>
                    <option value="suggestion">Suggestions</option>
                    <option value="feature">Features</option>
                    <option value="other">Other</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`px-3 py-1 rounded-lg border text-sm ${theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            {/* Feedback List */}
            <div className="space-y-3">
                {filteredItems.length === 0 ? (
                    <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No feedback items yet</p>
                        <p className="text-sm">Submit feedback from the chat view to get started</p>
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const TypeIcon = typeIcons[item.type] || AlertCircle;
                        const color = typeColors[item.type] || 'gray';
                        const timestamp = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'N/A';

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-lg border-2 transition ${item.status === 'resolved'
                                        ? theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                                        : theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-grow">
                                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                            <TypeIcon size={20} className={`text-${color}-600`} />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                                    {item.type}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'resolved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {item.description}
                                            </p>
                                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                <span className="font-medium">{item.context}</span> • {timestamp}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleStatus(item.id, item.status)}
                                            className={`p-2 rounded-lg transition ${theme === 'dark'
                                                    ? 'hover:bg-slate-700 text-slate-400'
                                                    : 'hover:bg-slate-100 text-slate-500'
                                                }`}
                                            title={item.status === 'resolved' ? 'Mark as open' : 'Mark as resolved'}
                                        >
                                            <CheckCircle size={18} className={item.status === 'resolved' ? 'text-green-600' : ''} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className={`p-2 rounded-lg transition ${theme === 'dark'
                                                    ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400'
                                                    : 'hover:bg-slate-100 text-slate-500 hover:text-red-500'
                                                }`}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
