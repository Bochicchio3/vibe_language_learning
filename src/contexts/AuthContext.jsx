import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userStats, setUserStats] = useState({ xp: 0, level: 1, streak: 0, lastActiveDate: null });
    const [loading, setLoading] = useState(true);

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    function googleLogin() {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    // Fetch user stats when user logs in
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                try {
                    const { doc, getDoc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase');

                    const statsRef = doc(db, 'users', user.uid, 'stats', 'main');
                    const statsSnap = await getDoc(statsRef);

                    if (statsSnap.exists()) {
                        setUserStats(statsSnap.data());
                    } else {
                        // Initialize stats if not exist
                        const initialStats = { xp: 0, level: 1, streak: 0, lastActiveDate: null };
                        await setDoc(statsRef, initialStats);
                        setUserStats(initialStats);
                    }
                } catch (error) {
                    console.error("Error fetching user stats:", error);
                }
            } else {
                setUserStats({ xp: 0, level: 1, streak: 0, lastActiveDate: null });
            }

            setLoading(false);
        });

        return unsubscribeAuth;
    }, []);

    const updateStats = async (actionType, xpAmount) => {
        if (!currentUser) return;

        try {
            const { doc, updateDoc, increment, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('../firebase');

            const statsRef = doc(db, 'users', currentUser.uid, 'stats', 'main');
            const today = new Date().toISOString().split('T')[0];

            // Optimistic update
            setUserStats(prev => {
                const newXp = (prev.xp || 0) + xpAmount;
                let newStreak = prev.streak || 0;

                // Simple streak logic: if lastActiveDate is yesterday, increment. 
                // If today, keep same. If older, reset to 1.
                // For simplicity in this iteration, we'll just handle the "active today" check loosely
                // Ideally we compare dates.

                if (prev.lastActiveDate !== today) {
                    // Check if yesterday was active to increment, else reset
                    // For now, let's just increment if it's a new day for simplicity of the prototype
                    // Real implementation needs date diff check
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (prev.lastActiveDate === yesterdayStr) {
                        newStreak += 1;
                    } else if (prev.lastActiveDate !== today) {
                        newStreak = 1; // Reset or start new
                    }
                }

                return {
                    ...prev,
                    xp: newXp,
                    streak: newStreak,
                    lastActiveDate: today
                };
            });

            await updateDoc(statsRef, {
                xp: increment(xpAmount),
                lastActiveDate: today,
                // We'd need to calculate streak server side or be careful here. 
                // For now, let's trust the client optimistic calc for the prototype or just update lastActive
                // A proper implementation would use a transaction.
            });

        } catch (error) {
            console.error("Error updating stats:", error);
        }
    };

    const value = {
        currentUser,
        userStats,
        updateStats,
        signup,
        login,
        logout,
        googleLogin
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
