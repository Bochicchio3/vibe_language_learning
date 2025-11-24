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
  Play
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
  updateDoc
} from 'firebase/firestore';
import { translateWord } from './services/translation';
import { generateStory as generateGeminiStory } from './services/gemini';
import { generateStory as generateOllamaStory, fetchModels as fetchOllamaModels, simplifyStory } from './services/ollama';

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
          translation = await translateWord(cleanWord, contextSentence);
        } catch (err) {
          console.error("Translation error", err);
        }

        // 4. Save to Firestore
        await setDoc(vocabRef, {
          definition: translation,
          context: contextSentence,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving word:", error);
        alert("Could not save word. Check console for details.");
      } finally {
        setTranslatingWord(null);
      }
    }
  };

  const AddTextView = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [level, setLevel] = useState('A2');

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsProcessing(true);
      try {
        if (file.type === 'application/pdf') {
          await processPDF(file);
        } else if (file.type === 'application/epub+zip') {
          await processEPUB(file);
        } else {
          alert('Please upload a PDF or EPUB file.');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Failed to process file. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };

    const processPDF = async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      setTitle(file.name.replace('.pdf', ''));
      setContent(fullText.trim());
    };

    const processEPUB = async (file) => {
      const book = ePub(file);
      await book.ready;

      // Try to get metadata for title
      const metadata = await book.loaded.metadata;
      if (metadata && metadata.title) {
        setTitle(metadata.title);
      } else {
        setTitle(file.name.replace('.epub', ''));
      }

      // Extract text from all chapters
      let fullText = '';
      // Simplified extraction: iterate over spine items
      // Note: This might be slow for large books and is a basic implementation
      const spine = book.spine;
      for (const item of spine.items) {
        try {
          // Load the chapter
          const chapter = await book.load(item.href);
          // If it's a document, get text content
          if (chapter instanceof Document) {
            fullText += chapter.body.textContent + '\n\n';
          } else if (typeof chapter === 'string') {
            // Sometimes it returns HTML string
            const parser = new DOMParser();
            const doc = parser.parseFromString(chapter, 'text/html');
            fullText += doc.body.textContent + '\n\n';
          }
        } catch (e) {
          console.warn("Could not load chapter", item.href, e);
        }
      }

      // Fallback if spine iteration fails or yields nothing (common in some epubs)
      if (!fullText.trim()) {
        // Try getting locations and text from there? 
        // Or just alert user that auto-extraction failed for this specific epub format
        console.warn("Complex EPUB extraction not fully implemented for all formats.");
      }

      setContent(fullText.trim());
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Use the existing addNewText logic but with local state
      // We need to call the original addNewText or replicate it.
      // Since addNewText takes an event, let's just replicate the logic here for clarity
      // or wrap it. The original addNewText uses formData from e.target.

      // Let's just create a synthetic event or modify addNewText to accept data.
      // Easier: Replicate logic here since we have state.

      try {
        if (!currentUser) throw new Error("No authenticated user!");

        const newDocRef = doc(collection(db, 'users', currentUser.uid, 'texts'));
        await setDoc(newDocRef, {
          title: title,
          level: level,
          content: content,
          questions: [],
          createdAt: serverTimestamp()
        });

        console.log("Text added with ID:", newDocRef.id);
        setView('library');
      } catch (error) {
        console.error("Error adding text:", error);
        alert(`Failed to save text: ${error.message}`);
      }
    };

    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
          <Plus className="text-indigo-600" /> Add New Text
        </h2>

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
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            ) : (
              <Upload className="text-indigo-400" size={32} />
            )}
            <span className="font-medium text-slate-700">
              {isProcessing ? "Processing file..." : "Click to upload PDF or EPUB"}
            </span>
            <span className="text-xs text-slate-400">
              We'll automatically extract the title and content.
            </span>
          </label>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or enter manually</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., My Favorite Hobby"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
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
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setView('library')} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Text</button>
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
                  {ollamaModels.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
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

    const tokens = tokenize(showingSimplified ? simplifiedContent : activeText.content);

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
                <h1 className="text-3xl font-bold mb-6 text-slate-900">{activeText.title}</h1>
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

                          if (!isWord) return <span key={tIndex}>{token}</span>;

                          return (
                            <span
                              key={tIndex}
                              onClick={() => toggleWord(cleanToken)}
                              className={`group/word relative cursor-pointer transition-colors duration-200 rounded px-0.5 mx-0.5 select-none inline-flex items-center gap-1
                                        ${isSaved
                                  ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400'
                                  : 'hover:bg-indigo-100 active:bg-indigo-200'}
                                        ${isTranslating ? 'opacity-70 cursor-wait' : ''}`}
                            >
                              {token}
                              {isSaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
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
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-3 z-50 md:top-0 md:left-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 flex justify-around md:justify-start md:pt-8 md:gap-8 shadow-lg md:shadow-none">
        <div className="hidden md:flex justify-center mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
        </div>
        <button
          onClick={() => setView('library')}
          className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'library' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BookOpen className="mx-auto" size={24} /> Library
        </button>

        <button
          onClick={() => setView('books')}
          className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'books' || view === 'book_detail' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Book className="mx-auto" size={24} /> Books
        </button>

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

        <button
          onClick={() => setView('flashcards')}
          className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition relative ${view === 'flashcards' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Brain className="mx-auto" size={24} />
          Cards
          {dueCount > 0 && (
            <span className="absolute top-0 right-2 md:right-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {dueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setView('progress')}
          className={`flex flex-col md:items-center gap-1 text-xs md:text-xs font-medium transition ${view === 'progress' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <TrendingUp className="mx-auto" size={24} /> Progress
        </button>

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
          {view === 'books' && <BooksView setView={setView} setActiveBook={setActiveBook} />}
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