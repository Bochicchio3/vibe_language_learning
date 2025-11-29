import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLibrary } from '../../hooks/useLibrary';
import { useImporter } from '../../hooks/useImporter';
import { fetchModels as fetchOllamaModels } from '../../services/ollama';
import { extractTextFromPDF, chunkText } from '../../services/pdfProcessor';
import ePub from 'epubjs';
import { Plus, FileText, Book, Upload, Loader2, CheckCircle } from 'lucide-react';

export default function ImportView() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { saveText } = useLibrary();
    const { startBackgroundImport, isSyncing, processLogs, stopProcessing } = useImporter();

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(''); // 'extracting', 'chunking', 'adapting', 'saving'
    const [progress, setProgress] = useState(0);
    const [importType, setImportType] = useState('text'); // 'text' or 'book'

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [level, setLevel] = useState('A2');

    // Book Specific State
    const [bookChunks, setBookChunks] = useState([]);
    const [shouldAdapt, setShouldAdapt] = useState(false);
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        if (importType === 'book' && shouldAdapt) {
            fetchOllamaModels().then(models => {
                setOllamaModels(models);
                if (models.length > 0 && !selectedModel) setSelectedModel(models[0].name);
            });
        }
    }, [importType, shouldAdapt]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        setProcessingStep('extracting');
        try {
            let extractedText = '';
            if (file.type === 'application/pdf') {
                extractedText = await extractTextFromPDF(file);
                setTitle(file.name.replace('.pdf', ''));
            } else if (file.type === 'application/epub+zip') {
                await processEPUB(file); // This sets content/title directly
                return;
            } else {
                alert('Please upload a PDF or EPUB file.');
                setIsProcessing(false);
                return;
            }

            if (importType === 'text') {
                setContent(extractedText);
            } else {
                // Book Mode: Chunk immediately
                setProcessingStep('chunking');
                const chunks = chunkText(extractedText);
                setBookChunks(chunks);
                console.log(`Chunked into ${chunks.length} parts`);
            }

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Failed to process file. Please try again.');
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    const processEPUB = async (file) => {
        const book = ePub(file);
        await book.ready;
        const metadata = await book.loaded.metadata;
        setTitle(metadata?.title || file.name.replace('.epub', ''));

        let fullText = '';
        const spine = book.spine;
        for (const item of spine.items) {
            try {
                const chapter = await book.load(item.href);
                if (chapter instanceof Document) {
                    fullText += chapter.body.textContent + '\n\n';
                } else if (typeof chapter === 'string') {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(chapter, 'text/html');
                    fullText += doc.body.textContent + '\n\n';
                }
            } catch (e) { console.warn("Chapter load error", e); }
        }
        setContent(fullText.trim());
        setIsProcessing(false);
    };

    const handleSaveBook = async () => {
        if (!currentUser) return;
        setIsProcessing(true);
        setProcessingStep('adapting'); // Show adapting status while Ch 1 is processed

        try {
            await startBackgroundImport(title, level, bookChunks, shouldAdapt, selectedModel, "German", (newBook) => {
                navigate(`/book/${newBook.id}`);
            });
        } catch (error) {
            console.error("Error saving book:", error);
            alert("Failed to save book.");
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (importType === 'book') {
            handleSaveBook();
            return;
        }

        // Text Mode Save
        try {
            await saveText({ title, content, level });
            navigate('/library');
        } catch (error) {
            alert("Failed to save text.");
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Plus className="text-indigo-600" /> Import Content
            </h2>

            {/* Import Type Selector */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setImportType('text')}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${importType === 'text' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200'}`}
                >
                    <FileText className="inline-block mr-2" size={18} /> Single Text
                </button>
                <button
                    onClick={() => setImportType('book')}
                    className={`flex-1 py-3 rounded-lg border-2 font-medium transition ${importType === 'book' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200'}`}
                >
                    <Book className="inline-block mr-2" size={18} /> Full Book (PDF)
                </button>
            </div>

            {/* File Upload Section */}
            <div className="mb-8 p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center hover:border-indigo-300 transition-colors">
                <input
                    type="file"
                    accept=".pdf,.epub"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {isProcessing ? (
                        <div className="flex flex-col items-center w-full">
                            <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                            <p className="text-slate-600 font-medium">
                                {processingStep === 'extracting' && 'Extracting text...'}
                                {processingStep === 'chunking' && 'Analyzing chapters...'}
                                {processingStep === 'adapting' && `Adapting content with AI (${progress}%)...`}
                                {processingStep === 'saving' && 'Saving to library...'}
                            </p>

                            {processingStep === 'adapting' && (
                                <div className="w-full mt-4 flex flex-col items-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); stopProcessing(); }}
                                        className="px-4 py-1 text-sm text-red-600 border border-red-200 rounded-full hover:bg-red-50 mb-4"
                                    >
                                        Stop Adaptation & Save
                                    </button>

                                    {/* Logs Section */}
                                    <div className="w-full max-w-lg bg-slate-900 rounded-lg overflow-hidden text-left shadow-lg">
                                        <div
                                            className="bg-slate-800 px-4 py-2 flex justify-between items-center cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); setShowLogs(!showLogs); }}
                                        >
                                            <span className="text-xs font-mono text-slate-300">LLM Inner Monologue</span>
                                            <span className="text-xs text-slate-400">{showLogs ? 'Hide' : 'Show'}</span>
                                        </div>
                                        {showLogs && (
                                            <div className="p-4 h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-3">
                                                {processLogs.length === 0 && <span className="text-slate-500">Waiting for logs...</span>}
                                                {processLogs.map((log, idx) => (
                                                    <div key={idx} className={`border-b border-slate-800 pb-2 last:border-0 ${log.isError ? 'text-red-400' : ''}`}>
                                                        <div className="flex justify-between text-slate-500 mb-1">
                                                            <span>[{log.timestamp}] {log.title}</span>
                                                        </div>
                                                        <div>{log.reasoning}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Upload className="text-indigo-400" size={32} />
                            <span className="font-medium text-slate-700">
                                Click to upload PDF or EPUB
                            </span>
                            <span className="text-xs text-slate-400">
                                {importType === 'book' ? "We'll split it into chapters for you." : "We'll extract the text."}
                            </span>
                        </>
                    )}
                </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Harry Potter"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="A1">A1 (Beginner)</option>
                            <option value="A2">A2 (Elementary)</option>
                            <option value="B1">B1 (Intermediate)</option>
                            <option value="B2">B2 (Upper Intermediate)</option>
                            <option value="C1">C1 (Advanced)</option>
                        </select>
                    </div>
                </div>

                {importType === 'book' && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={shouldAdapt}
                                    onChange={(e) => setShouldAdapt(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="font-medium text-slate-700">Adapt Difficulty with AI</span>
                            </label>
                            {shouldAdapt && (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                    Warning: Takes a long time!
                                </span>
                            )}
                        </div>

                        {shouldAdapt && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ollama Model</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {ollamaModels.map(m => (
                                        <option key={m.name} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                                {ollamaModels.length === 0 && <p className="text-xs text-red-500 mt-1">Ollama not detected.</p>}
                            </div>
                        )}

                        {bookChunks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600">
                                    <CheckCircle size={16} className="inline text-green-500 mr-1" />
                                    Ready to import <strong>{bookChunks.length} chapters</strong>.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {importType === 'text' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                        <textarea
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows="10"
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            placeholder="Paste German text here..."
                        ></textarea>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => navigate('/library')} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
                    <button
                        type="submit"
                        disabled={isProcessing || (importType === 'book' && bookChunks.length === 0)}
                        className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : importType === 'book' ? 'Import Book' : 'Save Text'}
                    </button>
                </div>
            </form>
        </div>
    );
}
