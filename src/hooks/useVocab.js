import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { translateWord } from '../services/translation';

export function useVocab() {
    const { currentUser } = useAuth();
    const [savedVocab, setSavedVocab] = useState({});
    const [translatingWord, setTranslatingWord] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setSavedVocab({});
            return;
        }

        const vocabRef = collection(db, 'users', currentUser.uid, 'vocab');
        const unsubscribe = onSnapshot(vocabRef, (snapshot) => {
            const vocabObj = {};
            snapshot.docs.forEach(doc => {
                vocabObj[doc.id] = doc.data();
            });
            setSavedVocab(vocabObj);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const toggleWord = async (originalToken, contextSentence = "Custom", sourceTextId = null, sourceTextTitle = null) => {
        if (!currentUser) return null;

        // Clean word for storage key (remove punctuation/case)
        const cleanWord = originalToken.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (!cleanWord || cleanWord.length < 2) return null;

        const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', cleanWord);

        if (savedVocab[cleanWord]) {
            await deleteDoc(vocabRef);
            return null;
        } else {
            try {
                setTranslatingWord(cleanWord);

                let translation = "";
                try {
                    console.log("[toggleWord] Fetching translation for:", cleanWord);
                    translation = await translateWord(cleanWord, contextSentence);
                    console.log("[toggleWord] Translation received:", translation);
                } catch (err) {
                    console.error("Translation error", err);
                }

                await setDoc(vocabRef, {
                    definition: translation,
                    context: contextSentence,
                    sourceTextId: sourceTextId,
                    sourceTextTitle: sourceTextTitle,
                    deck: sourceTextTitle || 'General',
                    createdAt: serverTimestamp()
                });

                // Optimistic update not strictly needed due to onSnapshot, but good for immediate feedback if snapshot is slow
                // But onSnapshot is usually fast enough. Let's rely on onSnapshot to avoid state sync issues.

                return translation;
            } catch (error) {
                console.error("Error saving word:", error);
                alert("Could not save word. Check console for details.");
                return null;
            } finally {
                setTranslatingWord(null);
            }
        }
    };

    const updateDefinition = async (word, def) => {
        if (!currentUser) return;
        // Optimistic update
        setSavedVocab(prev => ({
            ...prev,
            [word]: { ...prev[word], definition: def }
        }));

        const vocabRef = doc(db, 'users', currentUser.uid, 'vocab', word);
        await setDoc(vocabRef, { definition: def }, { merge: true });
    };

    const deleteWord = async (word) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'vocab', word));
        } catch (error) {
            console.error("Error deleting word:", error);
            throw error;
        }
    };

    return { savedVocab, toggleWord, updateDefinition, deleteWord, translatingWord };
}
