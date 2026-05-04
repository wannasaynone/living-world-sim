import { nanoid } from 'nanoid';
import type {
    Character,
    WorldState,
    EventLogEntry,
} from '../models/types';
import { buildCandidateActions, selectAction } from './action-resolver';
import { generateEvent, generateSystemEvent, getTimeLabel } from './event-generator';
import { tickModifiers, clampValue } from './personality-utils';

export interface TickResult {
    updatedCharacters: Character[];
    newEvents: EventLogEntry[];
    newTick: number;
    newTimeLabel: string;
}

/**
 * Execute one simulation tick.
 * Pure function: takes world state, returns updates.
 */
export function executeTick(state: WorldState): TickResult {
    const newTick = state.currentTick + 1;
    const newTimeLabel = getTimeLabel(newTick);
    const newEvents: EventLogEntry[] = [];

    // Handle empty world gracefully
    if (state.characters.length === 0) {
        newEvents.push(generateSystemEvent(newTick, '世界中沒有角色，模擬等待中...'));
        return {
            updatedCharacters: [],
            newEvents,
            newTick,
            newTimeLabel,
        };
    }

    // Deep copy characters for mutation
    const updatedCharacters: Character[] = state.characters.map((c) => ({
        ...c,
        personality: { ...c.personality },
        temporaryModifiers: [...c.temporaryModifiers],
        topicPreferences: [...c.topicPreferences],
        relationshipScores: { ...c.relationshipScores },
    }));

    // Phase 1: Update temporary modifiers (tick down)
    for (const char of updatedCharacters) {
        char.temporaryModifiers = tickModifiers(char.temporaryModifiers);
    }

    // Phase 2: Assign location to characters without one
    if (state.locations.length === 0) {
        newEvents.push(generateSystemEvent(newTick, '世界中沒有地點，角色無法行動。'));
        // All characters idle
        for (const char of updatedCharacters) {
            newEvents.push(
                generateEvent(
                    {
                        type: 'idle',
                        weight: 1,
                        characterId: char.id,
                        description: '暫時無事可做（無地點可用）',
                    },
                    newTick,
                    { ...state, characters: updatedCharacters }
                )
            );
        }
        return { updatedCharacters, newEvents, newTick, newTimeLabel };
    }

    for (const char of updatedCharacters) {
        if (!char.locationId || !state.locations.find((l) => l.id === char.locationId)) {
            // Assign to first available location
            char.locationId = state.locations[0].id;
            newEvents.push(
                generateEvent(
                    {
                        type: 'move',
                        weight: 1,
                        characterId: char.id,
                        locationId: state.locations[0].id,
                        description: `被分配到${state.locations[0].name}`,
                    },
                    newTick,
                    { ...state, characters: updatedCharacters }
                )
            );
        }
    }

    // Phase 3: Each character takes an action
    // Use an intermediate state that includes updated character locations
    const intermediateState: WorldState = { ...state, characters: updatedCharacters, currentTick: newTick };

    for (const char of updatedCharacters) {
        const candidates = buildCandidateActions(char, intermediateState);
        const selectedAction = selectAction(candidates);

        // Apply action effects
        applyActionEffects(char, selectedAction, intermediateState);

        // Generate event
        const event = generateEvent(selectedAction, newTick, intermediateState);
        newEvents.push(event);
    }

    return { updatedCharacters, newEvents, newTick, newTimeLabel };
}

/**
 * Apply effects of the selected action to the character.
 */
function applyActionEffects(
    char: Character,
    action: ReturnType<typeof selectAction>,
    state: WorldState
): void {
    switch (action.type) {
        case 'move':
            char.locationId = action.locationId ?? char.locationId;
            char.currentActivityId = null;
            char.energy = clampValue(char.energy - 5); // Moving costs a bit of energy
            break;

        case 'activity': {
            char.currentActivityId = action.activityId ?? null;
            const activity = state.activities.find((a) => a.id === action.activityId);
            if (activity?.effect) {
                char.mood = clampValue(char.mood + (activity.effect.mood ?? 0));
                char.energy = clampValue(char.energy + (activity.effect.energy ?? 0));
                if (activity.effect.modifiers) {
                    for (const mod of activity.effect.modifiers) {
                        char.temporaryModifiers.push({ ...mod, id: nanoid() });
                    }
                }
            }
            if (action.topicId) {
                char.recentTopicId = action.topicId;
            }
            break;
        }

        case 'use_object': {
            char.currentActivityId = null;
            const actionDef = state.actions.find((a) => a.id === action.actionId);
            if (actionDef?.effects) {
                char.mood = clampValue(char.mood + (actionDef.effects.mood ?? 0));
                char.energy = clampValue(char.energy + (actionDef.effects.energy ?? 0));
                if (actionDef.effects.modifiers) {
                    for (const mod of actionDef.effects.modifiers) {
                        char.temporaryModifiers.push({ ...mod, id: nanoid() });
                    }
                }
            }
            if (action.topicId) {
                char.recentTopicId = action.topicId;
            }
            break;
        }

        case 'talk': {
            char.currentActivityId = null;
            char.recentCharacterId = action.targetCharacterId ?? null;
            if (action.topicId) {
                char.recentTopicId = action.topicId;
                // Topic mood effect
                const topic = state.topics.find((t) => t.id === action.topicId);
                if (topic) {
                    const moodDelta = topic.moodTone === 'positive' ? 5 : topic.moodTone === 'negative' ? -3 : 1;
                    char.mood = clampValue(char.mood + moodDelta);
                }
            }
            // Improve relationship
            if (action.targetCharacterId) {
                const current = char.relationshipScores[action.targetCharacterId] ?? 0;
                char.relationshipScores[action.targetCharacterId] = clampValue(current + 3, -100, 100);
            }
            // Small energy cost
            char.energy = clampValue(char.energy - 3);
            // Add temporary E modifier (social stimulation)
            char.temporaryModifiers.push({
                id: nanoid(),
                trait: 'E',
                value: 10,
                remainingTicks: 2,
                source: '社交刺激',
            });
            break;
        }

        case 'joint_activity': {
            char.currentActivityId = action.activityId ?? null;
            char.recentCharacterId = action.targetCharacterId ?? null;
            const activity = state.activities.find((a) => a.id === action.activityId);
            if (activity?.effect) {
                char.mood = clampValue(char.mood + (activity.effect.mood ?? 0));
                char.energy = clampValue(char.energy + (activity.effect.energy ?? 0));
            }
            // Improve relationship
            if (action.targetCharacterId) {
                const current = char.relationshipScores[action.targetCharacterId] ?? 0;
                char.relationshipScores[action.targetCharacterId] = clampValue(current + 5, -100, 100);
            }
            if (action.topicId) {
                char.recentTopicId = action.topicId;
            }
            break;
        }

        case 'idle':
            char.currentActivityId = null;
            // Resting restores a bit of energy
            char.energy = clampValue(char.energy + 5);
            break;

        default:
            break;
    }
}