import React, { useState, useEffect } from 'react';
import BooksView from './components/BooksView';
import BookDetailView from './components/BookDetailView';
import ChapterReader from './components/ChapterReader';
import ChatView from './components/ChatView';
import ChatWidget from './components/ChatWidget';
import {
  BookOpen,
  Highlighter,
  Brain,
  Volume2,
  CheckCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Languages,
  X,
  LogOut,
  Loader2,
  Sparkles,
  Book, // Import Book icon
  MessageCircle,
  Mic,
  TrendingUp,
  Upload,
  FileText,
  PenTool,
  Play,
  MoreVertical
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';

// Set worker source for pdfjs
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/LoginView';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { translateWord } from './services/translation';
import { generateStory as generateGeminiStory } from './services/gemini';
import { generateStory as generateOllamaStory, fetchModels as fetchOllamaModels, simplifyStory, adaptContent } from './services/ollama';
import { extractTextFromPDF, chunkText } from './services/pdfProcessor';

import FlashcardView from './components/FlashcardView';
import LibraryView from './components/LibraryView';
import VocabDashboard from './components/VocabDashboard';
import SpeakingPractice from './components/SpeakingPractice';
import ProgressView from './components/ProgressView';
import WritingPractice from './components/WritingPractice';
import { isDue } from './services/srs';
import { recordActivitySession, recordReadingSession, CATEGORIES } from './services/activityTracker';
import { useTTS } from './hooks/useTTS';
import JourneyView from './components/JourneyView';
import { useGamification } from './hooks/useGamification';
import { StreakCounter, XPBar, LevelBadge } from './components/GamificationComponents';

// --- MOCK DATA SEEDS (Used only for initial population if needed) ---
const INITIAL_TEXTS = [
  {
    title: "Der Morgen (A2)",
    level: "A2",
    content: "Heute ist ein schöner Tag. Die Sonne scheint und die Vögel singen. Markus steht um sieben Uhr auf. Er geht in die Küche und macht Kaffee. Er trinkt den Kaffee schwarz, ohne Zucker. Dann isst er ein Brötchen mit Marmelade. Um acht Uhr muss er zur Arbeit gehen.",
    questions: [
      { q: "Wann steht Markus auf?", a: "Um sieben Uhr." },
      { q: "Wie trinkt er seinen Kaffee?", a: "Schwarz, ohne Zucker." }
    ]
  },
  {
    title: "Die Reise nach Berlin (B1)",
    level: "B1",
    content: "Nächste Woche fahre ich mit dem Zug nach Berlin. Ich habe die Fahrkarten schon gekauft. Die Reise dauert ungefähr vier Stunden. In Berlin möchte ich das Brandenburger Tor und den Reichstag besuchen. Ich hoffe, dass das Wetter gut wird, damit ich viel spazieren gehen kann. Meine Freunde haben mir ein gutes Restaurant empfohlen.",
    questions: [
      { q: "Womit fährt der Erzähler nach Berlin?", a: "Mit dem Zug." },
      { q: "Was möchte er besuchen?", a: "Das Brandenburger Tor und den Reichstag." }
    ]
  }
];

// --- SAMPLE DATA FOR SEEDING ---
const SAMPLE_TEXTS = [
  {
    title: "Im Supermarkt (A1)",
    level: "A1",
    content: "Lisa geht in den Supermarkt. Sie braucht Milch, Eier und Brot. Der Supermarkt ist groß. Es gibt viele Leute. Lisa sucht die Milch. Sie findet die Milch im Kühlregal. Dann geht sie zur Kasse. Sie bezahlt mit Bargeld. Die Kassiererin ist freundlich.",
    questions: []
  },
  {
    title: "Mein Wochenende (A2)",
    level: "A2",
    content: "Am Samstag habe ich lange geschlafen. Dann habe ich gefrühstückt. Ich habe Brötchen mit Käse gegessen. Am Nachmittag habe ich meine Freunde getroffen. Wir sind ins Kino gegangen. Der Film war sehr lustig. Am Sonntag habe ich meine Oma besucht. Wir haben Kuchen gegessen und Tee getrunken.",
    questions: []
  },
  {
    title: "Die deutsche Autobahn (B1)",
    level: "B1",
    content: "Die deutsche Autobahn ist auf der ganzen Welt bekannt. Viele Leute denken, dass es kein Tempolimit gibt. Das stimmt aber nicht überall. Auf vielen Strecken gibt es Geschwindigkeitsbegrenzungen. Wenn es kein Schild gibt, darf man so schnell fahren, wie man möchte. Aber die empfohlene Geschwindigkeit ist 130 Stundenkilometer. Es gibt oft Staus, besonders in den Ferien.",
    questions: []
  }
];

function AuthenticatedApp() {
  // --- STATE ---
  const [view, setView] = useState('journey'); // 'journey', 'library', 'reader', 'vocab', 'add', 'generator', 'books', 'book_detail'
  const [texts, setTexts] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [activeBook, setActiveBook] = useState(null); // New state for active book
  const [activeChapter, setActiveChapter] = useState(null); // New state for active chapter
  const [savedVocab, setSavedVocab] = useState({}); // format: {"word": {definition: "", context: "" } }
  const [showQuiz, setShowQuiz] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [translatingWord, setTranslatingWord] = useState(null); // Track which word is being translated
  const [isSyncing, setIsSyncing] = useState(false);
  const { speak, stop, isPlaying, isLoading, isModelLoading, currentSentenceIndex, generatingSentences } = useTTS();
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState('');
  const [readingSessionStart, setReadingSessionStart] = useState(null);
  const { logout, currentUser, userStats, updateStats } = useAuth();
  const { level, nextLevelXp, progressToNext } = useGamification(userStats);

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!currentUser) return;

    // Sync Texts
    console.log("Syncing texts for user:", currentUser.uid);
    const textsRef = collection(db, 'users', currentUser.uid, 'texts');
    const q = query(textsRef, orderBy('createdAt', 'desc'));

    const unsubscribeTexts = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const loadedTexts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Loaded texts:", loadedTexts);
      console.log("Pending writes:", snapshot.metadata.hasPendingWrites);
      setIsSyncing(snapshot.metadata.hasPendingWrites);

      // Seed initial data if empty (optional, for demo purposes)
      if (loadedTexts.length === 0 && !localStorage.getItem('seeded')) {
        INITIAL_TEXTS.forEach(async (t) => {
          await addDoc(textsRef, { ...t, createdAt: serverTimestamp() });
        });
        localStorage.setItem('seeded', 'true');
      } else {
        setTexts(loadedTexts);
      }
    });

    // Sync Vocab
    const vocabRef = collection(db, 'users', currentUser.uid, 'vocab');
    const unsubscribeVocab = onSnapshot(vocabRef, (snapshot) => {
      const vocabObj = {};
      snapshot.docs.forEach(doc => {
        vocabObj[doc.id] = doc.data();
      });
      setSavedVocab(vocabObj);
    });

    return () => {
      unsubscribeTexts();
      unsubscribeVocab();
    };
  }, [currentUser]);

  // Cancel speech when navigating away from reader/chapter
  useEffect(() => {
    stop();
  }, [view, stop]);

  // Reading session timer: start when entering reader, save when leaving
  useEffect(() => {
    if (view === 'reader' || view === 'chapter_reader') {
      setReadingSessionStart(Date.now());
    } else if (readingSessionStart) {
      // Save session when leaving reader
      const duration = Math.floor((Date.now() - readingSessionStart) / 1000);
      if (duration >= 10 && currentUser) {
        let textTitle = 'Unknown Text';
        if (view !== 'reader' && activeText) {
          textTitle = activeText.title;
        } else if (activeChapter && activeBook) {
          textTitle = `${activeBook.title} - ${activeChapter.title}`;
        }

        const textId = activeTextId || activeChapter?.id || 'unknown';
        recordReadingSession(currentUser.uid, textId, textTitle, duration).catch(err => {
          console.error('Error recording reading session:', err);
        });
      }
      setReadingSessionStart(null);
    }
  }, [view, currentUser]);

  const handleSaveText = async ({ title, content, level }) => {
    try {
      if (!currentUser) throw new Error("No authenticated user!");
      const newDocRef = doc(collection(db, 'users', currentUser.uid, 'texts'));
      await setDoc(newDocRef, {
        title,
        level,
        content,
        questions: [],
        createdAt: serverTimestamp(),
        isRead: false
      });
      return newDocRef.id;
    } catch (error) {
      console.error("Error adding text:", error);
      alert(`Failed to save text: ${error.message}`);
      throw error;
    }
  };

  // --- HELPERS ---
  const dueCount = Object.values(savedVocab).filter(word => isDue(word.srs)).length;
  const activeText = texts.find(t => t.id === activeTextId);

  // Tokenize text to preserve punctuation but make words clickable
  const tokenize = (str) => {
    // Split by non-word characters but keep delimiters (simplified for German chars)
    return str.split(/([^\wäöüÄÖÜß]+)/);
  };

  // Helper to find the sentence containing a word index (simplified)
  // In a real app, we'd pass the index of the clicked token to be precise.
  // For now, we'll just regex match the sentence containing the word in the content.
  const findContextSentence = (content, word) => {
    if (!content) return "Context not found";
    // Split into sentences (naive split by .!?)
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    // Find the first sentence containing the word
    const sentence = sentences.find(s => s.includes(word));
    return sentence ? sentence.trim() : "Context not found";
  };

  const toggleWord = async (originalToken) => {
    // Clean word for storage key (remove punctuation/case)
    const cleanWord = originalToken.trim().replace(/[.,/#!$%^&*;:{ }=\-_`~()]/g, "");
    if (!cleanWord || cleanWord.length < 2) return; // Don't save punctuation or single letters

    const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', cleanWord);

    if (savedVocab[cleanWord]) {
      await deleteDoc(vocabRef);
    } else {
      try {
        // 1. Set loading state
        setTranslatingWord(cleanWord);

        // 2. Find Context
        const contextSentence = activeText ? findContextSentence(activeText.content, originalToken) : "Custom";

        // 3. Fetch Translation
        let translation = "";
        try {
          console.log("[toggleWord] Fetching translation for:", cleanWord);
          translation = await translateWord(cleanWord, contextSentence);
          console.log("[toggleWord] Translation received:", translation);
        } catch (err) {
          console.error("Translation error", err);
        }

        // 4. Save to Firestore
        await setDoc(vocabRef, {
          definition: translation,
          context: contextSentence,
          createdAt: serverTimestamp()
        });
        console.log("[toggleWord] Returning translation:", translation);

        // Update local state for tooltip
        setSavedVocab(prev => ({
          ...prev,
          [cleanWord]: { definition: translation }
        }));

        return translation;
      } catch (error) {
        console.error("Error saving word:", error);
        alert("Could not save word. Check console for details.");
        return null;
      } finally {
        setTranslatingWord(null);
      }
    }
    return null;
  };
  // Background Processing State
  const [backgroundTask, setBackgroundTask] = useState(null); // { bookId, totalChapters, completedChapters, status: 'running' | 'completed' | 'error' }
  const [processLogs, setProcessLogs] = useState([]);
  const [abortController, setAbortController] = useState(null);

  const processRemainingChapters = async (bookId, chapters, startIndex, level, model) => {
    console.log("Starting background adaptation for book:", bookId);

    for (let i = startIndex; i < chapters.length; i++) {
      // Check if aborted (we need a ref or a global controller, using the state one might be tricky if it updates)
      // For simplicity, we'll check the current controller state if possible, or just let it run.
      // Better: Pass the signal to this function.
    }
  };

  const startBackgroundImport = async (title, level, chunks, shouldAdapt, model, targetLanguage = "German") => {
    setIsSyncing(true);
    setProcessLogs([]);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 1. Save the book IMMEDIATELY (all raw)
      const newBookRef = doc(collection(db, 'users', currentUser.uid, 'books'));
      const newBook = {
        id: newBookRef.id,
        title,
        level,
        targetLanguage, // Store target language
        chapters: chunks, // Start with raw chunks
        totalChapters: chunks.length,
        createdAt: serverTimestamp(),
        isAdapted: shouldAdapt,
        currentProcessingChapter: shouldAdapt ? 1 : null, // Start processing Ch 1 immediately
        originalFile: 'Imported'
      };

      await setDoc(newBookRef, newBook);

      // 2. Redirect user immediately
      setActiveBook(newBook);
      setView('book_detail');
      setIsSyncing(false);

      // 3. Start background process for ALL chapters (starting from 0)
      if (shouldAdapt && model && chunks.length > 0) {
        // Fire and forget (don't await)
        (async () => {
          const bookId = newBookRef.id;
          console.log("Starting background processing for", bookId);

          for (let i = 0; i < chunks.length; i++) {
            if (controller.signal.aborted) break;

            try {
              // Update current processing chapter
              await updateDoc(newBookRef, { currentProcessingChapter: i + 1 });

              const chunk = chunks[i];
              const result = await adaptContent(chunk.content, level, model, targetLanguage);
              const content = typeof result === 'object' ? result.content : result;
              const reasoning = typeof result === 'object' ? result.reasoning : "No reasoning provided";

              // Update Firestore with the new chapter
              const bookSnap = await getDoc(newBookRef);
              if (bookSnap.exists()) {
                const currentChapters = bookSnap.data().chapters;
                currentChapters[i] = { ...chunk, content, isAdapted: true };

                await updateDoc(newBookRef, {
                  chapters: currentChapters,
                  currentProcessingChapter: i + 1 < chunks.length ? i + 2 : null // Update to next or null if done
                });

                setProcessLogs(prev => [...prev, {
                  chunkId: i + 1,
                  title: chunk.title,
                  reasoning: reasoning,
                  timestamp: new Date().toLocaleTimeString()
                }]);
              }

            } catch (err) {
              console.error(`Background adaptation failed for Ch ${i + 1}`, err);
            }
          }

          // Mark as complete
          await updateDoc(newBookRef, { currentProcessingChapter: null });
          console.log("Background processing complete");
        })();
      }

    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import book.");
      setIsSyncing(false);
    }
  };

  const AddTextView = () => {
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
          // Reuse existing EPUB logic or move to processor (keeping simple for now)
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

    // Keep EPUB logic for now as fallback/legacy support within this component
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

    // Adaptation State
    // const [abortController, setAbortController] = useState(null); // Moved to App
    // const [processLogs, setProcessLogs] = useState([]); // Moved to App
    // const [showLogs, setShowLogs] = useState(false); // Moved to App

    const handleSaveBook = async () => {
      if (!currentUser) return;
      setIsProcessing(true);
      setProcessingStep('adapting'); // Show adapting status while Ch 1 is processed

      try {
        // Call the background import function defined in App
        await startBackgroundImport(title, level, bookChunks, shouldAdapt, selectedModel);

        // No need to setView here, startBackgroundImport does it
      } catch (error) {
        console.error("Error saving book:", error);
        alert("Failed to save book.");
        setIsProcessing(false);
        setProcessingStep('');
      }
    };

    const handleStopProcessing = () => {
      // if (abortController) { abortController.abort(); } // Managed by App now
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (importType === 'book') {
        handleSaveBook();
        return;
      }

      // Text Mode Save
      await handleSaveText({ title, content, level });
      setView('library');
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
                      onClick={(e) => { e.stopPropagation(); handleStopProcessing(); }}
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
                          {/* Auto-scroll anchor could go here */}
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
            <button type="button" onClick={() => setView('library')} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
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
  };

  const seedLibrary = async () => {
    if (!currentUser) return;
    const textsRef = collection(db, 'users', currentUser.uid, 'texts');
    try {
      for (const text of SAMPLE_TEXTS) {
        await addDoc(textsRef, { ...text, createdAt: serverTimestamp() });
      }
      alert("Added 3 sample texts to your library!");
    } catch (error) {
      console.error("Error seeding library:", error);
      alert("Failed to seed library.");
    }
  };

  const updateDefinition = async (word, def) => {
    // Optimistic update for UI responsiveness
    setSavedVocab(prev => ({
      ...prev,
      [word]: { ...prev[word], definition: def }
    }));

    // Debounce could be added here, but for now direct update
    const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', word);
    await setDoc(vocabRef, { definition: def }, { merge: true });
  };

  const handleDeleteText = async (textId) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'texts', textId));
    } catch (error) {
      console.error("Error deleting text:", error);
      alert("Failed to delete text.");
    }
  };

  const handleDeleteWord = async (word) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'vocab', word));
      // Optimistic update
      setSavedVocab(prev => {
        const newVocab = { ...prev };
        delete newVocab[word];
        return newVocab;
      });
    } catch (error) {
      console.error("Error deleting word:", error);
      alert("Failed to delete word.");
    }
  };

  const handleToggleRead = async (textId, isRead) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'texts', textId), {
        isRead: isRead
      });
    } catch (error) {
      console.error("Error updating read status:", error);
    }
  };

  // --- VIEWS ---

  const GeneratorView = () => {
    const [topic, setTopic] = useState('');
    const [theme, setTheme] = useState('');
    const [level, setLevel] = useState('A2');
    const [length, setLength] = useState('Medium');
    const [provider, setProvider] = useState('gemini');
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState(null);

    // Check for pre-filled topic from library generate box
    useEffect(() => {
      const savedTopic = localStorage.getItem('generatorTopic');
      if (savedTopic) {
        setTopic(savedTopic);
        localStorage.removeItem('generatorTopic'); // Clear it after using
      }
    }, []);

    useEffect(() => {
      if (provider === 'ollama') {
        fetchOllamaModels().then(models => {
          setOllamaModels(models);
          if (models.length > 0 && !selectedOllamaModel) {
            setSelectedOllamaModel(models[0].name);
          }
        });
      }
    }, [provider]);

    const handleGenerate = async (e) => {
      e.preventDefault();
      setGenerating(true);
      setGeneratedStory(null);
      try {
        let story;
        if (provider === 'gemini') {
          story = await generateGeminiStory(topic, level, length, theme);
        } else {
          if (!selectedOllamaModel) throw new Error("No Ollama model selected");
          story = await generateOllamaStory(topic, level, length, theme, selectedOllamaModel);
        }
        setGeneratedStory(story);
      } catch (error) {
        console.error("Generation error:", error);
        alert(`Failed to generate story: ${error.message}`);
      } finally {
        setGenerating(false);
      }
    };

    const handleSaveGenerated = async () => {
      if (!generatedStory) return;
      console.log("Saving story:", generatedStory);

      try {
        // Create a reference with an auto-generated ID
        const newDocRef = doc(collection(db, 'users', currentUser.uid, 'texts'));

        // Write to Firestore (Blocking - wait for server response)
        await setDoc(newDocRef, {
          title: generatedStory.title,
          level: level,
          content: generatedStory.content,
          questions: [],
          createdAt: serverTimestamp()
        });

        console.log("Story saved successfully with ID:", newDocRef.id);
        alert("Story saved to library!");
        setView('library');
      } catch (error) {
        console.error("Error preparing save:", error);
        alert("Failed to save story.");
      }
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
          <Sparkles className="text-indigo-600" /> AI Story Generator
        </h2>

        {!generatedStory ? (
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., A day at the beach, Space travel, Cooking dinner..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Theme (Optional)</label>
                <input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g., Mystery, Sci-Fi..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="gemini">Gemini (Cloud)</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>
            </div>

            {provider === 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ollama Model</label>
                <select
                  value={selectedOllamaModel}
                  onChange={(e) => setSelectedOllamaModel(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {ollamaModels.length === 0 && <option value="">Loading models...</option>}
                  {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
                {ollamaModels.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Make sure Ollama is running!</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="A1">A1 (Beginner)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Short">Short (~100 words)</option>
                  <option value="Medium">Medium (~250 words)</option>
                  <option value="Long">Long (~500 words)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" /> Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Generate Story
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <h3 className="text-xl font-bold text-slate-900 mb-4">{generatedStory.title}</h3>
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{generatedStory.content}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setGeneratedStory(null)}
                className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-lg font-medium hover:bg-slate-200 transition"
              >
                Discard
              </button>
              <button
                onClick={handleSaveGenerated}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2"
              >
                <CheckCircle size={20} /> Save to Library
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };



  const ReaderView = () => {
    if (!activeText) return null;
    const [selection, setSelection] = useState(null);
    const [ollamaModels, setOllamaModels] = useState([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [simplifiedContent, setSimplifiedContent] = useState(null);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [showingSimplified, setShowingSimplified] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState(null); // For mobile click-to-show

    const tokens = tokenize(showingSimplified ? simplifiedContent : activeText.content);

    // Auto-hide tooltip on mobile
    useEffect(() => {
      if (activeTooltip) {
        const timer = setTimeout(() => {
          setActiveTooltip(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
    }, [activeTooltip]);



    useEffect(() => {
      if (showQuiz || !selectedOllamaModel) {
        fetchOllamaModels().then(models => {
          setOllamaModels(models);
          if (models.length > 0 && !selectedOllamaModel) setSelectedOllamaModel(models[0].name);
        });
      }
    }, [showQuiz]);

    const handleSimplify = async () => {
      if (!selectedOllamaModel) {
        alert("Please ensure Ollama is running and a model is selected.");
        return;
      }
      setIsSimplifying(true);
      try {
        const simplified = await simplifyStory(activeText.content, "A1", selectedOllamaModel);
        setSimplifiedContent(simplified);
        setShowingSimplified(true);
      } catch (error) {
        console.error("Simplification failed:", error);
        alert("Failed to simplify story. Check console.");
      } finally {
        setIsSimplifying(false);
      }
    };

    const handleGenerateQuestions = async () => {
      if (!selectedOllamaModel) return;
      setIsGeneratingQuestions(true);
      try {
        const { generateComprehensionQuestions } = await import('./services/ollama');
        const newQuestions = await generateComprehensionQuestions(selectedOllamaModel, activeText.content);

        // Update local state and Firestore
        const updatedText = { ...activeText, questions: [...(activeText.questions || []), ...newQuestions] };

        // Optimistic update (if we had a setTexts, but we rely on Firestore sync usually)
        // For immediate feedback we might want to update local state if possible, but let's just write to DB

        if (currentUser) {
          const textRef = doc(db, 'users', currentUser.uid, 'texts', activeText.id);
          await updateDoc(textRef, {
            questions: updatedText.questions
          });
        }

      } catch (error) {
        console.error("Failed to generate questions:", error);
        alert(`Failed to generate questions: ${error.message}`);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    // Split content into sentences
    const segmenter = new Intl.Segmenter('de', { granularity: 'sentence' });
    const sentences = Array.from(segmenter.segment(activeText.content)).map(s => s.segment);

    const handleSelection = () => {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText.length > 0) {
        const selectionRange = window.getSelection().getRangeAt(0);
        const rect = selectionRange.getBoundingClientRect();
        setSelection({
          text: selectedText,
          top: rect.top,
          left: rect.left + rect.width / 2
        });
      } else {
        setSelection(null);
      }
    };

    const handleAskAI = (e) => {
      e.stopPropagation();
      if (!selection) return;
      setChatInitialMessage(`Explain this: "${selection.text}"`);
      setChatWidgetOpen(true);
      setSelection(null);
      window.getSelection().removeAllRanges();
    };

    const handleSpeak = () => {
      if (isPlaying) {
        stop();
      } else {
        speak(showingSimplified ? simplifiedContent : activeText.content);
      }
    };

    return (
      <div
        className="max-w-3xl mx-auto bg-white min-h-[80vh] shadow-sm rounded-xl overflow-hidden flex flex-col relative"
        onMouseUp={handleSelection}
      >
        {/* Selection Popup */}
        {selection && (
          <div
            className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2"
            style={{ top: selection.top, left: selection.left }}
          >
            <button
              onClick={handleAskAI}
              className="bg-indigo-600 text-white text-sm font-bold py-2 px-4 rounded-full shadow-lg hover:bg-indigo-700 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
            >
              <MessageCircle size={16} /> Ask AI
            </button>
            <div className="w-3 h-3 bg-indigo-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-10">
          <button onClick={() => setView('library')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ChevronLeft size={18} /> Library
          </button>
          <div className="flex gap-2 items-center">
            {/* Simplification Controls */}
            {simplifiedContent ? (
              <button
                onClick={() => setShowingSimplified(!showingSimplified)}
                className={`p-2 rounded-full transition ${showingSimplified ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-700'}`}
                title={showingSimplified ? "Show Original" : "Show Simplified"}
              >
                <RotateCcw size={20} />
              </button>
            ) : (
              <button
                onClick={handleSimplify}
                disabled={isSimplifying || ollamaModels.length === 0}
                className={`p-2 rounded-full transition ${isSimplifying ? 'bg-indigo-50 text-indigo-400' : 'hover:bg-slate-200 text-slate-700'}`}
                title="Simplify Text (AI)"
              >
                {isSimplifying ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              </button>
            )}

            {/* Model Selector */}
            {ollamaModels.length > 0 && !showQuiz && (
              <select
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="text-xs p-1 border border-slate-200 rounded bg-white max-w-[100px] hidden md:block"
              >
                {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            )}

            {isModelLoading && (
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-2">
                <Loader2 size={12} className="animate-spin" /> Loading Model...
              </span>
            )}

            <button
              onClick={handleSpeak}
              className={`p-2 rounded-full transition ${isPlaying
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 animate-pulse'
                : 'hover:bg-slate-200 text-slate-700'
                }`}
              title={isPlaying ? "Stop Reading" : "Read Aloud"}
              disabled={isModelLoading}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
            </button>
            <button
              onClick={() => setShowQuiz(!showQuiz)}
              className={`p-2 rounded-full transition ${showQuiz ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-700'}`}
              title="Comprehension Questions"
            >
              <Brain size={20} />
            </button>
          </div >
        </div >

        {/* Content Area */}
        < div className="p-8 md:p-12 flex-grow overflow-y-auto" >
          {
            showQuiz ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300" >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="text-indigo-600" /> Comprehension Check
                  </h3>

                  {/* Generator Controls */}
                  <div className="flex gap-2 items-center">
                    {ollamaModels.length > 0 && (
                      <select
                        value={selectedOllamaModel}
                        onChange={(e) => setSelectedOllamaModel(e.target.value)}
                        className="text-sm p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={isGeneratingQuestions || ollamaModels.length === 0}
                      className="text-sm bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGeneratingQuestions ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Generate
                    </button>
                  </div>
                </div>

                {activeText.questions && activeText.questions.length > 0 ? activeText.questions.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-3">{q.q}</p>
                    <details className="text-slate-600">
                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 text-sm font-medium">Show Answer</summary>
                      <div className="mt-2 pl-4 border-l-2 border-indigo-200 italic">
                        {q.a}
                      </div>
                    </details>
                  </div>
                )) : (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Brain className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 italic mb-4">No questions available for this text.</p>
                    {ollamaModels.length > 0 ? (
                      <button
                        onClick={handleGenerateQuestions}
                        disabled={isGeneratingQuestions}
                        className="text-indigo-600 font-medium hover:underline"
                      >
                        Generate some with AI?
                      </button>
                    ) : (
                      <p className="text-xs text-slate-400">Make sure Ollama is running to generate questions.</p>
                    )}
                  </div>
                )
                }
              </div >
            ) : (
              <div>
                <h1 className="text-3xl font-bold mb-6 text-slate-900">
                  {tokenize(activeText.title).map((token, index) => {
                    const isWord = /\w/.test(token);
                    if (!isWord) return <span key={index}>{token}</span>;
                    const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                    const isSaved = savedVocab.hasOwnProperty(cleanToken);

                    return (
                      <span
                        key={index}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const uniqueId = `title-${index}`;
                          const hasHover = window.matchMedia('(hover: hover)').matches;

                          if (isSaved && savedVocab[cleanToken]) {
                            if (hasHover) {
                              await toggleWord(token);
                              setActiveTooltip(null);
                            } else {
                              if (activeTooltip === uniqueId) {
                                await toggleWord(token);
                                setActiveTooltip(null);
                              } else {
                                setActiveTooltip(uniqueId);
                              }
                            }
                            return;
                          }

                          const translation = await toggleWord(token);
                          if (translation) {
                            setActiveTooltip(uniqueId);
                          }
                        }}
                        className={`group relative cursor-pointer transition-colors duration-200 rounded px-0.5
                                  ${isSaved ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400' : 'hover:bg-indigo-100 active:bg-indigo-200'}`}
                      >
                        {token}

                        {/* Tooltip for Title */}
                        {isSaved && savedVocab[cleanToken] && (
                          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] ${activeTooltip === `title-${index}` ? 'block' : 'hidden group-hover:block'
                            }`}>
                            <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                              {savedVocab[cleanToken].definition}
                            </div>
                            <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                          </div>
                        )}
                      </span>
                    );
                  })}
                </h1>
                <div className="text-xl leading-loose text-slate-800 font-serif">
                  {sentences.map((sentence, sIndex) => {
                    const isCurrentSentence = sIndex === currentSentenceIndex;
                    const isGenerating = generatingSentences.has(sIndex);
                    const tokens = tokenize(sentence);

                    return (
                      <div key={sIndex} className={`group relative transition-colors duration-300 rounded-lg py-2 px-1 -mx-1 ${isCurrentSentence ? 'bg-yellow-100' : 'hover:bg-slate-50'}`}>
                        {/* Sentence Play Button - larger hit area */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(activeText.content, sIndex);
                          }}
                          className={`absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition opacity-0 group-hover:opacity-100 ${isCurrentSentence ? 'opacity-100 text-indigo-600' : ''}`}
                          title="Play from here"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} className={isCurrentSentence && isPlaying ? "fill-current" : ""} />
                          )}
                        </button>

                        {tokens.map((token, tIndex) => {
                          const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                          const isSaved = savedVocab.hasOwnProperty(cleanToken);
                          const isTranslating = translatingWord === cleanToken;
                          const isWord = /\w/.test(token);
                          const uniqueId = `${sIndex}-${tIndex}`;

                          if (!isWord) return <span key={tIndex}>{token}</span>;

                          return (
                            <span
                              key={tIndex}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const hasHover = window.matchMedia('(hover: hover)').matches;
                                console.log("[Word Click] Clicked token:", token, "ID:", uniqueId, "Hover:", hasHover);

                                // If already saved
                                if (isSaved && savedVocab[cleanToken]) {
                                  if (hasHover) {
                                    // Desktop: Click always removes (un-highlights)
                                    // Tooltip is handled by hover
                                    await toggleWord(token);
                                    setActiveTooltip(null);
                                  } else {
                                    // Mobile: Click shows tooltip, or removes if already shown
                                    if (activeTooltip === uniqueId) {
                                      await toggleWord(token);
                                      setActiveTooltip(null);
                                    } else {
                                      setActiveTooltip(uniqueId);
                                    }
                                  }
                                  return;
                                }

                                // If not saved, translate and save
                                const translation = await toggleWord(token);

                                // Show tooltip after saving (for both mobile and desktop feedback)
                                if (translation) {
                                  setActiveTooltip(uniqueId);
                                }
                              }}
                              className={`group/word relative cursor-pointer transition-colors duration-200 rounded px-0.5
                                        ${isSaved
                                  ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400'
                                  : 'hover:bg-indigo-100 active:bg-indigo-200'}
                                        ${isTranslating ? 'opacity-70 cursor-wait' : ''}`}
                            >
                              {token}
                              {isTranslating && <span className="inline-block w-1.5 h-1.5 ml-0.5 rounded-full bg-indigo-500 animate-pulse"></span>}

                              {/* Hover Tooltip (desktop) + Click Tooltip (mobile) */}
                              {isSaved && savedVocab[cleanToken] && (
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] ${activeTooltip === uniqueId ? 'block' : 'hidden group-hover/word:block'
                                  }`}>
                                  <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                                    {savedVocab[cleanToken].definition}
                                  </div>
                                  <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                </div>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-8 text-sm text-slate-400 italic text-center">
                  Click any word to highlight it and add it to your vocabulary list.
                </p>
              </div>
            )
          }
        </div >
      </div >
    );
  };





  // --- MAIN LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Navigation Sidebar (Mobile: Bottom bar, Desktop: Sidebar) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-2 z-50 md:top-0 md:left-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 md:p-3 flex justify-around md:justify-start md:pt-8 md:gap-8 shadow-lg md:shadow-none">
        <div className="hidden md:flex justify-center mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
        </div>

        {/* Core Items - Always Visible */}
        <button
          onClick={() => setView('library')}
          className={`flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition p-1 rounded-lg ${view === 'library' ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BookOpen className="mx-auto" size={24} /> Library
        </button>

        <button
          onClick={() => setView('books')}
          className={`flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition p-1 rounded-lg ${view === 'books' || view === 'book_detail' ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Book className="mx-auto" size={24} /> Books
        </button>

        <button
          onClick={() => setView('flashcards')}
          className={`flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition relative p-1 rounded-lg ${view === 'flashcards' ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Brain className="mx-auto" size={24} />
          Cards
          {dueCount > 0 && (
            <span className="absolute top-0 right-1 md:right-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {dueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setView('progress')}
          className={`flex flex-col items-center gap-1 text-[10px] md:text-xs font-medium transition p-1 rounded-lg ${view === 'progress' ? 'text-indigo-600 bg-indigo-50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <TrendingUp className="mx-auto" size={24} /> Progress
        </button>

        {/* Desktop Only Items (Visible on Desktop, Hidden on Mobile) */}
        <div className="hidden md:contents">
          <button
            onClick={() => setView('generator')}
            className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'generator' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Sparkles className="mx-auto" size={24} /> Generator
          </button>

          <button
            onClick={() => setView('chat')}
            className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'chat' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageCircle className="mx-auto" size={24} /> Chat
          </button>

          <button
            onClick={() => setView('speaking')}
            className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'speaking' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Mic className="mx-auto" size={24} /> Speaking
          </button>

          <button
            onClick={() => setView('writing')}
            className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'writing' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PenTool className="mx-auto" size={24} /> Writing
          </button>

          <button
            onClick={() => setView('vocab')}
            className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'vocab' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Highlighter className="mx-auto" size={24} /> Vocab
          </button>
        </div>

        {/* Mobile "More" Menu */}
        <div className="md:hidden relative group">
          <button
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition p-1 rounded-lg ${['generator', 'chat', 'speaking', 'writing', 'vocab'].includes(view) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => document.getElementById('mobile-menu').classList.toggle('hidden')}
          >
            <MoreVertical className="mx-auto" size={24} /> More
          </button>

          {/* Popup Menu */}
          <div id="mobile-menu" className="hidden absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button
              onClick={() => { setView('generator'); document.getElementById('mobile-menu').classList.add('hidden'); }}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700"
            >
              <Sparkles size={18} className="text-indigo-500" /> Generator
            </button>
            <button
              onClick={() => { setView('chat'); document.getElementById('mobile-menu').classList.add('hidden'); }}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700"
            >
              <MessageCircle size={18} className="text-indigo-500" /> Chat
            </button>
            <button
              onClick={() => { setView('speaking'); document.getElementById('mobile-menu').classList.add('hidden'); }}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700"
            >
              <Mic size={18} className="text-indigo-500" /> Speaking
            </button>
            <button
              onClick={() => { setView('writing'); document.getElementById('mobile-menu').classList.add('hidden'); }}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700"
            >
              <PenTool size={18} className="text-indigo-500" /> Writing
            </button>
            <button
              onClick={() => { setView('vocab'); document.getElementById('mobile-menu').classList.add('hidden'); }}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 text-left text-sm font-medium text-slate-700 border-b border-slate-100"
            >
              <Highlighter size={18} className="text-indigo-500" /> Vocab
            </button>
            <div className="p-2 bg-slate-50 text-center">
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
          <div className="text-xs text-slate-400">v1.1 (Blocking)</div>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition" title="Log Out">
            <LogOut size={20} className="mx-auto" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pb-20 pt-8 px-4 md:pl-28 md:pr-8 md:pb-8 max-w-6xl mx-auto h-screen overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
          {view === 'library' && (
            <LibraryView
              texts={texts}
              savedVocab={savedVocab}
              onSelect={(id) => { setActiveTextId(id); setView('reader'); setShowQuiz(false); }}
              onDelete={handleDeleteText}
              onToggleRead={handleToggleRead}
              onSeed={seedLibrary}
              onAdd={() => setView('add')}
              onGenerate={(topic) => {
                // Store the topic and navigate to generator view
                if (topic) {
                  // We can use localStorage to pass the topic to the generator
                  localStorage.setItem('generatorTopic', topic);
                }
                setView('generator');
              }}
              onSaveText={handleSaveText}
            />
          )}
          {view === 'reader' && <ReaderView />}
          {view === 'speaking' && <SpeakingPractice />}
          {view === 'writing' && <WritingPractice savedVocab={savedVocab} onSave={() => setView('library')} />}
          {view === 'vocab' && (
            <VocabDashboard
              vocab={savedVocab}
              onUpdate={updateDefinition}
              onDelete={handleDeleteWord}
            />
          )}
          {view === 'add' && <AddTextView />}
          {view === 'generator' && <GeneratorView />}
          {view === 'chat' && <ChatView />}
          {view === 'progress' && <ProgressView />}
          {view === 'flashcards' && <FlashcardView />}
          {view === 'books' && <BooksView setView={setView} setActiveBook={setActiveBook} onImportBook={startBackgroundImport} />}
          {view === 'book_detail' && (
            <BookDetailView
              book={activeBook}
              setView={setView}
              setActiveBook={setActiveBook}
              setChapter={setActiveChapter}
            />
          )}
          {view === 'chapter_reader' && (
            <ChapterReader
              chapter={activeChapter}
              book={activeBook}
              setView={setView}
              setChapter={setActiveChapter}
              setActiveBook={setActiveBook}
              setChatWidgetOpen={setChatWidgetOpen}
              setChatInitialMessage={setChatInitialMessage}
            />
          )}
        </div>
      </main>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      <ChatWidget
        isOpen={chatWidgetOpen}
        setIsOpen={setChatWidgetOpen}
        initialMessage={chatInitialMessage}
      />
    </div>
  );
}

export default function LinguistApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { currentUser } = useAuth();
  return currentUser ? <AuthenticatedApp /> : <LoginView />;
}