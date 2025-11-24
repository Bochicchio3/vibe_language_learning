export const JOURNEY_NODES = [
    {
        id: 'start',
        title: 'Welcome to Vibe',
        description: 'Start your German journey here.',
        type: 'lesson',
        xpReward: 10,
        unlockCriteria: [],
        position: { x: 50, y: 10 },
        icon: '👋'
    },
    {
        id: 'a1_basics_1',
        title: 'The Basics',
        description: 'Learn greetings and basic phrases.',
        type: 'unit',
        xpReward: 50,
        unlockCriteria: ['start'],
        position: { x: 50, y: 30 },
        icon: 'abc'
    },
    {
        id: 'a1_intro_story',
        title: 'First Story',
        description: 'Read a simple story about a morning routine.',
        type: 'story',
        xpReward: 20,
        unlockCriteria: ['a1_basics_1'],
        position: { x: 30, y: 50 },
        icon: '📖'
    },
    {
        id: 'a1_vocab_food',
        title: 'Food & Drink',
        description: 'Learn essential vocabulary for eating.',
        type: 'vocab',
        xpReward: 30,
        unlockCriteria: ['a1_basics_1'],
        position: { x: 70, y: 50 },
        icon: '🍎'
    },
    {
        id: 'a1_checkpoint_1',
        title: 'Checkpoint 1',
        description: 'Test your knowledge to unlock the next section.',
        type: 'checkpoint',
        xpReward: 100,
        unlockCriteria: ['a1_intro_story', 'a1_vocab_food'],
        position: { x: 50, y: 70 },
        icon: '🏆'
    },
    {
        id: 'a2_travel',
        title: 'Travel Plans',
        description: 'Discuss travel and transport.',
        type: 'unit',
        xpReward: 60,
        unlockCriteria: ['a1_checkpoint_1'],
        position: { x: 50, y: 90 },
        icon: '✈️'
    }
];
