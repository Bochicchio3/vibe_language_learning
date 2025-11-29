import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export function useLibrary() {
    const { currentUser } = useAuth();

    const saveText = async ({ title, content, level }) => {
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
    };

    const deleteText = async (textId) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'texts', textId));
        } catch (error) {
            console.error("Error deleting text:", error);
            throw error;
        }
    };

    const toggleReadStatus = async (textId, isRead) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'texts', textId), {
                isRead: isRead
            });
        } catch (error) {
            console.error("Error updating read status:", error);
            throw error;
        }
    };

    return { saveText, deleteText, toggleReadStatus };
}
