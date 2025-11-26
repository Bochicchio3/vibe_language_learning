import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useVocab } from '../hooks/useVocab';
import { isDue } from '../services/srs';
import SettingsModal from './SettingsModal';
import ChatWidget from './ChatWidget';
import {
    BookOpen, Book, Brain, TrendingUp, Sparkles, MessageCircle, Mic, PenTool, Highlighter, AlertCircle,
    MoreVertical, LogOut, Loader2, CheckCircle, Languages
} from 'lucide-react';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { savedVocab } = useVocab();

    const [showSettings, setShowSettings] = useState(false);
    const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); // Should probably be in AuthContext or fetched
    const [selectedModel, setSelectedModel] = useState('qwq:latest'); // Global model state, maybe move to context later

    const dueCount = Object.values(savedVocab).filter(word => isDue(word.srs)).length;
    const isSyncing = false; // TODO: Implement global sync state

    const isActive = (path) => {
        if (path === '/library' && location.pathname === '/') return true;
        return location.pathname.startsWith(path);
    };

    const navButtonClass = (path) => `flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition p-1 rounded-lg ${isActive(path) ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
            {/* Navigation Sidebar */}
            <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 z-50 md:top-0 md:left-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 md:p-3 flex justify-around md:justify-start md:pt-8 md:gap-8 shadow-lg md:shadow-none transition-colors duration-200">
                <div className="hidden md:flex justify-center mb-4">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl hover:bg-indigo-700 transition cursor-pointer"
                        title="Settings"
                    >
                        L
                    </button>
                </div>

                {/* Core Items */}
                <button onClick={() => navigate('/library')} className={navButtonClass('/library')}>
                    <BookOpen className="mx-auto" size={24} /> Library
                </button>

                <button onClick={() => navigate('/books')} className={navButtonClass('/books')}>
                    <Book className="mx-auto" size={24} /> Books
                </button>

                <button onClick={() => navigate('/flashcards')} className={`flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition relative p-1 rounded-lg ${isActive('/flashcards') ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Brain size={20} className={`mx-auto ${isActive('/flashcards') ? 'fill-current' : ''}`} />
                    Flashcards
                    {dueCount > 0 && (
                        <span className="absolute top-0 right-1 md:right-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {dueCount}
                        </span>
                    )}
                </button>

                <button onClick={() => navigate('/progress')} className={navButtonClass('/progress')}>
                    <TrendingUp className="mx-auto" size={24} /> Progress
                </button>

                {/* Desktop Only Items */}
                <div className="hidden md:contents">
                    <button onClick={() => navigate('/generator')} className={navButtonClass('/generator')}>
                        <Sparkles className="mx-auto" size={24} /> Generator
                    </button>
                    <button onClick={() => navigate('/chat')} className={navButtonClass('/chat')}>
                        <MessageCircle className="mx-auto" size={24} /> Chat
                    </button>
                    <button onClick={() => navigate('/speaking')} className={navButtonClass('/speaking')}>
                        <Mic className="mx-auto" size={24} /> Speaking
                    </button>
                    <button onClick={() => navigate('/writing')} className={navButtonClass('/writing')}>
                        <PenTool className="mx-auto" size={24} /> Writing
                    </button>
                    <button onClick={() => navigate('/vocab')} className={navButtonClass('/vocab')}>
                        <Highlighter className="mx-auto" size={24} /> Vocab
                    </button>
                    <button onClick={() => navigate('/grammar')} className={navButtonClass('/grammar')}>
                        <Brain className="mx-auto" size={24} /> Grammar
                    </button>
                    <button onClick={() => navigate('/improvements')} className={navButtonClass('/improvements')}>
                        <AlertCircle className="mx-auto" size={24} /> Improvements
                    </button>
                </div>

                {/* Mobile "More" Menu - Simplified for now */}
                <div className="md:hidden relative group">
                    <button
                        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition p-1 rounded-lg text-slate-400 hover:text-slate-600`}
                        onClick={() => document.getElementById('mobile-menu').classList.toggle('hidden')}
                    >
                        <MoreVertical className="mx-auto" size={24} /> More
                    </button>
                    <div id="mobile-menu" className="hidden absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                        {/* Mobile menu items... */}
                        <button onClick={() => { navigate('/generator'); document.getElementById('mobile-menu').classList.add('hidden'); }} className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700">
                            <Sparkles size={18} className="text-indigo-500" /> Generator
                        </button>
                        {/* ... other items ... */}
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 text-center border-t border-slate-100 dark:border-slate-700">
                            <button onClick={logout} className="text-xs text-red-500 font-medium flex items-center justify-center gap-1 w-full py-1">
                                <LogOut size={14} /> Log Out
                            </button>
                        </div>
                    </div>
                </div>

                <div className="hidden md:block mt-auto mb-8 text-center space-y-4">
                    <div className="flex justify-center" title={isSyncing ? "Syncing to cloud..." : "Saved to cloud"}>
                        {isSyncing ? (
                            <Loader2 size={16} className="text-amber-500 animate-spin" />
                        ) : (
                            <CheckCircle size={16} className="text-green-500" />
                        )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 mx-auto flex items-center justify-center text-slate-500" title={currentUser?.email}>
                        <Languages size={16} />
                    </div>
                    <div className="text-xs text-slate-400">v1.1</div>

                    <button onClick={logout} className="text-slate-400 hover:text-red-500 transition" title="Log Out">
                        <LogOut size={20} className="mx-auto" />
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="pb-20 pt-8 px-4 md:pl-28 md:pr-8 md:pb-8 max-w-6xl mx-auto h-screen overflow-hidden">
                <div className="h-full overflow-y-auto custom-scrollbar">
                    <Outlet context={{ setSelectedModel, selectedModel }} />
                </div>
            </main>

            <ChatWidget
                isOpen={chatWidgetOpen}
                setIsOpen={setChatWidgetOpen}
                initialMessage=""
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                isAdmin={isAdmin}
                setIsAdmin={setIsAdmin}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
            />
        </div>
    );
}
