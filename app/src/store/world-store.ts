import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
    Character,
    Location,
    WorldObject,
    Activity,
    Topic,
    Action,
    WorldState,
    Personality,
} from '../models/types';
import {
    seedCharacters,
    seedLocations,
    seedObjects,
    seedActivities,
    seedTopics,
    seedActions,
} from '../models/seed-data';
import { executeTick } from '../engine/simulation-engine';
import { getTimeLabel } from '../engine/event-generator';
import { clampValue } from '../engine/personality-utils';

// ===== Entity selection types =====

export type EntityType = 'character' | 'location' | 'object' | 'activity' | 'topic';

export interface SelectedEntity {
    type: EntityType;
    id: string;
}

// ===== Store interface =====

interface WorldStore extends WorldState {
    // UI state
    selectedEntity: SelectedEntity | null;
    isAutoPlaying: boolean;
    autoPlayInterval: ReturnType<typeof setInterval> | null;
    selectedEventId: string | null;

    // Selection
    selectEntity: (entity: SelectedEntity | null) => void;
    selectEvent: (eventId: string | null) => void;

    // Simulation
    nextTick: () => void;
    startAutoPlay: (intervalMs?: number) => void;
    stopAutoPlay: () => void;

    // Character CRUD
    addCharacter: (name: string) => void;
    updateCharacter: (id: string, updates: Partial<Character>) => void;
    deleteCharacter: (id: string) => void;

    // Location CRUD
    addLocation: (name: string) => void;
    updateLocation: (id: string, updates: Partial<Location>) => void;
    deleteLocation: (id: string) => void;

    // Object CRUD
    addObject: (name: string) => void;
    updateObject: (id: string, updates: Partial<WorldObject>) => void;
    deleteObject: (id: string) => void;

    // Activity CRUD
    addActivity: (name: string) => void;
    updateActivity: (id: string, updates: Partial<Activity>) => void;
    deleteActivity: (id: string) => void;

    // Topic CRUD
    addTopic: (name: string) => void;
    updateTopic: (id: string, updates: Partial<Topic>) => void;
    deleteTopic: (id: string) => void;

    // Action CRUD (for object actions)
    addAction: (name: string, sourceType: Action['sourceType'], sourceId: string) => void;
    updateAction: (id: string, updates: Partial<Action>) => void;
    deleteAction: (id: string) => void;

    // Import/Export
    exportWorld: () => string;
    importWorld: (json: string) => boolean;

    // Reset
    resetToSeed: () => void;
}

function createDefaultPersonality(): Personality {
    return { I: 50, E: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };
}

