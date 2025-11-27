import React, { useState } from 'react';
import { X, Bug, Lightbulb, Sparkles, AlertCircle, Send } from 'lucide-react';
import { submitFeedback } from '../../services/feedbackService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function FeedbackModal({ isOpen, onClose, context = 'Unknown' }) {
    const { currentUser } = useAuth();
    const { theme } = useTheme();
    const [type, setType] = useState('bug');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const feedbackTypes = [
        { id: 'bug', label: 'Bug', icon: Bug, color: 'red' },
        { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'yellow' },
        { id: 'feature', label: 'Feature Request', icon: Sparkles, color: 'purple' },
        { id: 'other', label: 'Other', icon: AlertCircle, color: 'gray' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser || !description.trim()) return;

        setIsSubmitting(true);
        try {
            await submitFeedback(currentUser.uid, type, description, context);
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl max-w-lg w-full`}>
                {/* Header */}
                <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        Report an Issue
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type Selection */}
                    <div>
                        <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {feedbackTypes.map(({ id, label, icon: Icon, color }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setType(id)}
                                    className={`p-3 rounded-lg border-2 flex items-center gap-2 transition ${type === id
                                        ? `border-${color}-500 ${theme === 'dark' ? 'bg-slate-700' : `bg-${color}-50`}`
                                        : `${theme === 'dark' ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'}`
                                        }`}
                                >
                                    <Icon size={18} className={type === id ? `text-${color}-600` : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                                    <span className={`font-medium ${type === id ? (theme === 'dark' ? 'text-white' : `text-${color}-700`) : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>
                                        {label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Context Display */}
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="font-medium">Context:</span> {context}
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Description
                        </label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="5"
                            placeholder="Please describe the issue or suggestion in detail..."
                            className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-indigo-500 outline-none transition ${theme === 'dark'
                                ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500'
                                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                                }`}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg font-medium transition ${theme === 'dark'
                                ? 'text-slate-300 hover:bg-slate-700'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !description.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>Submitting...</>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Submit
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
