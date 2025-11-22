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
  MessageCircle
} from 'lucide-react';
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
  serverTimestamp
} from 'firebase/firestore';
import { translateWord } from './services/translation';
import { generateStory } from './services/gemini';
import FirestoreTest from './components/FirestoreTest';
import FlashcardView from './components/FlashcardView';
import { isDue } from './services/srs';

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
  const [view, setView] = useState('library'); // 'library', 'reader', 'vocab', 'add', 'generator', 'books', 'book_detail'
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
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState('');
  const { logout, currentUser } = useAuth();

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

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Browser does not support Text-to-Speech");
    }
  };

  const addNewText = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      console.log("Adding new text for user:", currentUser?.uid);

      if (!currentUser) {
        throw new Error("No authenticated user found!");
      }

      // Create a reference with an auto-generated ID
      const newDocRef = doc(collection(db, 'users', currentUser.uid, 'texts'));

      // Write to Firestore (Blocking - wait for server response)
      await setDoc(newDocRef, {
        title: formData.get('title'),
        level: formData.get('level'),
        content: formData.get('content'),
        questions: [], // Simplified for now
        createdAt: serverTimestamp()
      });

      console.log("Text added successfully with ID:", newDocRef.id);
      setView('library');
    } catch (error) {
      console.error("Error adding text: ", error);
      alert(`Failed to save text: ${error.message}`);
    }
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

  // --- VIEWS ---

  const GeneratorView = () => {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('A2');
    const [length, setLength] = useState('Medium');
    const [generating, setGenerating] = useState(false);
    const [generatedStory, setGeneratedStory] = useState(null);

    const handleGenerate = async (e) => {
      e.preventDefault();
      setGenerating(true);
      setGeneratedStory(null);
      try {
        const story = await generateStory(topic, level, length);
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

  const LibraryView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Your Library</h2>
        <div className="flex gap-2">
          <button
            onClick={seedLibrary}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
          >
            <Plus size={18} /> Seed Samples
          </button>
          <button
            onClick={() => setView('add')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> Add Text
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {texts.map(text => (
          <div
            key={text.id}
            onClick={() => { setActiveTextId(text.id); setView('reader'); setShowQuiz(false); }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${text.level === 'A2' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {text.level}
              </span>
              <BookOpen size={20} className="text-slate-400 group-hover:text-indigo-500" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">{text.title}</h3>
            <p className="text-slate-500 text-sm line-clamp-3">{text.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const ReaderView = () => {
    if (!activeText) return null;
    const tokens = tokenize(activeText.content);
    const [selection, setSelection] = useState(null);

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
          <div className="flex gap-2">
            <button
              onClick={() => speakText(activeText.content)}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-700"
              title="Read Aloud"
            >
              <Volume2 size={20} />
            </button>
            <button
              onClick={() => setShowQuiz(!showQuiz)}
              className={`p-2 rounded-full transition ${showQuiz ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-700'}`}
              title="Comprehension Questions"
            >
              <Brain size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 md:p-12 flex-grow overflow-y-auto">
          {showQuiz ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Brain className="text-indigo-600" /> Comprehension Check
              </h3>
              {activeText.questions.length > 0 ? activeText.questions.map((q, idx) => (
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
                <p className="text-slate-500 italic">No questions available for this text.</p>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-6 text-slate-900">{activeText.title}</h1>
              <div className="text-xl leading-loose text-slate-800 font-serif">
                {tokens.map((token, index) => {
                  const cleanToken = token.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
                  const isSaved = savedVocab.hasOwnProperty(cleanToken);
                  const isTranslating = translatingWord === cleanToken;
                  const isWord = /\w/.test(token); // Simple check if it's a word

                  if (!isWord) return <span key={index}>{token}</span>;

                  return (
                    <span
                      key={index}
                      onClick={() => toggleWord(cleanToken)}
                      className={`group relative cursor-pointer transition-colors duration-200 rounded px-0.5
                        ${isSaved
                          ? 'bg-amber-200 text-amber-900 hover:bg-amber-300 border-b-2 border-amber-400'
                          : 'hover:bg-indigo-100 active:bg-indigo-200'}
                        ${isTranslating ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {token}
                      {isTranslating && <Loader2 size={12} className="animate-spin" />}

                      {/* Tooltip */}
                      {isSaved && savedVocab[cleanToken]?.definition && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-max max-w-[200px]">
                          <div className="bg-slate-800 text-white text-xs rounded py-1 px-2 shadow-lg text-center">
                            {savedVocab[cleanToken].definition}
                          </div>
                          {/* Arrow */}
                          <div className="w-2 h-2 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                        </div>
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="mt-8 text-sm text-slate-400 italic text-center">
                Click any word to highlight it and add it to your vocabulary list.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const VocabView = () => {
    const words = Object.keys(savedVocab);

    if (words.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Languages size={48} className="mb-4 opacity-50" />
          <p className="text-lg">No words saved yet.</p>
          <p className="text-sm">Go read a text and click on words you don't know!</p>
        </div>
      );
    }

    const currentWord = words[flashcardIndex];
    const cardData = savedVocab[currentWord];

    const nextCard = () => {
      setShowFlashcardAnswer(false);
      setFlashcardIndex((prev) => (prev + 1) % words.length);
    };

    const prevCard = () => {
      setShowFlashcardAnswer(false);
      setFlashcardIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Flashcards ({words.length})</h2>
          <div className="text-sm text-slate-500">
            Card {flashcardIndex + 1} of {words.length}
          </div>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 min-h-[300px] mb-6">
          <div
            className={`relative w-full h-80 transition-all duration-500 transform-style-3d cursor-pointer ${showFlashcardAnswer ? 'rotate-y-180' : ''}`}
            onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
          >
            {/* Front */}
            <div className={`absolute w-full h-full bg-white border-2 border-indigo-100 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 backface-hidden ${showFlashcardAnswer ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase mb-4">German</span>
              <h3 className="text-4xl font-bold text-slate-800 text-center">{currentWord}</h3>
              <p className="mt-8 text-sm text-slate-400">Tap to flip</p>
            </div>

            {/* Back */}
            <div className={`absolute w-full h-full bg-indigo-50 border-2 border-indigo-200 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 rotate-y-180 backface-hidden ${showFlashcardAnswer ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase mb-4">Meaning</span>

              {/* Editable Definition */}
              <input
                type="text"
                value={cardData.definition}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateDefinition(currentWord, e.target.value)}
                placeholder="Type definition here..."
                className="text-center bg-white border border-indigo-200 rounded p-2 text-xl text-slate-800 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />

              <div className="text-sm text-slate-500 mt-2">
                Found in: <span className="italic">{cardData.context}</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newVocab = { ...savedVocab };
                  delete newVocab[currentWord];
                  setSavedVocab(newVocab);
                  if (words.length === 1) setFlashcardIndex(0);
                  else if (flashcardIndex >= words.length - 1) setFlashcardIndex(prev => prev - 1);
                }}
                className="mt-6 flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium"
              >
                <Trash2 size={14} /> Remove Word
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button onClick={prevCard} className="p-3 rounded-full bg-white border hover:bg-slate-50 shadow-sm">
            <ChevronLeft />
          </button>
          <button
            onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
            className="px-8 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 shadow-md transition"
          >
            {showFlashcardAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
          <button onClick={nextCard} className="p-3 rounded-full bg-white border hover:bg-slate-50 shadow-sm">
            <ChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const AddTextView = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Add New Text</h2>
      <form onSubmit={addNewText} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input required name="title" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g., My Favorite Hobby" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
          <select name="level" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">German Text</label>
          <textarea required name="content" rows="10" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Paste German text here..."></textarea>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => setView('library')} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Text</button>
        </div>
      </form>
    </div>
  );

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
          {view === 'library' && <LibraryView />}
          {view === 'reader' && <ReaderView />}
          {view === 'vocab' && <VocabView />}
          {view === 'add' && <AddTextView />}
          {view === 'generator' && <GeneratorView />}
          {view === 'chat' && <ChatView />}
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
      <FirestoreTest />
      <FirestoreTest />
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