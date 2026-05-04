import { nanoid } from 'nanoid';
import type { CandidateAction, EventLogEntry, WorldState } from '../models/types';

/**
 * Generate a time label from tick number.
 * Simple approach: each tick = 30 minutes, starting at 06:00.
 */
export function getTimeLabel(tick: number): string {
    const totalMinutes = (tick * 30) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60) + 6; // start at 06:00
    const minutes = totalMinutes % 60;
    const day = Math.floor((tick * 30) / (24 * 60)) + 1;
    const h = (hours % 24).toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `第${day}天 ${h}:${m}`;
}

/**
 * Generate an EventLogEntry from a resolved candidate action.
 */
export function generateEvent(
    action: CandidateAction,
    tick: number,
    state: WorldState
): EventLogEntry {
    const charName = state.characters.find((c) => c.id === action.characterId)?.name ?? '未知角色';
    const targetName = action.targetCharacterId
        ? state.characters.find((c) => c.id === action.targetCharacterId)?.name ?? '未知角色'
        : undefined;
    const locationName = action.locationId
        ? state.locations.find((l) => l.id === action.locationId)?.name ?? '未知地點'
        : undefined;
    const activityName = action.activityId
        ? state.activities.find((a) => a.id === action.activityId)?.name ?? '未知活動'
        : undefined;
    const objectName = action.objectId
        ? state.objects.find((o) => o.id === action.objectId)?.name ?? '未知物件'
        : undefined;
    const topicName = action.topicId
        ? state.topics.find((t) => t.id === action.topicId)?.name ?? '未知話題'
        : undefined;

    let displayText = '';
    let resultSummary = '';

    switch (action.type) {
        case 'move':
            displayText = `${charName}前往了${locationName}。`;
            resultSummary = `${charName}移動到${locationName}`;
            break;
        case 'activity':
            displayText = topicName
                ? `${charName}在${locationName}參加了「${activityName}」，順口提到了${topicName}。`
                : `${charName}在${locationName}參加了「${activityName}」。`;
            resultSummary = `${charName}進行活動：${activityName}`;
            break;
        case 'use_object':
            displayText = `${charName}在${locationName}使用了${objectName}。`;
            resultSummary = `${charName}使用物件：${objectName}`;
            break;
        case 'talk':
            displayText = topicName
                ? `${charName}和${targetName}在${locationName}聊起了「${topicName}」。`
                : `${charName}和${targetName}在${locationName}閒聊了起來。`;
            resultSummary = `${charName}與${targetName}交談${topicName ? `（話題：${topicName}）` : ''}`;
            break;
        case 'joint_activity':
            displayText = topicName
                ? `${charName}和${targetName}一起在${locationName}參加了「${activityName}」，聊到了${topicName}。`
                : `${charName}和${targetName}一起在${locationName}參加了「${activityName}」。`;
            resultSummary = `${charName}與${targetName}共同活動：${activityName}`;
            break;
        case 'idle':
            displayText = locationName
                ? `${charName}在${locationName}發呆，暫時無事可做。`
                : `${charName}暫時無事可做。`;
            resultSummary = `${charName}待機`;
            break;
        case 'system':
            displayText = action.description;
            resultSummary = action.description;
            break;
    }

    return {
        id: nanoid(),
        tick,
        timeLabel: getTimeLabel(tick),
        eventType: action.type,
        characterIds: [
            action.characterId,
            ...(action.targetCharacterId ? [action.targetCharacterId] : []),
        ].filter(Boolean),
        locationId: action.locationId ?? null,
        objectId: action.objectId ?? null,
        activityId: action.activityId ?? null,
        topicId: action.topicId ?? null,
        displayText,
        resultSummary,
        weightSummary: action.weightSummary,
    };
}

/**
 * Generate a system event (no character involved).
 */
export function generateSystemEvent(tick: number, message: string): EventLogEntry {
    return {
        id: nanoid(),
        tick,
        timeLabel: getTimeLabel(tick),
        eventType: 'system',
        characterIds: [],
        locationId: null,
        objectId: null,
        activityId: null,
        topicId: null,
        displayText: message,
        resultSummary: message,
    };
}