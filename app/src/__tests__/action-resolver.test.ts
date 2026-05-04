import { describe, it, expect } from 'vitest';
import { weightedPickTopic, buildCandidateActions } from '../engine/action-resolver';
import { calculatePersonalityAffinityBonus } from '../engine/personality-utils';
import type { Topic, Character, WorldState, Personality, PersonalityAffinity } from '../models/types';

// ===== calculatePersonalityAffinityBonus =====

describe('calculatePersonalityAffinityBonus', () => {
    const neutralPersonality: Personality = { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };

    it('returns bonus 0 and empty summary when affinity is undefined', () => {
        const result = calculatePersonalityAffinityBonus(neutralPersonality, undefined);
        expect(result.bonus).toBe(0);
        expect(result.summary).toBe('');
    });

    it('returns bonus 0 and empty summary when affinity is null', () => {
        const result = calculatePersonalityAffinityBonus(neutralPersonality, null);
        expect(result.bonus).toBe(0);
        expect(result.summary).toBe('');
    });

    it('returns bonus 0 when all affinity values are 0', () => {
        const affinity: PersonalityAffinity = { I: 0, E: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
        const result = calculatePersonalityAffinityBonus(neutralPersonality, affinity);
        expect(result.bonus).toBe(0);
        expect(result.summary).toBe('');
    });

    it('returns bonus 0 when personality is neutral (50) regardless of affinity', () => {
        const affinity: PersonalityAffinity = { I: 30, E: 30, S: 30, N: 30, T: 30, F: 30, J: 30, P: 30 };
        const result = calculatePersonalityAffinityBonus(neutralPersonality, affinity);
        expect(result.bonus).toBe(0);
    });

    it('positive affinity + high personality value = positive bonus', () => {
        const pers: Personality = { I: 50, E: 100, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const affinity: Partial<PersonalityAffinity> = { E: 30 };
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // (100-50)/50 * 30 = 1 * 30 = 30
        expect(result.bonus).toBeCloseTo(30);
        expect(result.summary).toContain('E');
        expect(result.summary).toContain('+30.0');
    });

    it('positive affinity + low personality value = negative bonus', () => {
        const pers: Personality = { I: 50, E: 0, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const affinity: Partial<PersonalityAffinity> = { E: 30 };
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // (0-50)/50 * 30 = -1 * 30 = -30
        expect(result.bonus).toBeCloseTo(-30);
        expect(result.summary).toContain('E');
        expect(result.summary).toContain('-30.0');
    });

    it('negative affinity + high personality value = negative bonus', () => {
        const pers: Personality = { I: 50, E: 100, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const affinity: Partial<PersonalityAffinity> = { E: -30 };
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // (100-50)/50 * (-30) = 1 * (-30) = -30
        expect(result.bonus).toBeCloseTo(-30);
    });

    it('sums contributions from multiple traits', () => {
        const pers: Personality = { I: 50, E: 100, S: 50, N: 100, T: 50, F: 50, J: 50, P: 50 };
        const affinity: Partial<PersonalityAffinity> = { E: 30, N: 20 };
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // E: (100-50)/50 * 30 = 30, N: (100-50)/50 * 20 = 20 → total 50
        expect(result.bonus).toBeCloseTo(50);
    });

    it('handles missing traits in partial affinity (treats as 0)', () => {
        const pers: Personality = { I: 100, E: 100, S: 100, N: 100, T: 100, F: 100, J: 100, P: 100 };
        const affinity: Partial<PersonalityAffinity> = { E: 10 }; // only E
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // Only E contributes: (100-50)/50 * 10 = 10
        expect(result.bonus).toBeCloseTo(10);
    });

    it('clamps affinity values that exceed range', () => {
        const pers: Personality = { I: 50, E: 100, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const affinity: Partial<PersonalityAffinity> = { E: 200 }; // exceeds 100
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // clamped to 100: (100-50)/50 * 100 = 100
        expect(result.bonus).toBeCloseTo(100);
    });

    it('handles NaN affinity values as 0', () => {
        const pers: Personality = { I: 100, E: 100, S: 100, N: 100, T: 100, F: 100, J: 100, P: 100 };
        const affinity = { E: NaN, I: 10 } as any;
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // E: NaN → 0 (skipped), I: (100-50)/50 * 10 = 10
        expect(result.bonus).toBeCloseTo(10);
        expect(isNaN(result.bonus)).toBe(false);
    });

    it('handles Infinity affinity values by clamping', () => {
        const pers: Personality = { I: 50, E: 100, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
        const affinity = { E: Infinity } as any;
        const result = calculatePersonalityAffinityBonus(pers, affinity);
        // Infinity → not finite → 0
        expect(result.bonus).toBe(0);
        expect(isNaN(result.bonus)).toBe(false);
    });
});

// ===== weightedPickTopic =====

describe('weightedPickTopic', () => {
    const topics: Topic[] = [
        { id: 't1', name: 'A', category: 'x', moodTone: 'neutral', baseWeight: 90 },
        { id: 't2', name: 'B', category: 'x', moodTone: 'neutral', baseWeight: 10 },
        { id: 't3', name: 'C', category: 'x', moodTone: 'neutral', baseWeight: 0 },
    ];

    it('returns undefined for empty candidates', () => {
        expect(weightedPickTopic([], topics)).toBeUndefined();
    });

    it('returns undefined when no topic ids match', () => {
        expect(weightedPickTopic(['non-existent'], topics)).toBeUndefined();
    });

    it('returns a valid topic id from candidates', () => {
        const result = weightedPickTopic(['t1', 't2'], topics);
        expect(['t1', 't2']).toContain(result);
    });

    it('falls back to uniform random when all weights are 0', () => {
        const zeroTopics: Topic[] = [
            { id: 'z1', name: 'Z1', category: 'x', moodTone: 'neutral', baseWeight: 0 },
            { id: 'z2', name: 'Z2', category: 'x', moodTone: 'neutral', baseWeight: 0 },
        ];
        const result = weightedPickTopic(['z1', 'z2'], zeroTopics);
        expect(['z1', 'z2']).toContain(result);
    });

    it('uses default weight 50 when baseWeight is missing', () => {
        const legacyTopics: Topic[] = [
            { id: 'legacy', name: 'Legacy', category: 'x', moodTone: 'neutral' } as Topic,
        ];
        const result = weightedPickTopic(['legacy'], legacyTopics);
        expect(result).toBe('legacy');
    });

    it('high-weight topic is picked more often (statistical)', () => {
        // Run 200 picks, high-weight topic should dominate
        let highCount = 0;
        for (let i = 0; i < 200; i++) {
            const result = weightedPickTopic(['t1', 't2'], topics);
            if (result === 't1') highCount++;
        }
        // t1 has weight 90 vs t2 weight 10, expect > 60% for t1
        expect(highCount).toBeGreaterThan(120);
    });

    it('topic with high personality affinity match is picked more often', () => {
        const topicsWithAffinity: Topic[] = [
            {
                id: 'tp1', name: 'Philosophy', category: 'x', moodTone: 'neutral', baseWeight: 50,
                personalityAffinity: { I: 0, E: 0, S: 0, N: 40, T: 0, F: 0, J: 0, P: 0 },
            },
            {
                id: 'tp2', name: 'Gossip', category: 'x', moodTone: 'neutral', baseWeight: 50,
                personalityAffinity: { I: 0, E: 0, S: 0, N: -20, T: 0, F: 0, J: 0, P: 0 },
            },
        ];
        const nHighPers: Personality = { I: 50, E: 50, S: 50, N: 100, T: 50, F: 50, J: 50, P: 50 };
        // tp1 weight: 50 + (100-50)/50 * 40 = 50 + 40 = 90
        // tp2 weight: 50 + (100-50)/50 * (-20) = 50 - 20 = 30

        let tp1Count = 0;
        for (let i = 0; i < 300; i++) {
            const result = weightedPickTopic(['tp1', 'tp2'], topicsWithAffinity, nHighPers);
            if (result === 'tp1') tp1Count++;
        }
        // tp1 should be picked much more often (75% expected)
        expect(tp1Count).toBeGreaterThan(150);
    });
});

// ===== buildCandidateActions =====

describe('buildCandidateActions', () => {
    function makeCharacter(overrides?: Partial<Character>): Character {
        return {
            id: 'char-test',
            name: '測試角色',
            locationId: 'loc-a',
            personality: { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 },
            temporaryModifiers: [],
            mood: 50,
            energy: 50,
            currentActivityId: null,
            recentCharacterId: null,
            recentTopicId: null,
            topicPreferences: [],
            relationshipScores: {},
            ...overrides,
        };
    }

    function makeWorld(overrides?: Partial<WorldState>): WorldState {
        return {
            worldName: 'Test',
            currentTick: 0,
            timeLabel: '第1天 06:00',
            characters: [makeCharacter()],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 30, activityIds: ['act-1'], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 90, activityIds: [], objectIds: [] },
            ],
            objects: [],
            activities: [
                { id: 'act-1', name: '活動1', baseWeight: 80, locationIds: ['loc-a'], topicIds: [], effect: {} },
            ],
            topics: [],
            actions: [],
            eventLog: [],
            ...overrides,
        };
    }

    it('move candidates include weightSummary referencing visitWeight', () => {
        const world = makeWorld();
        const candidates = buildCandidateActions(world.characters[0], world);
        const moveCandidates = candidates.filter((c) => c.type === 'move');
        expect(moveCandidates.length).toBeGreaterThan(0);
        for (const mc of moveCandidates) {
            expect(mc.weightSummary).toBeDefined();
            expect(mc.weightSummary).toContain('地點吸引力');
        }
    });

    it('high visitWeight location generates higher move weight on average', () => {
        const world = makeWorld();
        let totalWeightHigh = 0;
        const runs = 50;
        for (let i = 0; i < runs; i++) {
            const candidates = buildCandidateActions(world.characters[0], world);
            const moveToB = candidates.find((c) => c.type === 'move' && c.locationId === 'loc-b');
            totalWeightHigh += moveToB?.weight ?? 0;
        }
        const avgHigh = totalWeightHigh / runs;
        expect(avgHigh).toBeGreaterThan(30);
    });

    it('activity candidates include weightSummary referencing baseWeight', () => {
        const world = makeWorld();
        const candidates = buildCandidateActions(world.characters[0], world);
        const actCandidates = candidates.filter((c) => c.type === 'activity');
        expect(actCandidates.length).toBeGreaterThan(0);
        for (const ac of actCandidates) {
            expect(ac.weightSummary).toBeDefined();
            expect(ac.weightSummary).toContain('活動基礎權重');
        }
    });

    it('always includes idle candidate', () => {
        const world = makeWorld();
        const candidates = buildCandidateActions(world.characters[0], world);
        const idle = candidates.find((c) => c.type === 'idle');
        expect(idle).toBeDefined();
    });

    it('does not crash with legacy data missing weights', () => {
        const world = makeWorld({
            locations: [
                { id: 'loc-a', name: 'A', activityIds: [], objectIds: [] } as any,
                { id: 'loc-b', name: 'B', activityIds: [], objectIds: [] } as any,
            ],
            activities: [
                { id: 'act-1', name: '活動1', locationIds: ['loc-a'], topicIds: [], effect: {} } as any,
            ],
        });
        const candidates = buildCandidateActions(world.characters[0], world);
        expect(candidates.length).toBeGreaterThan(0);
    });
});

// ===== Content-based personality affinity influence =====

describe('Content-based personality affinity influence', () => {
    function makeCharacter(personality: Partial<Character['personality']>, overrides?: Partial<Character>): Character {
        return {
            id: 'char-test',
            name: '測試角色',
            locationId: 'loc-a',
            personality: { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50, ...personality },
            temporaryModifiers: [],
            mood: 50,
            energy: 50,
            currentActivityId: null,
            recentCharacterId: null,
            recentTopicId: null,
            topicPreferences: [],
            relationshipScores: {},
            ...overrides,
        };
    }

    function getWeight(candidates: ReturnType<typeof buildCandidateActions>, type: string, filter?: (c: any) => boolean): number {
        let matches = candidates.filter((c) => c.type === type);
        if (filter) matches = matches.filter(filter);
        if (matches.length === 0) return 0;
        return matches.reduce((sum, c) => sum + c.weight, 0) / matches.length;
    }

    // --- Location personality affinity ---

    it('location with E affinity: E-high character has higher move weight than E-low character', () => {
        const locWithEAffinity = {
            id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [],
            personalityAffinity: { I: 0, E: 40, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
        };
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [] as Character[],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                locWithEAffinity,
            ],
            objects: [], activities: [], topics: [], actions: [],
        };

        const eHigh = makeCharacter({ E: 90, I: 20 });
        const eLow = makeCharacter({ E: 20, I: 90 });

        const candidatesE = buildCandidateActions(eHigh, { ...world, characters: [eHigh] });
        const candidatesI = buildCandidateActions(eLow, { ...world, characters: [eLow] });

        const moveE = getWeight(candidatesE, 'move', (c) => c.locationId === 'loc-b');
        const moveI = getWeight(candidatesI, 'move', (c) => c.locationId === 'loc-b');
        expect(moveE).toBeGreaterThan(moveI);
    });

    it('move weightSummary contains 地點人格相性 when location has affinity', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ E: 90 })],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                {
                    id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [],
                    personalityAffinity: { I: 0, E: 30, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
                },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const moveToB = candidates.find((c) => c.type === 'move' && c.locationId === 'loc-b');
        expect(moveToB?.weightSummary).toContain('地點人格相性');
    });

    // --- Activity personality affinity ---

    it('activity with J affinity: J-high character has higher activity weight', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [] as Character[],
            locations: [
                {
                    id: 'loc-a', name: 'A', visitWeight: 50,
                    activityIds: ['act-1'], objectIds: [],
                },
            ],
            objects: [],
            activities: [{
                id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'], topicIds: [], effect: {},
                personalityAffinity: { I: 0, E: 0, S: 0, N: 0, T: 0, F: 0, J: 40, P: 0 },
            }],
            topics: [], actions: [],
        };

        const jHigh = makeCharacter({ J: 90, P: 20 });
        const jLow = makeCharacter({ J: 20, P: 90 });

        const candidatesJ = buildCandidateActions(jHigh, { ...world, characters: [jHigh] });
        const candidatesP = buildCandidateActions(jLow, { ...world, characters: [jLow] });

        const actJ = getWeight(candidatesJ, 'activity');
        const actP = getWeight(candidatesP, 'activity');
        expect(actJ).toBeGreaterThan(actP);
    });

    it('activity weightSummary contains 活動人格相性 when activity has affinity', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ J: 90 })],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: [],
            }],
            objects: [],
            activities: [{
                id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'], topicIds: [], effect: {},
                personalityAffinity: { I: 0, E: 0, S: 0, N: 0, T: 0, F: 0, J: 30, P: 0 },
            }],
            topics: [], actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const act = candidates.find((c) => c.type === 'activity');
        expect(act?.weightSummary).toContain('活動人格相性');
    });

    // --- Object personality affinity ---

    it('object with S affinity: S-high character has higher use_object weight', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [] as Character[],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: ['obj-1'],
            }],
            objects: [{
                id: 'obj-1', name: '物件1', locationId: 'loc-a', actionIds: ['action-1'],
                personalityAffinity: { I: 0, E: 0, S: 40, N: 0, T: 0, F: 0, J: 0, P: 0 },
            }],
            activities: [],
            topics: [],
            actions: [{ id: 'action-1', name: '行動1', sourceType: 'object' as const, sourceId: 'obj-1', effects: {}, topicIds: [] }],
        };

        const sHigh = makeCharacter({ S: 90, N: 20 });
        const sLow = makeCharacter({ S: 20, N: 90 });

        const candidatesS = buildCandidateActions(sHigh, { ...world, characters: [sHigh] });
        const candidatesN = buildCandidateActions(sLow, { ...world, characters: [sLow] });

        const objS = getWeight(candidatesS, 'use_object');
        const objN = getWeight(candidatesN, 'use_object');
        expect(objS).toBeGreaterThan(objN);
    });

    it('object weightSummary contains 物件人格相性 when object has affinity', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ S: 90 })],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: ['obj-1'],
            }],
            objects: [{
                id: 'obj-1', name: '物件1', locationId: 'loc-a', actionIds: ['action-1'],
                personalityAffinity: { I: 0, E: 0, S: 30, N: 0, T: 0, F: 0, J: 0, P: 0 },
            }],
            activities: [],
            topics: [],
            actions: [{ id: 'action-1', name: '行動1', sourceType: 'object' as const, sourceId: 'obj-1', effects: {}, topicIds: [] }],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const obj = candidates.find((c) => c.type === 'use_object');
        expect(obj?.weightSummary).toContain('物件人格相性');
    });

    // --- Topic personality affinity ---

    it('topic with N affinity: N-high character gets higher topic weight in pick', () => {
        const topicsWithAffinity: Topic[] = [
            {
                id: 'tp-phil', name: '哲學', category: 'x', moodTone: 'neutral', baseWeight: 50,
                personalityAffinity: { I: 0, E: 0, S: 0, N: 40, T: 0, F: 0, J: 0, P: 0 },
            },
            {
                id: 'tp-gossip', name: '八卦', category: 'x', moodTone: 'neutral', baseWeight: 50,
                personalityAffinity: { I: 0, E: 0, S: 0, N: -20, T: 0, F: 0, J: 0, P: 0 },
            },
        ];
        const nHigh: Personality = { I: 50, E: 50, S: 50, N: 100, T: 50, F: 50, J: 50, P: 50 };

        let philCount = 0;
        for (let i = 0; i < 300; i++) {
            const result = weightedPickTopic(['tp-phil', 'tp-gossip'], topicsWithAffinity, nHigh);
            if (result === 'tp-phil') philCount++;
        }
        expect(philCount).toBeGreaterThan(180); // should be ~75%
    });

    it('topic weightSummary shows 話題人格相性 when topic has affinity', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ N: 90 })],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: [],
            }],
            objects: [],
            activities: [{
                id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'],
                topicIds: ['topic-aff'], effect: {},
            }],
            topics: [{
                id: 'topic-aff', name: '哲學', category: 'x', moodTone: 'neutral' as const, baseWeight: 50,
                personalityAffinity: { I: 0, E: 0, S: 0, N: 40, T: 0, F: 0, J: 0, P: 0 },
            }],
            actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const act = candidates.find((c) => c.type === 'activity');
        // The topic has N affinity and the character has N=90, so summary should show
        expect(act?.weightSummary).toContain('話題人格相性');
    });

    // --- Missing personality affinity (legacy data) ---

    it('missing personalityAffinity on location does not crash and has no affinity bonus', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ E: 90 })],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] },
                // no personalityAffinity on either location
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const move = candidates.find((c) => c.type === 'move');
        expect(move).toBeDefined();
        // No affinity text in summary
        expect(move?.weightSummary).not.toContain('人格相性');
    });

    it('missing personalityAffinity on activity does not crash', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({})],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: [],
            }],
            objects: [],
            activities: [{
                id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'], topicIds: [], effect: {},
                // no personalityAffinity
            }],
            topics: [], actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        expect(candidates.filter((c) => c.type === 'activity').length).toBeGreaterThan(0);
    });

    it('missing personalityAffinity on object does not crash', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({})],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: ['obj-1'],
            }],
            objects: [{
                id: 'obj-1', name: '物件1', locationId: 'loc-a', actionIds: ['action-1'],
                // no personalityAffinity
            }],
            activities: [],
            topics: [],
            actions: [{ id: 'action-1', name: '行動1', sourceType: 'object' as const, sourceId: 'obj-1', effects: {}, topicIds: [] }],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        expect(candidates.filter((c) => c.type === 'use_object').length).toBeGreaterThan(0);
    });

    it('missing personalityAffinity on topic does not crash', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({})],
            locations: [{
                id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: [],
            }],
            objects: [],
            activities: [{
                id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'],
                topicIds: ['topic-legacy'], effect: {},
            }],
            topics: [
                { id: 'topic-legacy', name: '舊話題', category: 'x', moodTone: 'neutral' as const, baseWeight: 50 },
                // no personalityAffinity
            ],
            actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        expect(candidates.length).toBeGreaterThan(0);
    });

    // --- Zero affinity does not change base weight ---

    it('all-zero affinity does not change move weight compared to no affinity', () => {
        const zeroAffinity = { I: 0, E: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
        const worldWithZero = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ E: 90 })],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [], personalityAffinity: zeroAffinity },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const worldWithout = {
            ...worldWithZero,
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
        };
        const cWith = buildCandidateActions(worldWithZero.characters[0], worldWithZero);
        const cWithout = buildCandidateActions(worldWithout.characters[0], worldWithout);
        const wWith = cWith.find((c) => c.type === 'move' && c.locationId === 'loc-b')?.weight ?? 0;
        const wWithout = cWithout.find((c) => c.type === 'move' && c.locationId === 'loc-b')?.weight ?? 0;
        expect(wWith).toBe(wWithout);
    });

    // --- Negative affinity does not eliminate actions ---

    it('negative affinity reduces weight but does not drop below MIN_WEIGHT', () => {
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({ E: 100 })],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                {
                    id: 'loc-b', name: 'B', visitWeight: 10, activityIds: [], objectIds: [],
                    personalityAffinity: { I: 0, E: -100, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
                },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        const moveToB = candidates.find((c) => c.type === 'move' && c.locationId === 'loc-b');
        expect(moveToB).toBeDefined();
        expect(moveToB!.weight).toBeGreaterThanOrEqual(1);
    });

    // --- Missing personality fields ---

    it('does not crash when personality fields are missing, uses 50 default', () => {
        const partialChar = makeCharacter({});
        (partialChar as any).personality = { E: 80 };
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [partialChar],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(partialChar, world);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.find((c) => c.type === 'idle')).toBeDefined();
    });

    it('does not crash when personality is undefined', () => {
        const partialChar = makeCharacter({});
        (partialChar as any).personality = undefined;
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [partialChar],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(partialChar, world);
        expect(candidates.length).toBeGreaterThan(0);
    });

    it('does not crash when temporaryModifiers is missing', () => {
        const partialChar = makeCharacter({});
        (partialChar as any).temporaryModifiers = undefined;
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [partialChar],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(partialChar, world);
        expect(candidates.length).toBeGreaterThan(0);
    });

    it('clamps out-of-range personality values without NaN', () => {
        const extremeChar = makeCharacter({
            I: 200, E: -50, S: NaN, N: Infinity, T: 50, F: 50, J: 50, P: 50,
        } as any);
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [extremeChar],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: [], objectIds: [] },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
            objects: [], activities: [], topics: [], actions: [],
        };
        const candidates = buildCandidateActions(extremeChar, world);
        expect(candidates.length).toBeGreaterThan(0);
        for (const c of candidates) {
            expect(isNaN(c.weight)).toBe(false);
        }
    });

    // --- Minimum weight guarantee ---

    it('no action weight drops below MIN_WEIGHT (1)', () => {
        const extremeChar = makeCharacter({ I: 100, E: 0, S: 0, N: 100, T: 100, F: 0, J: 0, P: 100 });
        const world = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [extremeChar, makeCharacter({}, { id: 'char-other', name: '其他', locationId: 'loc-a' })],
            locations: [
                {
                    id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: ['obj-1'],
                    personalityAffinity: { I: -100, E: -100, S: -100, N: -100, T: -100, F: -100, J: -100, P: -100 },
                },
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] },
            ],
            objects: [{ id: 'obj-1', name: '物件1', locationId: 'loc-a', actionIds: ['action-1'] }],
            activities: [{ id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'], topicIds: ['topic-1'], effect: {} }],
            topics: [{ id: 'topic-1', name: '話題1', category: '測試', moodTone: 'neutral' as const, baseWeight: 50 }],
            actions: [{ id: 'action-1', name: '行動1', sourceType: 'object' as const, sourceId: 'obj-1', effects: {}, topicIds: [] }],
        };
        const candidates = buildCandidateActions(extremeChar, world);
        for (const c of candidates) {
            expect(c.weight).toBeGreaterThanOrEqual(1);
        }
    });

    // --- Legacy data can still tick ---

    it('legacy data without any personalityAffinity can build candidates and tick', () => {
        const world: WorldState = {
            worldName: 'Test', currentTick: 0, timeLabel: '', eventLog: [],
            characters: [makeCharacter({})],
            locations: [
                { id: 'loc-a', name: 'A', visitWeight: 50, activityIds: ['act-1'], objectIds: ['obj-1'] } as any,
                { id: 'loc-b', name: 'B', visitWeight: 50, activityIds: [], objectIds: [] } as any,
            ],
            objects: [
                { id: 'obj-1', name: '物件1', locationId: 'loc-a', actionIds: ['action-1'] } as any,
            ],
            activities: [
                { id: 'act-1', name: '活動1', baseWeight: 50, locationIds: ['loc-a'], topicIds: ['topic-1'], effect: {} } as any,
            ],
            topics: [
                { id: 'topic-1', name: '話題1', category: '測試', moodTone: 'neutral', baseWeight: 50 } as any,
            ],
            actions: [
                { id: 'action-1', name: '行動1', sourceType: 'object', sourceId: 'obj-1', effects: {}, topicIds: [] },
            ],
        };
        const candidates = buildCandidateActions(world.characters[0], world);
        expect(candidates.length).toBeGreaterThan(0);
        // All weights valid
        for (const c of candidates) {
            expect(c.weight).toBeGreaterThanOrEqual(1);
            expect(isNaN(c.weight)).toBe(false);
        }
    });
});