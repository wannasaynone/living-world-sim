// ===== Personality =====

export interface Personality {
    I: number; // 內向 0-100
    E: number; // 外向 0-100
    S: number; // 實感 0-100
    N: number; // 直覺 0-100
    T: number; // 思考 0-100
    F: number; // 情感 0-100
    J: number; // 判斷 0-100
    P: number; // 感知 0-100
}

// ===== Personality Affinity =====
// 設定在內容項目（地點、活動、物件、話題）上的人格相性
// 範圍 -100 到 100，0 為中性
// 正數：角色該人格值越高，越提高此內容項目的觸發權重
// 負數：角色該人格值越高，越降低此內容項目的觸發權重

export interface PersonalityAffinity {
    I: number;
    E: number;
    S: number;
    N: number;
    T: number;
    F: number;
    J: number;
    P: number;
}

export interface TemporaryModifier {
    id: string;
    trait: keyof Personality;
    value: number;
    remainingTicks: number;
    source: string; // description of what caused this modifier
}

// ===== Character =====

export interface Character {
    id: string;
    name: string;
    locationId: string | null;
    personality: Personality;
    temporaryModifiers: TemporaryModifier[];
    mood: number; // 0-100
    energy: number; // 0-100
    currentActivityId: string | null;
    recentCharacterId: string | null;
    recentTopicId: string | null;
    topicPreferences: string[]; // topic ids
    relationshipScores: Record<string, number>; // characterId -> score
    avatarAssetId?: string;
    animationProfileId?: string;
}

// ===== Location =====

export interface Location {
    id: string;
    name: string;
    visitWeight: number; // 地點吸引力 0-100，影響角色移動到該地點的候選行動權重
    activityIds: string[];
    objectIds: string[];
    personalityAffinity?: PersonalityAffinity;
    backgroundAssetId?: string;
}

// ===== WorldObject =====

export interface WorldObject {
    id: string;
    name: string;
    locationId: string | null;
    actionIds: string[];
    personalityAffinity?: PersonalityAffinity;
    imageAssetId?: string;
}

// ===== Activity =====

export interface ActivityEffect {
    mood?: number;
    energy?: number;
    modifiers?: Omit<TemporaryModifier, 'id'>[];
}

export interface Activity {
    id: string;
    name: string;
    baseWeight: number; // 活動基礎權重 0-100，影響角色選擇此活動的候選行動權重
    locationIds: string[];
    topicIds: string[];
    effect: ActivityEffect;
    personalityAffinity?: PersonalityAffinity;
    animationCueId?: string;
}

// ===== Topic =====

export type MoodTone = 'positive' | 'neutral' | 'negative';

export interface Topic {
    id: string;
    name: string;
    category: string;
    moodTone: MoodTone;
    baseWeight: number; // 話題出現權重 0-100，影響從候選話題中抽到該話題的機率
    personalityAffinity?: PersonalityAffinity;
}

// ===== Action =====

export type ActionSourceType = 'basic' | 'activity' | 'object' | 'interaction';

export interface ActionEffect {
    mood?: number;
    energy?: number;
    relationship?: number; // delta to relationship with target
    modifiers?: Omit<TemporaryModifier, 'id'>[];
}

export interface Action {
    id: string;
    name: string;
    sourceType: ActionSourceType;
    sourceId: string; // id of the activity/object/character that provides this action
    effects: ActionEffect;
    topicIds: string[];
}

// ===== EventLogEntry =====

export type EventType =
    | 'move'
    | 'activity'
    | 'use_object'
    | 'talk'
    | 'joint_activity'
    | 'idle'
    | 'system';

export interface EventLogEntry {
    id: string;
    tick: number;
    timeLabel: string;
    eventType: EventType;
    characterIds: string[];
    locationId: string | null;
    objectId: string | null;
    activityId: string | null;
    topicId: string | null;
    displayText: string;
    resultSummary: string;
    weightSummary?: string; // 權重計算摘要
    // Visual cue fields - reserved for future use
    portraitCueId?: string;
    locationImageCueId?: string;
    objectImageCueId?: string;
    animationCueId?: string;
    soundCueId?: string;
}

// ===== World State =====

export interface WorldState {
    worldName: string;
    currentTick: number;
    timeLabel: string;
    characters: Character[];
    locations: Location[];
    objects: WorldObject[];
    activities: Activity[];
    topics: Topic[];
    actions: Action[];
    eventLog: EventLogEntry[];
}

// ===== Candidate Action (used internally by engine) =====

export interface CandidateAction {
    type: EventType;
    weight: number;
    characterId: string;
    targetCharacterId?: string;
    locationId?: string;
    activityId?: string;
    objectId?: string;
    actionId?: string;
    topicId?: string;
    description: string;
    weightSummary?: string; // 權重計算摘要
}