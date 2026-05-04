/* ============================
 *  Action Resolver
 *  ─ 根據角色狀態與所在地產生候選行動並加權
 *  ─ 內容項目上的人格相性 (personalityAffinity) 是主要人格機率來源
 *  ─ 角色人格數值只作為權重計算來源
 * ============================ */

import type {
    Character, WorldState, CandidateAction, Topic, Personality,
} from '../models/types';
import { safePersonality, getEffectivePersonality, calculatePersonalityAffinityBonus } from './personality-utils';

/** 最低權重下限，任何行動不得低於此值 */
const MIN_WEIGHT = 1;

/* -------------------------------------------------- */

/**
 * Weighted pick a topic from candidate topic ids.
 * When effectivePersonality is provided, Topic.personalityAffinity is used to adjust weights.
 * Returns undefined if no valid topic found.
 */
export function weightedPickTopic(
    candidateTopicIds: string[],
    allTopics: Topic[],
    effectivePersonality?: Personality,
): string | undefined {
    if (candidateTopicIds.length === 0) return undefined;

    const matched = candidateTopicIds
        .map((id) => allTopics.find((t) => t.id === id))
        .filter((t): t is Topic => t !== undefined);

    if (matched.length === 0) return undefined;

    const weights = matched.map((t) => {
        let w = t.baseWeight ?? 50;
        if (effectivePersonality) {
            const { bonus } = calculatePersonalityAffinityBonus(effectivePersonality, t.personalityAffinity);
            w += bonus;
        }
        return Math.max(w, MIN_WEIGHT);
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight <= 0) {
        // Uniform random
        return matched[Math.floor(Math.random() * matched.length)].id;
    }

    let r = Math.random() * totalWeight;
    for (let i = 0; i < matched.length; i++) {
        r -= weights[i];
        if (r <= 0) return matched[i].id;
    }
    return matched[matched.length - 1].id;
}

/* -------------------------------------------------- */

/**
 * Build topic affinity summary for weightSummary display.
 */
function buildTopicAffinitySummary(
    topicId: string | undefined,
    allTopics: Topic[],
    eff: Personality,
): string {
    if (!topicId) return '';
    const topic = allTopics.find((t) => t.id === topicId);
    if (!topic?.personalityAffinity) return '';
    const { summary } = calculatePersonalityAffinityBonus(eff, topic.personalityAffinity);
    if (!summary) return '';
    return `話題人格相性：${summary}`;
}

/* -------------------------------------------------- */

/**
 * Build all candidate actions for a character given the world state.
 */
export function buildCandidateActions(
    char: Character,
    world: WorldState,
): CandidateAction[] {
    // Safe personality: fill missing fields with 50, clamp 0-100
    const safePers = safePersonality(char.personality);
    const mods = Array.isArray(char.temporaryModifiers) ? char.temporaryModifiers : [];
    const eff = getEffectivePersonality(safePers, mods);

    const candidates: CandidateAction[] = [];

    const currentLocation = world.locations.find((l) => l.id === char.locationId);

    // --- 移動 ---
    const otherLocations = world.locations.filter((l) => l.id !== char.locationId);
    for (const loc of otherLocations) {
        const visitW = loc.visitWeight ?? 50;
        let w = visitW * 0.4; // 地點吸引力作為基礎
        const parts: string[] = [`地點吸引力 ${(visitW * 0.4).toFixed(1)}`];

        // 地點人格相性
        const { bonus: locBonus, summary: locSummary } = calculatePersonalityAffinityBonus(eff, loc.personalityAffinity);
        if (locBonus !== 0) {
            w += locBonus;
            parts.push(`地點人格相性：${locSummary}`);
        }

        w = Math.max(w, MIN_WEIGHT);
        candidates.push({
            type: 'move',
            weight: w,
            characterId: char.id,
            locationId: loc.id,
            description: `移動到${loc.name}`,
            weightSummary: parts.join('、'),
        });
    }

    // --- 活動（獨自）---
    if (currentLocation) {
        const locationActivityIds = currentLocation.activityIds ?? [];
        for (const actId of locationActivityIds) {
            const act = world.activities.find((a) => a.id === actId);
            if (!act) continue;

            const baseW = act.baseWeight ?? 50;
            let w = baseW * 0.3; // 活動基礎權重
            const parts: string[] = [`活動基礎權重 ${(baseW * 0.3).toFixed(1)}`];

            // 活動人格相性
            const { bonus: actBonus, summary: actSummary } = calculatePersonalityAffinityBonus(eff, act.personalityAffinity);
            if (actBonus !== 0) {
                w += actBonus;
                parts.push(`活動人格相性：${actSummary}`);
            }

            // 延續目前活動加分
            if (char.currentActivityId === act.id) {
                const contBonus = 3;
                w += contBonus;
                parts.push(`延續活動 +${contBonus.toFixed(1)}`);
            }

            // 隨機選一個話題（使用人格相性）
            const topicId = weightedPickTopic(act.topicIds ?? [], world.topics, eff);

            // 話題人格相性摘要
            const topicAffinitySummary = buildTopicAffinitySummary(topicId, world.topics, eff);
            if (topicAffinitySummary) parts.push(topicAffinitySummary);

            w = Math.max(w, MIN_WEIGHT);
            candidates.push({
                type: 'activity',
                weight: w,
                characterId: char.id,
                locationId: currentLocation.id,
                activityId: act.id,
                topicId,
                description: `進行${act.name}`,
                weightSummary: parts.join('、'),
            });
        }

        // --- 物件互動 ---
        const locationObjectIds = currentLocation.objectIds ?? [];
        for (const objId of locationObjectIds) {
            const obj = world.objects.find((o) => o.id === objId);
            if (!obj) continue;

            // Each object may have actions
            const objActionIds = obj.actionIds ?? [];
            for (const actionId of objActionIds) {
                const action = world.actions.find((a) => a.id === actionId);
                if (!action) continue;

                let w = 10; // 物件行動基礎
                const parts: string[] = [`基礎 10`];

                // 物件人格相性
                const { bonus: objBonus, summary: objSummary } = calculatePersonalityAffinityBonus(eff, obj.personalityAffinity);
                if (objBonus !== 0) {
                    w += objBonus;
                    parts.push(`物件人格相性：${objSummary}`);
                }

                // 隨機選話題（使用人格相性）
                const topicId = weightedPickTopic(action.topicIds ?? [], world.topics, eff);

                // 話題人格相性摘要
                const topicAffinitySummary = buildTopicAffinitySummary(topicId, world.topics, eff);
                if (topicAffinitySummary) parts.push(topicAffinitySummary);

                w = Math.max(w, MIN_WEIGHT);
                candidates.push({
                    type: 'use_object',
                    weight: w,
                    characterId: char.id,
                    locationId: currentLocation.id,
                    objectId: obj.id,
                    actionId: action.id,
                    topicId,
                    description: `使用${obj.name}（${action.name}）`,
                    weightSummary: parts.join('、'),
                });
            }
        }

        // --- 交談 ---
        const colocated = world.characters.filter(
            (c) => c.id !== char.id && c.locationId === char.locationId,
        );

        // Gather all available topics: from location activities + all topics
        const locationTopicIds = new Set<string>();
        for (const actId of locationActivityIds) {
            const act = world.activities.find((a) => a.id === actId);
            if (act) {
                for (const tid of act.topicIds ?? []) locationTopicIds.add(tid);
            }
        }
        // Also include all topics as potential talk subjects
        for (const t of world.topics) locationTopicIds.add(t.id);

        for (const other of colocated) {
            // Pick a random topic for this conversation（使用人格相性）
            const topicId = weightedPickTopic([...locationTopicIds], world.topics, eff);

            let w = 12; // 基礎交談權重
            const parts: string[] = [`基礎 12`];

            // 關係加成
            const relScore = char.relationshipScores?.[other.id] ?? 0;
            if (relScore !== 0) {
                const relBonus = relScore * 0.05;
                w += relBonus;
                if (relBonus !== 0) parts.push(`關係 ${relBonus > 0 ? '+' : ''}${relBonus.toFixed(1)}`);
            }

            // 話題人格相性摘要
            const topicAffinitySummary = buildTopicAffinitySummary(topicId, world.topics, eff);
            if (topicAffinitySummary) parts.push(topicAffinitySummary);

            w = Math.max(w, MIN_WEIGHT);
            candidates.push({
                type: 'talk',
                weight: w,
                characterId: char.id,
                targetCharacterId: other.id,
                locationId: currentLocation.id,
                topicId,
                description: `與${other.name}交談`,
                weightSummary: parts.join('、'),
            });
        }

        // --- 共同活動 ---
        for (const other of colocated) {
            for (const actId of locationActivityIds) {
                const act = world.activities.find((a) => a.id === actId);
                if (!act) continue;

                const baseW = act.baseWeight ?? 50;
                let w = baseW * 0.2; // 共同活動基礎
                const parts: string[] = [`活動基礎權重 ${(baseW * 0.2).toFixed(1)}`];

                // 活動人格相性
                const { bonus: actBonus, summary: actSummary } = calculatePersonalityAffinityBonus(eff, act.personalityAffinity);
                if (actBonus !== 0) {
                    w += actBonus;
                    parts.push(`活動人格相性：${actSummary}`);
                }

                // 關係加成
                const relScore = char.relationshipScores?.[other.id] ?? 0;
                if (relScore !== 0) {
                    const relBonus = relScore * 0.04;
                    w += relBonus;
                    if (relBonus !== 0) parts.push(`關係 ${relBonus > 0 ? '+' : ''}${relBonus.toFixed(1)}`);
                }

                // 隨機選話題（使用人格相性）
                const topicId = weightedPickTopic(act.topicIds ?? [], world.topics, eff);

                // 話題人格相性摘要
                const topicAffinitySummary = buildTopicAffinitySummary(topicId, world.topics, eff);
                if (topicAffinitySummary) parts.push(topicAffinitySummary);

                w = Math.max(w, MIN_WEIGHT);
                candidates.push({
                    type: 'joint_activity',
                    weight: w,
                    characterId: char.id,
                    targetCharacterId: other.id,
                    locationId: currentLocation.id,
                    activityId: act.id,
                    topicId,
                    description: `與${other.name}一起${act.name}`,
                    weightSummary: parts.join('、'),
                });
            }
        }
    }

    // --- 待機 ---
    {
        let w = 8; // 基礎待機權重
        const parts: string[] = [`基礎 8`];

        w = Math.max(w, MIN_WEIGHT);
        candidates.push({
            type: 'idle',
            weight: w,
            characterId: char.id,
            locationId: currentLocation?.id,
            description: '待機',
            weightSummary: parts.join('、'),
        });
    }

    return candidates;
}

/* -------------------------------------------------- */

/**
 * Select one action from candidates via weighted random.
 */
export function selectAction(candidates: CandidateAction[]): CandidateAction {
    if (candidates.length === 0) {
        // Fallback idle
        return {
            type: 'idle',
            weight: 1,
            characterId: '',
            description: '待機（無候選行動）',
        };
    }

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    let r = Math.random() * totalWeight;
    for (const c of candidates) {
        r -= c.weight;
        if (r <= 0) return c;
    }
    return candidates[candidates.length - 1];
}