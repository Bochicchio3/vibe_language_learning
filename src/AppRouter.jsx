import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginView from './components/views/LoginView';

import LibraryView from './components/views/LibraryView';
import ReaderView from './components/views/ReaderView';
import ImportView from './components/views/ImportView';
import GeneratorView from './components/views/GeneratorView';
import BooksView from './components/views/BooksView';
import BookDetailView from './components/views/BookDetailView';
import ChapterReader from './components/views/ChapterReader';
import VocabDashboard from './components/views/VocabDashboard';
import FlashcardView from './components/views/FlashcardView';
import SpeakingPractice from './components/views/SpeakingPractice';
import WritingPractice from './components/views/WritingPractice';
import GrammarView from './components/views/GrammarView';
import ChatView from './components/views/ChatView';
import ProgressView from './components/views/ProgressView';
import ImprovementsView from './components/views/ImprovementsView';

export default function AppRouter() {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <LoginView />;
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/library" replace />} />
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
