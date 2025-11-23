import React from 'react';
import { BookOpen, Clock, BarChart2, CheckCircle, Circle, Trash2, MoreVertical, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TextCard({ text, stats, onSelect, onDelete, onToggleRead }) {
    const getReadingTime = (content) => Math.ceil(content.split(/\s+/).length / 200);

    // Generate a deterministic gradient based on the title length/char codes
    const getGradient = (str) => {
        const gradients = [
            'from-pink-500 to-rose-500',
            'from-orange-400 to-pink-500',
            'from-indigo-500 to-purple-500',
            'from-blue-400 to-indigo-500',
            'from-emerald-400 to-teal-500',
            'from-cyan-400 to-blue-500',
            'from-fuchsia-500 to-purple-600',
            'from-violet-500 to-fuchsia-500'
        ];
        const index = str.length % gradients.length;
        return gradients[index];
    };

    const gradient = getGradient(text.title);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4 }}
            className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
        >
            {/* Cover Art Area */}
            <div 
                className={`h-32 bg-gradient-to-br ${gradient} p-6 relative overflow-hidden cursor-pointer`}
                onClick={() => onSelect(text.id)}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/10">
                        {text.level}
                    </span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleRead(text.id, !text.isRead);
                            }}
                            className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition"
                            title={text.isRead ? "Mark as Unread" : "Mark as Read"}
                        >
                            {text.isRead ? <CheckCircle size={16} /> : <Circle size={16} />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this text?')) {
                                    onDelete(text.id);
                                }
                            }}
                            className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 hover:text-white transition"
                            title="Delete Text"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-indigo-600 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-grow cursor-pointer" onClick={() => onSelect(text.id)}>
                <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {text.title}
                </h3>
                
                <p className="text-slate-500 text-sm line-clamp-3 mb-4 leading-relaxed flex-grow">
                    {text.content}
                </p>

                {/* Footer Stats */}
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-400">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1.5">
                            <BookOpen size={14} />
                            {stats.totalWords}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {getReadingTime(text.content)}m
                        </div>
                    </div>

                    {text.isRead && (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle size={12} />
                            Read
                        </div>
                    )}
                </div>
            </div>
            
            {/* Progress Bar (Visual Flair) */}
            {text.isRead ? (
                <div className="h-1 w-full bg-emerald-500"></div>
            ) : (
                <div className="h-1 w-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                     <div className="h-full bg-indigo-500 w-0 group-hover:w-1/3 transition-all duration-700"></div>
                </div>
            )}
        </motion.div>
    );
}
