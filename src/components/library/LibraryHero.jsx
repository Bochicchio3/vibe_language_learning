import React from 'react';
import { Play, BookOpen, Award, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LibraryHero({ lastActiveText, onContinue, totalTexts, completedTexts }) {
    return (
        <div className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Hero Card - Continue Reading */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group"
                >
                    {/* Background Patterns */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400 opacity-10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-100 mb-2 text-sm font-medium uppercase tracking-wider">
                                <BookOpen size={16} />
                                <span>Continue Reading</span>
                            </div>

                            {lastActiveText ? (
                                <>
                                    <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight max-w-lg">
                                        {lastActiveText.title}
                                    </h2>
                                    <p className="text-indigo-100 line-clamp-2 max-w-lg mb-8 text-lg opacity-90">
                                        {lastActiveText.content}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                                        Ready to start your journey?
                                    </h2>
                                    <p className="text-indigo-100 mb-8 text-lg opacity-90">
                                        Select a text from your library to begin learning German.
                                    </p>
                                </>
                            )}
                        </div>

                        <div>
                            {lastActiveText ? (
                                <button
                                    onClick={() => onContinue(lastActiveText.id)}
                                    className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Play size={20} fill="currentColor" />
                                    Continue Reading
                                </button>
                            ) : (
                                <button
                                    className="bg-white/20 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-default backdrop-blur-sm"
                                >
                                    Explore Below <ArrowRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Stats Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Award size={120} className="text-indigo-600" />
                    </div>

                    <h3 className="text-slate-500 font-medium mb-6 uppercase tracking-wider text-sm">Your Progress</h3>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <div className="text-4xl font-bold text-slate-800 mb-1">{totalTexts}</div>
                            <div className="text-slate-500 font-medium">Texts in Library</div>
                        </div>

                        <div>
                            <div className="text-4xl font-bold text-indigo-600 mb-1">{completedTexts}</div>
                            <div className="text-slate-500 font-medium">Completed Texts</div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${totalTexts > 0 ? (completedTexts / totalTexts) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
