import { useState } from 'react';
import { booksAPI } from '../services/api';

export function useImporter() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [processLogs, setProcessLogs] = useState([]);

    const uploadBook = async ({ file, title, level, shouldAdapt, model, targetLanguage, onSuccess }) => {
        setIsSyncing(true);
        setProcessLogs([]);

        try {
            const response = await booksAPI.uploadBook({
                file,
                title,
                level,
                shouldAdapt,
                model,
                targetLanguage
            });

            console.log("Book uploaded successfully:", response);

            if (onSuccess) {
                onSuccess({
                    id: response.book_id,
                    title,
                    level,
                    status: 'processing'
                });
            }

            // Poll for status or just let the user know it's processing
            // For now, we'll just finish the sync state
            setIsSyncing(false);

        } catch (error) {
            console.error("Import failed:", error);
            alert("Failed to import book: " + error.message);
            setIsSyncing(false);
        }
    };

    // Deprecated client-side import
    const startBackgroundImport = async () => {
        console.warn("startBackgroundImport is deprecated. Use uploadBook instead.");
    };

    return { uploadBook, startBackgroundImport, isSyncing, processLogs };
}
