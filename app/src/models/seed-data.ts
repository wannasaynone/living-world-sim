import type { Character, Location, WorldObject, Activity, Topic, Action } from './types';

// ===== Topics =====
export const seedTopics: Topic[] = [
    {
        id: 'topic-weather',
        name: '天氣',
        category: '日常',
        moodTone: 'neutral',
        baseWeight: 50,
        personalityAffinity: { I: 0, E: 10, S: 20, N: 0, T: 0, F: 0, J: 0, P: 0 },
    },
    {
        id: 'topic-food',
        name: '美食',
        category: '日常',
        moodTone: 'positive',
        baseWeight: 75,
        personalityAffinity: { I: 0, E: 15, S: 25, N: 0, T: 0, F: 20, J: 0, P: 0 },
    },
    {
        id: 'topic-philosophy',
        name: '哲學',
        category: '知識',
        moodTone: 'neutral',
        baseWeight: 35,
        personalityAffinity: { I: 20, E: 0, S: 0, N: 35, T: 20, F: 0, J: 0, P: 0 },
    },
    {
        id: 'topic-gossip',
        name: '八卦',
        category: '社交',
        moodTone: 'positive',
        baseWeight: 65,
        personalityAffinity: { I: -15, E: 30, S: 0, N: 0, T: 0, F: 25, J: 0, P: 10 },
    },
    {
        id: 'topic-work',
        name: '工作壓力',
        category: '生活',
        moodTone: 'negative',
        baseWeight: 20,
        personalityAffinity: { I: 0, E: 0, S: 15, N: 0, T: 10, F: 0, J: 20, P: -10 },
    },
];

// ===== Actions =====
export const seedActions: Action[] = [
    {
        id: 'action-read-book',
        name: '閱讀書籍',
        sourceType: 'object',
        sourceId: 'obj-bookshelf',
        effects: { mood: 5, energy: -5 },
        topicIds: ['topic-philosophy'],
    },
    {
        id: 'action-make-coffee',
        name: '泡咖啡',
        sourceType: 'object',
        sourceId: 'obj-coffee-machine',
        effects: { energy: 15, mood: 5 },
        topicIds: ['topic-food'],
    },
    {
        id: 'action-play-chess',
        name: '下棋',
        sourceType: 'object',
        sourceId: 'obj-chess-set',
        effects: { mood: 10, energy: -10 },
        topicIds: ['topic-philosophy'],
    },
];

// ===== Activities =====
export const seedActivities: Activity[] = [
    {
        id: 'act-reading-club',
        name: '讀書會',
        baseWeight: 45,
        locationIds: ['loc-library'],
        topicIds: ['topic-philosophy', 'topic-work'],
        effect: { mood: 10, energy: -10 },
        personalityAffinity: { I: 10, E: 0, S: 0, N: 25, T: 15, F: 0, J: 20, P: 0 },
    },
    {
        id: 'act-tea-time',
        name: '下午茶',
        baseWeight: 70,
        locationIds: ['loc-cafe'],
        topicIds: ['topic-food', 'topic-gossip'],
        effect: { mood: 15, energy: 5 },
        personalityAffinity: { I: -10, E: 30, S: 10, N: 0, T: 0, F: 20, J: 0, P: 15 },
    },
    {
        id: 'act-quiet-study',
        name: '安靜自習',
        baseWeight: 30,
        locationIds: ['loc-library'],
        topicIds: ['topic-philosophy'],
        effect: { mood: 5, energy: -15 },
        personalityAffinity: { I: 30, E: -20, S: 0, N: 15, T: 20, F: 0, J: 25, P: 0 },
    },
];

// ===== Objects =====
export const seedObjects: WorldObject[] = [
    {
        id: 'obj-bookshelf',
        name: '書架',
        locationId: 'loc-library',
        actionIds: ['action-read-book'],
        personalityAffinity: { I: 25, E: 0, S: 0, N: 20, T: 15, F: 0, J: 0, P: 0 },
    },
    {
        id: 'obj-coffee-machine',
        name: '咖啡機',
        locationId: 'loc-cafe',
        actionIds: ['action-make-coffee'],
        personalityAffinity: { I: 0, E: 10, S: 20, N: 0, T: 0, F: 10, J: 0, P: 0 },
    },
    {
        id: 'obj-chess-set',
        name: '棋盤',
        locationId: 'loc-cafe',
        actionIds: ['action-play-chess'],
        personalityAffinity: { I: 10, E: 0, S: 0, N: 15, T: 30, F: 0, J: 10, P: 0 },
    },
];

// ===== Locations =====
export const seedLocations: Location[] = [
    {
        id: 'loc-library',
        name: '圖書館',
        visitWeight: 40,
        activityIds: ['act-reading-club', 'act-quiet-study'],
        objectIds: ['obj-bookshelf'],
        personalityAffinity: { I: 30, E: -10, S: 0, N: 20, T: 15, F: 0, J: 15, P: 0 },
    },
    {
        id: 'loc-cafe',
        name: '咖啡廳',
        visitWeight: 70,
        activityIds: ['act-tea-time'],
        objectIds: ['obj-coffee-machine', 'obj-chess-set'],
        personalityAffinity: { I: -10, E: 30, S: 10, N: 0, T: 0, F: 15, J: 0, P: 10 },
    },
];

// ===== Characters =====
export const seedCharacters: Character[] = [
    {
        id: 'char-alice',
        name: '小愛',
        locationId: 'loc-library',
        personality: { I: 75, E: 30, S: 40, N: 70, T: 65, F: 40, J: 70, P: 35 },
        temporaryModifiers: [],
        mood: 60,
        energy: 80,
        currentActivityId: null,
        recentCharacterId: null,
        recentTopicId: null,
        topicPreferences: ['topic-philosophy', 'topic-food'],
        relationshipScores: { 'char-bob': 50, 'char-carol': 30 },
    },
    {
        id: 'char-bob',
        name: '阿博',
        locationId: 'loc-cafe',
        personality: { I: 25, E: 80, S: 60, N: 35, T: 30, F: 75, J: 30, P: 70 },
        temporaryModifiers: [],
        mood: 75,
        energy: 70,
        currentActivityId: null,
        recentCharacterId: null,
        recentTopicId: null,
        topicPreferences: ['topic-gossip', 'topic-food', 'topic-weather'],
        relationshipScores: { 'char-alice': 50, 'char-carol': 60 },
    },
    {
        id: 'char-carol',
        name: '小卡',
        locationId: 'loc-cafe',
        personality: { I: 50, E: 55, S: 50, N: 50, T: 50, F: 55, J: 55, P: 45 },
        temporaryModifiers: [],
        mood: 50,
        energy: 60,
        currentActivityId: null,
        recentCharacterId: null,
        recentTopicId: null,
        topicPreferences: ['topic-weather', 'topic-work', 'topic-gossip'],
        relationshipScores: { 'char-alice': 30, 'char-bob': 60 },
    },
];