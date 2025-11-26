import { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { adaptContent } from '../services/ollama';

export function useImporter() {
    const { currentUser } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [processLogs, setProcessLogs] = useState([]);
    const [abortController, setAbortController] = useState(null);

    const startBackgroundImport = async (title, level, chunks, shouldAdapt, model, targetLanguage = "German", onSuccess) => {
        if (!currentUser) return;

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

            // 2. Callback for navigation/success
            if (onSuccess) onSuccess(newBook);

            setIsSyncing(false); // UI sync done, background process continues

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

    const stopProcessing = () => {
        if (abortController) {
            abortController.abort();
        }
    };

    return { startBackgroundImport, isSyncing, processLogs, stopProcessing };
}