export const useWorldStore = create<WorldStore>((set, get) => ({
    // Initial state from seed data
    worldName: 'Living World',
    currentTick: 0,
    timeLabel: getTimeLabel(0),
    characters: [...seedCharacters],
    locations: [...seedLocations],
    objects: [...seedObjects],
    activities: [...seedActivities],
    topics: [...seedTopics],
    actions: [...seedActions],
    eventLog: [],

    // UI state
    selectedEntity: null,
    isAutoPlaying: false,
    autoPlayInterval: null,
    selectedEventId: null,

    // Selection
    selectEntity: (entity) => set({ selectedEntity: entity }),
    selectEvent: (eventId) => set({ selectedEventId: eventId }),

    // Simulation
    nextTick: () => {
        const state = get();
        const worldState: WorldState = {
            worldName: state.worldName,
            currentTick: state.currentTick,
            timeLabel: state.timeLabel,
            characters: state.characters,
            locations: state.locations,
            objects: state.objects,
            activities: state.activities,
            topics: state.topics,
            actions: state.actions,
            eventLog: state.eventLog,
        };

        const result = executeTick(worldState);

        set({
            currentTick: result.newTick,
            timeLabel: result.newTimeLabel,
            characters: result.updatedCharacters,
            eventLog: [...state.eventLog, ...result.newEvents],
        });
    },

    startAutoPlay: (intervalMs = 1500) => {
        const state = get();
        if (state.isAutoPlaying) return;

        const interval = setInterval(() => {
            get().nextTick();
        }, intervalMs);

        set({ isAutoPlaying: true, autoPlayInterval: interval });
    },

    stopAutoPlay: () => {
        const state = get();
        if (state.autoPlayInterval) {
            clearInterval(state.autoPlayInterval);
        }
        set({ isAutoPlaying: false, autoPlayInterval: null });
    },

    // Character CRUD
    addCharacter: (name) => {
        const id = `char-${nanoid(8)}`;
        const state = get();
        const newChar: Character = {
            id,
            name,
            locationId: state.locations.length > 0 ? state.locations[0].id : null,
            personality: createDefaultPersonality(),
            temporaryModifiers: [],
            mood: 50,
            energy: 50,
            currentActivityId: null,
            recentCharacterId: null,
            recentTopicId: null,
            topicPreferences: [],
            relationshipScores: {},
        };
        set({ characters: [...state.characters, newChar] });
        set({ selectedEntity: { type: 'character', id } });
    },

    updateCharacter: (id, updates) => {
        const state = get();
        // Clamp personality values
        if (updates.personality) {
            const p = updates.personality;
            updates.personality = {
                I: clampValue(p.I),
                E: clampValue(p.E),
                S: clampValue(p.S),
                N: clampValue(p.N),
                T: clampValue(p.T),
                F: clampValue(p.F),
                J: clampValue(p.J),
                P: clampValue(p.P),
            };
        }
        if (updates.mood !== undefined) updates.mood = clampValue(updates.mood);
        if (updates.energy !== undefined) updates.energy = clampValue(updates.energy);

        set({
            characters: state.characters.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        });
    },

    deleteCharacter: (id) => {
        const state = get();
        set({
            characters: state.characters.filter((c) => c.id !== id),
            selectedEntity:
                state.selectedEntity?.type === 'character' && state.selectedEntity.id === id
                    ? null
                    : state.selectedEntity,
        });
        // Clean up relationship references
        set({
            characters: get().characters.map((c) => {
                const { [id]: _, ...rest } = c.relationshipScores;
                return {
                    ...c,
                    relationshipScores: rest,
                    recentCharacterId: c.recentCharacterId === id ? null : c.recentCharacterId,
                };
            }),
        });
    },

    // Location CRUD
    addLocation: (name) => {
        const id = `loc-${nanoid(8)}`;
        const state = get();
        const newLoc: Location = {
            id,
            name,
            visitWeight: 50,
            activityIds: [],
            objectIds: [],
        };
        set({ locations: [...state.locations, newLoc] });
        set({ selectedEntity: { type: 'location', id } });
    },

    updateLocation: (id, updates) => {
        const state = get();
        // Clamp visitWeight
        if (updates.visitWeight !== undefined) {
            updates.visitWeight = clampValue(updates.visitWeight);
        }
        set({
            locations: state.locations.map((l) =>
                l.id === id ? { ...l, ...updates } : l
            ),
        });
    },

    deleteLocation: (id) => {
        const state = get();
        set({
            locations: state.locations.filter((l) => l.id !== id),
            selectedEntity:
                state.selectedEntity?.type === 'location' && state.selectedEntity.id === id
                    ? null
                    : state.selectedEntity,
        });
        // Clean up character locationId references
        set({
            characters: get().characters.map((c) => ({
                ...c,
                locationId: c.locationId === id ? null : c.locationId,
            })),
        });
        // Clean up activity locationIds references
        set({
            activities: get().activities.map((a) => ({
                ...a,
                locationIds: a.locationIds.filter((lid) => lid !== id),
            })),
        });
        // Clean up object locationId references
        set({
            objects: get().objects.map((o) => ({
                ...o,
                locationId: o.locationId === id ? null : o.locationId,
            })),
        });
    },

    // Object CRUD
    addObject: (name) => {
        const id = `obj-${nanoid(8)}`;
        const state = get();
        const newObj: WorldObject = {
            id,
            name,
            locationId: state.locations.length > 0 ? state.locations[0].id : null,
            actionIds: [],
        };
        set({ objects: [...state.objects, newObj] });
        set({ selectedEntity: { type: 'object', id } });
    },

    updateObject: (id, updates) => {
        const state = get();
        set({
            objects: state.objects.map((o) =>
                o.id === id ? { ...o, ...updates } : o
            ),
        });
    },

    deleteObject: (id) => {
        const state = get();
        // Also delete associated actions
        const obj = state.objects.find((o) => o.id === id);
        const actionIdsToDelete = obj?.actionIds ?? [];

        set({
            objects: state.objects.filter((o) => o.id !== id),
            actions: state.actions.filter((a) => !actionIdsToDelete.includes(a.id)),
            selectedEntity:
                state.selectedEntity?.type === 'object' && state.selectedEntity.id === id
                    ? null
                    : state.selectedEntity,
        });
        // Clean up location objectIds references
        set({
            locations: get().locations.map((l) => ({
                ...l,
                objectIds: l.objectIds.filter((oid) => oid !== id),
            })),
        });
    },

    // Activity CRUD
    addActivity: (name) => {
        const id = `act-${nanoid(8)}`;
        const state = get();
        const newAct: Activity = {
            id,
            name,
            baseWeight: 50,
            locationIds: [],
            topicIds: [],
            effect: {},
        };
        set({ activities: [...state.activities, newAct] });
        set({ selectedEntity: { type: 'activity', id } });
    },

    updateActivity: (id, updates) => {
        const state = get();
        // Clamp baseWeight
        if (updates.baseWeight !== undefined) {
            updates.baseWeight = clampValue(updates.baseWeight);
        }
        set({
            activities: state.activities.map((a) =>
                a.id === id ? { ...a, ...updates } : a
            ),
        });
    },

    deleteActivity: (id) => {
        const state = get();
        set({
            activities: state.activities.filter((a) => a.id !== id),
            selectedEntity:
                state.selectedEntity?.type === 'activity' && state.selectedEntity.id === id
                    ? null
                    : state.selectedEntity,
        });
        // Clean up location activityIds references
        set({
            locations: get().locations.map((l) => ({
                ...l,
                activityIds: l.activityIds.filter((aid) => aid !== id),
            })),
        });
        // Clean up character currentActivityId references
        set({
            characters: get().characters.map((c) => ({
                ...c,
                currentActivityId: c.currentActivityId === id ? null : c.currentActivityId,
            })),
        });
    },

    // Topic CRUD
    addTopic: (name) => {
        const id = `topic-${nanoid(8)}`;
        const state = get();
        const newTopic: Topic = {
            id,
            name,
            category: '未分類',
            moodTone: 'neutral',
            baseWeight: 50,
        };
        set({ topics: [...state.topics, newTopic] });
        set({ selectedEntity: { type: 'topic', id } });
    },

    updateTopic: (id, updates) => {
        const state = get();
        // Clamp baseWeight
        if (updates.baseWeight !== undefined) {
            updates.baseWeight = clampValue(updates.baseWeight);
        }
        set({
            topics: state.topics.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            ),
        });
    },

    deleteTopic: (id) => {
        const state = get();
        set({
            topics: state.topics.filter((t) => t.id !== id),
            selectedEntity:
                state.selectedEntity?.type === 'topic' && state.selectedEntity.id === id
                    ? null
                    : state.selectedEntity,
        });
        // Clean up character topicPreferences references
        set({
            characters: get().characters.map((c) => ({
                ...c,
                topicPreferences: c.topicPreferences.filter((tid) => tid !== id),
                recentTopicId: c.recentTopicId === id ? null : c.recentTopicId,
            })),
        });
        // Clean up activity topicIds references
        set({
            activities: get().activities.map((a) => ({
                ...a,
                topicIds: a.topicIds.filter((tid) => tid !== id),
            })),
        });
        // Clean up action topicIds references
        set({
            actions: get().actions.map((a) => ({
                ...a,
                topicIds: a.topicIds.filter((tid) => tid !== id),
            })),
        });
    },

    // Action CRUD
    addAction: (name, sourceType, sourceId) => {
        const id = `action-${nanoid(8)}`;
        const state = get();
        const newAction: Action = {
            id,
            name,
            sourceType,
            sourceId,
            effects: {},
            topicIds: [],
        };
        set({ actions: [...state.actions, newAction] });

        // If source is an object, add action id to the object's actionIds
        if (sourceType === 'object') {
            set({
                objects: get().objects.map((o) =>
                    o.id === sourceId
                        ? { ...o, actionIds: [...o.actionIds, id] }
                        : o
                ),
            });
        }
    },

    updateAction: (id, updates) => {
        const state = get();
        set({
            actions: state.actions.map((a) =>
                a.id === id ? { ...a, ...updates } : a
            ),
        });
    },

    deleteAction: (id) => {
        const state = get();
        set({
            actions: state.actions.filter((a) => a.id !== id),
        });
        // Clean up object actionIds references
        set({
            objects: get().objects.map((o) => ({
                ...o,
                actionIds: o.actionIds.filter((aid) => aid !== id),
            })),
        });
    },

    // Import/Export
    exportWorld: () => {
        const state = get();
        const data = {
            worldName: state.worldName,
            currentTick: state.currentTick,
            timeLabel: state.timeLabel,
            characters: state.characters,
            locations: state.locations,
            objects: state.objects,
            activities: state.activities,
            topics: state.topics,
            actions: state.actions,
            eventLog: state.eventLog,
        };
        return JSON.stringify(data, null, 2);
    },

    importWorld: (json) => {
        try {
            const data = JSON.parse(json) as Partial<WorldState>;
            if (!data.characters || !data.locations) {
                return false;
            }
            // Backfill default weights for legacy data
            const locations = (data.locations ?? []).map((l) => ({
                ...l,
                visitWeight: l.visitWeight ?? 50,
            }));
            const activities = (data.activities ?? []).map((a) => ({
                ...a,
                baseWeight: a.baseWeight ?? 50,
            }));
            const topics = (data.topics ?? []).map((t) => ({
                ...t,
                baseWeight: t.baseWeight ?? 50,
            }));
            set({
                worldName: data.worldName ?? 'Imported World',
                currentTick: data.currentTick ?? 0,
                timeLabel: data.timeLabel ?? getTimeLabel(0),
                characters: data.characters ?? [],
                locations,
                objects: data.objects ?? [],
                activities,
                topics,
                actions: data.actions ?? [],
                eventLog: data.eventLog ?? [],
                selectedEntity: null,
            });
            return true;
        } catch {
            return false;
        }
    },

    // Reset
    resetToSeed: () => {
        const state = get();
        if (state.autoPlayInterval) {
            clearInterval(state.autoPlayInterval);
        }
        set({
            worldName: 'Living World',
            currentTick: 0,
            timeLabel: getTimeLabel(0),
            characters: [...seedCharacters],
            locations: [...seedLocations],
            objects: [...seedObjects],
            activities: [...seedActivities],
            topics: [...seedTopics],
            actions: [...seedActions],
            eventLog: [],
            selectedEntity: null,
            isAutoPlaying: false,
            autoPlayInterval: null,
            selectedEventId: null,
        });
    },
}));