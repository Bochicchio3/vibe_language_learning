import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, MessageCircle, Trash2, MessageSquareWarning } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { recordActivitySession, CATEGORIES } from '../services/activityTracker';
import FeedbackModal from './FeedbackModal';

export default function ChatView({ isWidget = false, initialMessage = '' }) {
    const { currentUser } = useAuth();
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState(initialMessage);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [sessionStart] = useState(Date.now());
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    // Initial Message Handling
    useEffect(() => {
        if (initialMessage) {
            setInput(initialMessage);
            // If we have an active conversation, we'll just append to it.
            // If not, we'll create a new one when the user sends.
        }
    }, [initialMessage]);

    // Record chat session on unmount
    useEffect(() => {
        return () => {
            if (sessionStart && currentUser) {
                const duration = Math.floor((Date.now() - sessionStart) / 1000);
                if (duration >= 10) {
                    recordActivitySession(currentUser.uid, CATEGORIES.CHAT, duration)
                        .catch(err => console.error('Error recording chat session:', err));
                }
            }
        };
    }, [sessionStart, currentUser]);

    // Fetch Models
    useEffect(() => {
        fetchModels();
    }, []);

    // Fetch Conversations & Migration
    useEffect(() => {
        if (!currentUser) return;

        const conversationsRef = collection(db, 'users', currentUser.uid, 'conversations');
        const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const loadedConversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setConversations(loadedConversations);

            // Migration Check: If no conversations exist, check for legacy chats
            if (loadedConversations.length === 0) {
                const legacyChatsRef = collection(db, 'users', currentUser.uid, 'chats');
                const legacySnapshot = await getDocs(legacyChatsRef);

                if (!legacySnapshot.empty) {
                    console.log("Migrating legacy chats...");
                    // Create a "Previous Chat" conversation
                    const newConvRef = await addDoc(conversationsRef, {
                        title: "Previous Chat",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    // Move messages
                    const batch = []; // Firestore batching would be better but doing simple loop for now
                    for (const docSnapshot of legacySnapshot.docs) {
                        const msgData = docSnapshot.data();
                        await addDoc(collection(db, 'users', currentUser.uid, 'conversations', newConvRef.id, 'messages'), msgData);
                        await deleteDoc(docSnapshot.ref); // Delete old
                    }
                    setActiveConversationId(newConvRef.id);
                } else {
                    // No legacy chats, start fresh
                    createNewChat();
                }
            } else if (!activeConversationId) {
                // Select most recent
                setActiveConversationId(loadedConversations[0].id);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Sync Messages for Active Conversation
    useEffect(() => {
        if (!currentUser || !activeConversationId) {
            setMessages([]);
            return;
        }

        const messagesRef = collection(db, 'users', currentUser.uid, 'conversations', activeConversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(loadedMessages);
        });

        return () => unsubscribe();
    }, [currentUser, activeConversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchModels = async () => {
        try {
            const response = await fetch('/api/tags');
            if (response.ok) {
                const data = await response.json();
                setModels(data.models || []);
                if (data.models && data.models.length > 0) {
                    setSelectedModel(data.models[0].name);
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const createNewChat = async () => {
        if (!currentUser) return;
        try {
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'conversations'), {
                title: "New Chat",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setActiveConversationId(docRef.id);
            // On mobile/widget, we might want to focus input
        } catch (error) {
            console.error("Error creating chat:", error);
        }
    };

    const deleteConversation = async (e, convId) => {
        e.stopPropagation();
        if (!confirm("Delete this conversation?")) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'conversations', convId));
            if (activeConversationId === convId) {
                setActiveConversationId(null);
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedModel || !currentUser) return;

        // Ensure we have an active conversation
        let currentConvId = activeConversationId;
        if (!currentConvId) {
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'conversations'), {
                title: input.slice(0, 30) + "...",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            currentConvId = docRef.id;
            setActiveConversationId(currentConvId);
        }

        const userContent = input;
        setInput('');
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage('');

        try {
            // 1. Save User Message
            await addDoc(collection(db, 'users', currentUser.uid, 'conversations', currentConvId, 'messages'), {
                role: 'user',
                content: userContent,
                createdAt: serverTimestamp()
            });

            // Update conversation title if it's "New Chat"
            const conv = conversations.find(c => c.id === currentConvId);
            if (conv && conv.title === "New Chat") {
                await updateDoc(doc(db, 'users', currentUser.uid, 'conversations', currentConvId), {
                    title: userContent.slice(0, 30) + "...",
                    updatedAt: serverTimestamp()
                });
            } else {
                await updateDoc(doc(db, 'users', currentUser.uid, 'conversations', currentConvId), {
                    updatedAt: serverTimestamp()
                });
            }

            // 2. Start Streaming Request
            const contextMessages = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            contextMessages.push({ role: 'user', content: userContent });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: contextMessages,
                    stream: true,
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullAssistantResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            const content = json.message.content;
                            fullAssistantResponse += content;
                            setStreamingMessage(prev => prev + content);
                        }
                    } catch (e) { console.error(e); }
                }
            }

            // 3. Save Assistant Message
            await addDoc(collection(db, 'users', currentUser.uid, 'conversations', currentConvId, 'messages'), {
                role: 'assistant',
                content: fullAssistantResponse,
                createdAt: serverTimestamp()
            });

        } catch (error) {
            console.error('Error sending message:', error);
            await addDoc(collection(db, 'users', currentUser.uid, 'conversations', currentConvId, 'messages'), {
                role: 'assistant',
                content: 'Error: Could not connect to Ollama.',
                createdAt: serverTimestamp()
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            setStreamingMessage('');
        }
    };

    return (
        <div className={`${isWidget ? 'h-full rounded-none' : 'max-w-6xl mx-auto shadow-sm rounded-xl h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]'} bg-white overflow-hidden flex`}>
            {/* Sidebar - Hidden on small widgets/mobile unless toggled (simplified for now: always show on desktop, hide on widget) */}
            {!isWidget && (
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col hidden md:flex">
                    <div className="p-4 border-b border-slate-200">
                        <button
                            onClick={createNewChat}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={18} /> New Chat
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-1">
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group ${activeConversationId === conv.id ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-100'}`}
                            >
                                <div className="truncate text-sm font-medium text-slate-700 flex-grow">
                                    {conv.title}
                                </div>
                                <button
                                    onClick={(e) => deleteConversation(e, conv.id)}
                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-grow flex flex-col h-full">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isWidget && (
                            <button onClick={createNewChat} className="p-1 hover:bg-slate-200 rounded text-slate-500" title="New Chat">
                                <MessageCircle size={18} />
                            </button>
                        )}
                        <Bot className="text-indigo-600" />
                        <h2 className="text-xl font-bold text-slate-800">
                            {isWidget ? 'AI Chat' : (conversations.find(c => c.id === activeConversationId)?.title || 'AI Chat')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
                        >
                            {models.length === 0 && <option value="">Loading...</option>}
                            {models.map(model => (
                                <option key={model.name} value={model.name}>{model.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowFeedbackModal(true)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
                            title="Report Issue"
                        >
                            <MessageSquareWarning size={18} />
                        </button>
                        <button onClick={fetchModels} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {messages.length === 0 && !isStreaming ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <MessageCircle size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">Start a conversation</p>
                            <p className="text-sm">Select a model and say hello!</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <Bot size={18} className="text-indigo-600" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <User size={18} className="text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isStreaming && (
                                <div className="flex gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Bot size={18} className="text-indigo-600" />
                                    </div>
                                    <div className="max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm">
                                        {streamingMessage}
                                        <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-200">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-grow p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            disabled={isLoading && !isStreaming}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || (isLoading && !isStreaming)}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isLoading && !isStreaming ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </form>
                </div>
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                context="ChatView"
            />
        </div>
    );
}
