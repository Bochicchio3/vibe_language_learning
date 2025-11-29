import { useState, useEffect } from 'react';

// Simple level formula: Level = floor(sqrt(XP / 100)) + 1
// XP for Level L = 100 * (L-1)^2
export const calculateLevel = (xp) => {
    if (!xp || xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const calculateNextLevelXp = (level) => {
    return 100 * Math.pow(level, 2);
};

export const useGamification = (userStats) => {
    const [level, setLevel] = useState(1);
    const [nextLevelXp, setNextLevelXp] = useState(100);
    const [progressToNext, setProgressToNext] = useState(0);

    useEffect(() => {
        if (userStats) {
            const currentLevel = calculateLevel(userStats.xp || 0);
            const nextXp = calculateNextLevelXp(currentLevel);
            const prevLevelXp = calculateNextLevelXp(currentLevel - 1);

            // Calculate progress within the current level
            const levelRange = nextXp - prevLevelXp;
            const xpInLevel = (userStats.xp || 0) - prevLevelXp;

            setLevel(currentLevel);
            setNextLevelXp(nextXp);
            setProgressToNext(Math.floor((xpInLevel / levelRange) * 100));
        }
    }, [userStats]);

    return {
        level,
        nextLevelXp,
        progressToNext
    };
};
