import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Shield, Cpu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { fetchModels } from '../services/ollama';

export default function SettingsModal({ isOpen, onClose, isAdmin, setIsAdmin, selectedModel, setSelectedModel }) {
    const { theme, toggleTheme } = useTheme();
    const [models, setModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingModels(true);
            fetchModels()
                .then(fetchedModels => {
                    setModels(fetchedModels);
                    // If current selected model is not in list (and list is not empty), select first one
                    if (fetchedModels.length > 0 && !fetchedModels.find(m => m.name === selectedModel)) {
                        setSelectedModel(fetchedModels[0].name);
                    }
                })
                .catch(err => console.error("Failed to fetch models:", err))
                .finally(() => setLoadingModels(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                    >
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Settings Content */}
                <div className="p-6 space-y-6">
                    {/* Model Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Cpu className="text-indigo-600 dark:text-indigo-400" size={24} />
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">AI Model</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Select the Ollama model to use
                                </p>
                            </div>
                        </div>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={loadingModels}
                            className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        >
                            {loadingModels ? (
                                <option>Loading models...</option>
                            ) : models.length > 0 ? (
                                models.map(model => (
                                    <option key={model.name} value={model.name}>
                                        {model.name} ({Math.round(model.size / 1024 / 1024 / 1024)}GB)
                                    </option>
                                ))
                            ) : (
                                <option value="qwq:latest">qwq:latest (Default)</option>
                            )}
                        </select>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {theme === 'dark' ? (
                                <Moon className="text-indigo-600 dark:text-indigo-400" size={24} />
                            ) : (
                                <Sun className="text-amber-500" size={24} />
                            )}
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">Dark Mode</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {theme === 'dark' ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${theme === 'dark'
                                ? 'bg-indigo-600'
                                : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Admin Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield
                                className={isAdmin ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}
                                size={24}
                            />
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">Admin Mode</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {isAdmin ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdmin(!isAdmin)}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isAdmin
                                ? 'bg-red-600'
                                : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        v1.1 - Linguist Language Learning App
                    </p>
                </div>
            </div>
        </div>
    );
}
