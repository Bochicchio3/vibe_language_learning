import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginView from './components/LoginView';
import JourneyView from './components/JourneyView';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import ImportView from './components/ImportView';
import GeneratorView from './components/GeneratorView';
import BooksView from './components/BooksView';
import BookDetailView from './components/BookDetailView';
import ChapterReader from './components/ChapterReader';
import VocabDashboard from './components/VocabDashboard';
import FlashcardView from './components/FlashcardView';
import SpeakingPractice from './components/SpeakingPractice';
import WritingPractice from './components/WritingPractice';
import GrammarView from './components/GrammarView';
import ChatView from './components/ChatView';
import ProgressView from './components/ProgressView';
import ImprovementsView from './components/ImprovementsView';

export default function AppRouter() {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <LoginView />;
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<JourneyView />} />
                <Route path="library" element={<LibraryView />} />
                <Route path="read/:id" element={<ReaderView />} />
                <Route path="import" element={<ImportView />} />
                <Route path="generator" element={<GeneratorView />} />
                <Route path="books" element={<BooksView />} />
                <Route path="book/:id" element={<BookDetailView />} />
                <Route path="book/:bookId/read/:chapterId" element={<ChapterReader />} />
                <Route path="vocab" element={<VocabDashboard />} />
                <Route path="flashcards" element={<FlashcardView />} />
                <Route path="speaking" element={<SpeakingPractice />} />
                <Route path="writing" element={<WritingPractice />} />
                <Route path="grammar" element={<GrammarView />} />
                <Route path="chat" element={<ChatView />} />
                <Route path="progress" element={<ProgressView />} />
                <Route path="improvements" element={<ImprovementsView />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}
