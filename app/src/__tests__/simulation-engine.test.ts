import { describe, it, expect } from 'vitest';
import { executeTick } from '../engine/simulation-engine';
import type { WorldState } from '../models/types';
import {
    seedCharacters,
    seedLocations,
    seedObjects,
    seedActivities,
    seedTopics,
    seedActions,
} from '../models/seed-data';

function createEmptyWorld(): WorldState {
    return {
        worldName: 'Test World',
        currentTick: 0,
        timeLabel: '第1天 06:00',
        characters: [],
        locations: [],
        objects: [],
        activities: [],
        topics: [],
        actions: [],
        eventLog: [],
    };
}

function createSeedWorld(): WorldState {
    return {
        worldName: 'Test World',
        currentTick: 0,
        timeLabel: '第1天 06:00',
        characters: structuredClone(seedCharacters),
        locations: structuredClone(seedLocations),
        objects: structuredClone(seedObjects),
        activities: structuredClone(seedActivities),
        topics: structuredClone(seedTopics),
        actions: structuredClone(seedActions),
        eventLog: [],
    };
}

describe('executeTick', () => {
    it('does not crash with empty world (no characters)', () => {
        const world = createEmptyWorld();
        const result = executeTick(world);
        expect(result.newTick).toBe(1);
        expect(result.newEvents.length).toBeGreaterThan(0);
        expect(result.newEvents[0].eventType).toBe('system');
    });

    it('does not crash with characters but no locations', () => {
        const world = createEmptyWorld();
        world.characters = [
            {
                id: 'char-test',
                name: '測試角色',
                locationId: null,
                personality: { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 },
                temporaryModifiers: [],
                mood: 50,
                energy: 50,
                currentActivityId: null,
                recentCharacterId: null,
                recentTopicId: null,
                topicPreferences: [],
                relationshipScores: {},
            },
        ];
        const result = executeTick(world);
        expect(result.newTick).toBe(1);
        // Should produce system event about no locations + idle events
        expect(result.newEvents.length).toBeGreaterThan(0);
        const systemEvents = result.newEvents.filter((e) => e.eventType === 'system');
        expect(systemEvents.length).toBeGreaterThan(0);
    });

    it('produces events for each character in seed world', () => {
        const world = createSeedWorld();
        const result = executeTick(world);
        expect(result.newTick).toBe(1);
        // Should have at least one event per character
        expect(result.newEvents.length).toBeGreaterThanOrEqual(world.characters.length);
    });

    it('increments tick correctly', () => {
        const world = createSeedWorld();
        world.currentTick = 5;
        const result = executeTick(world);
        expect(result.newTick).toBe(6);
    });

    it('assigns location to character without one', () => {
        const world = createSeedWorld();
        world.characters[0].locationId = null;
        const result = executeTick(world);
        // Character should be assigned to a valid location (may move during Phase 3)
        const char = result.updatedCharacters.find((c) => c.id === world.characters[0].id);
        const validLocationIds = world.locations.map((l) => l.id);
        expect(char?.locationId).not.toBeNull();
        expect(validLocationIds).toContain(char?.locationId);
    });

    it('handles deleted location reference gracefully', () => {
        const world = createSeedWorld();
        world.characters[0].locationId = 'non-existent-location';
        const result = executeTick(world);
        // Should not throw, character should be reassigned to a valid location
        const char = result.updatedCharacters.find((c) => c.id === world.characters[0].id);
        const validLocationIds = world.locations.map((l) => l.id);
        expect(char?.locationId).not.toBeNull();
        expect(validLocationIds).toContain(char?.locationId);
    });

    it('produces idle event when character has no options', () => {
        const world = createEmptyWorld();
        world.locations = [{ id: 'loc-empty', name: '空地', visitWeight: 50, activityIds: [], objectIds: [] }];
        world.characters = [
            {
                id: 'char-alone',
                name: '孤獨角色',
                locationId: 'loc-empty',
                personality: { I: 90, E: 10, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 },
                temporaryModifiers: [],
                mood: 50,
                energy: 50,
                currentActivityId: null,
                recentCharacterId: null,
                recentTopicId: null,
                topicPreferences: [],
                relationshipScores: {},
            },
        ];
        // With only one location, no activities, no objects, no other characters,
        // the only options are idle (and potentially move, but there's no other location)
        // The character should still produce an event
        const result = executeTick(world);
        expect(result.newEvents.length).toBeGreaterThan(0);
    });

    it('ticks down temporary modifiers', () => {
        const world = createSeedWorld();
        world.characters[0].temporaryModifiers = [
            { id: 'mod-1', trait: 'E', value: 20, remainingTicks: 2, source: 'test' },
        ];
        const result = executeTick(world);
        const char = result.updatedCharacters.find((c) => c.id === world.characters[0].id);
        // Modifier should have decremented
        const mod = char?.temporaryModifiers.find((m) => m.id === 'mod-1');
        expect(mod?.remainingTicks).toBe(1);
    });
});